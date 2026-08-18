import { createClient } from "@/prismicio";
import { notFound } from "next/navigation";
import { NotFoundError } from "@prismicio/client";
import PartyPage from "./PartyPage";
import { PARTY_INDEXABLE, PARTY_URL } from "./config";

// After bundling, the NotFoundError imported here can be a different class
// identity than the one thrown inside the bundled client chunk, so `instanceof`
// alone is unreliable at build-time prerender — match by name/message too.
function isNotFound(error) {
  return (
    error instanceof NotFoundError ||
    error?.name === "NotFoundError" ||
    /not found/i.test(error?.message || "")
  );
}

// Singleton "Bonjour Party" landing page. Rendered on-demand then cached
// indefinitely (revalidate = false); freshness comes solely from the Prismic
// webhook, which regenerates this page via revalidateTag("bonjour_party") +
// revalidatePath("/party") on publish. Same ISR pattern as articles/[uid].
export const revalidate = false;

const FONTS =
  "https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700;800&family=Baloo+2:wght@600;700;800&display=swap";

const FETCH = { fetchOptions: { next: { tags: ["prismic", "bonjour_party"], revalidate: false } } };

const CANONICAL = PARTY_URL;

const ROBOTS = PARTY_INDEXABLE
  ? { index: true, follow: true, googleBot: { index: true, follow: true } }
  : { index: false, follow: false, googleBot: { index: false, follow: false } };

// Parse "HH:MM" start times, supporting Japanese late-night hours ≥ 24 (e.g. "25:50").
function parseMin(s) {
  if (!s) return null;
  const m = String(s).match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// Build a JST ISO datetime for schema.org. Falls back to date-only when the
// time is missing or a late-night hour ≥ 24 (invalid in ISO — those only occur
// on individual set times, never the event start).
function toIsoStart(date, time) {
  if (!date) return undefined;
  const m = String(time || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m || Number(m[1]) >= 24) return date;
  return `${date}T${m[1].padStart(2, "0")}:${m[2]}:00+09:00`;
}

export async function generateMetadata() {
  const client = createClient();
  try {
    const doc = await client.getSingle("bonjour_party", FETCH);
    const title = doc.data.meta_title || "Bonjour Party | BONJOUR IDOL";
    const description =
      doc.data.meta_description ||
      "BONJOUR IDOL presents Bonjour Party — a live idol event in Tokyo.";
    const imageUrl = doc.data.meta_image?.url || "/FeaturedImage.png";
    return {
      title,
      description,
      // Soft launch: gated by PARTY_INDEXABLE (see top of file).
      robots: ROBOTS,
      alternates: { canonical: CANONICAL },
      openGraph: {
        type: "website",
        siteName: "BONJOUR IDOL",
        locale: "ja_JP",
        alternateLocale: ["en_US"],
        title,
        description,
        url: CANONICAL,
        images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      },
      twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
    };
  } catch {
    return {
      title: "Bonjour Party | BONJOUR IDOL",
      description: "BONJOUR IDOL presents Bonjour Party — a live idol event in Tokyo.",
      robots: ROBOTS,
      alternates: { canonical: CANONICAL },
    };
  }
}

export default async function Page() {
  const client = createClient();
  let doc;
  try {
    doc = await client.getSingle("bonjour_party", FETCH);
  } catch (error) {
    if (isNotFound(error)) notFound();
    console.error("Error fetching bonjour_party:", error);
    throw error;
  }

  const slices = doc.data.slices || [];
  const byType = (type) => slices.find((s) => s.slice_type === type) || null;
  const lineupSlice = byType("party_lineup");

  // Timetable is derived from the single lineup groups list — no double entry.
  const groups = lineupSlice?.primary?.groups || [];
  const timetable = groups
    .map((g) => ({
      name_en: g.name_en || "",
      name_ja: g.name_ja || "",
      photosOk: !!g.photos_ok,
      isHeadliner: !!g.is_headliner,
      time: g.live_start || "",
      liveRange:
        g.live_start && g.live_end ? `${g.live_start}–${g.live_end}` : g.live_start || "",
      mng: g.mng_start && g.mng_end ? `${g.mng_start}–${g.mng_end}` : g.mng_start || "",
      _sort: parseMin(g.live_start),
    }))
    .filter((r) => r._sort !== null)
    .sort((a, b) => a._sort - b._sort)
    .map(({ _sort, ...r }) => r);

  const event = {
    venue_name_en: doc.data.venue_name_en,
    venue_name_ja: doc.data.venue_name_ja,
    venue_sub_en: doc.data.venue_sub_en,
    venue_sub_ja: doc.data.venue_sub_ja,
    event_date: doc.data.event_date,
    is_holiday: doc.data.is_holiday,
    open_time: doc.data.open_time,
    start_time: doc.data.start_time,
    times_confirmed: doc.data.times_confirmed,
  };

  // External ticket-platform link (resolved to a plain URL string for the
  // serializable client props). Empty until an editor sets it in Prismic —
  // every ticket CTA is gated on this, so pre-sale the page shows none.
  const ticketUrl = doc.data.ticket_url?.url || "";

  // schema.org MusicEvent — powers rich results once the page is indexable.
  // Emitted now (harmless while noindex) so it's live and verifiable on launch.
  const performers = groups
    .map((g) => g.name_en || g.name_ja)
    .filter(Boolean)
    .map((name) => ({ "@type": "MusicGroup", name }));

  const startDate = event.times_confirmed
    ? toIsoStart(event.event_date, event.start_time)
    : event.event_date || undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: doc.data.meta_title || "Bonjour Party",
    description:
      doc.data.meta_description ||
      "BONJOUR IDOL presents Bonjour Party — a live idol event in Tokyo.",
    url: CANONICAL,
    ...(startDate && { startDate }),
    ...(event.times_confirmed &&
      event.event_date &&
      event.open_time && {
        doorTime: toIsoStart(event.event_date, event.open_time),
      }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(doc.data.meta_image?.url && { image: [doc.data.meta_image.url] }),
    location: {
      "@type": "Place",
      name: event.venue_name_en || event.venue_name_ja || "TBA",
      address: {
        "@type": "PostalAddress",
        ...((event.venue_sub_en || event.venue_sub_ja) && {
          streetAddress: event.venue_sub_en || event.venue_sub_ja,
        }),
        addressLocality: "Tokyo",
        addressCountry: "JP",
      },
    },
    ...(performers.length && { performer: performers }),
    ...(ticketUrl && {
      offers: {
        "@type": "Offer",
        url: ticketUrl,
        priceCurrency: "JPY",
        availability: "https://schema.org/InStock",
        ...(startDate && { validFrom: startDate }),
      },
    }),
    organizer: {
      "@type": "Organization",
      name: "BONJOUR IDOL",
      url: "https://www.bonjouridol.com",
    },
  };

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href={FONTS} rel="stylesheet" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PartyPage
        event={event}
        ticketUrl={ticketUrl}
        lineupSlice={lineupSlice}
        rulesSlice={byType("party_rules")}
        aboutSlice={byType("party_about")}
        socialsSlice={byType("party_socials")}
        timetable={timetable}
      />
    </>
  );
}
