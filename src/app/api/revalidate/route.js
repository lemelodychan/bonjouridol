import { NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient, linkResolver } from "@/prismicio";

// Listing/index tag to refresh when a document of a given type is published.
// These tags are carried by the listing fetches (homepage widgets, search,
// directory, category pages) — NOT by individual detail pages, which now use
// per-UID tags (`article:<uid>` / `gallery:<uid>`). So purging a listing tag
// refreshes the indexes without regenerating every detail page.
const LISTING_TAG = {
  articles: "articles",
  gallery: "galleries",
  page: "pages",
  author: "authors",
  photographer: "artists",
};

// Per-document detail tag for types that have an ISR-cached detail page.
// `page` ([uid]) is force-dynamic (SSR, no ISR cache) so it has no detail tag.
const DETAIL_TAG = {
  articles: (uid) => `article:${uid}`,
  gallery: (uid) => `gallery:${uid}`,
};

// Bounded fallback for unpublish/error: refresh the indexes only. Far narrower
// than the old global `revalidateTag("prismic")` since detail pages no longer
// carry these shared tags.
const ALL_LISTING_TAGS = ["articles", "galleries", "pages", "authors", "artists"];

function revalidateListings(reason) {
  for (const tag of ALL_LISTING_TAGS) revalidateTag(tag);
  return NextResponse.json({
    revalidated: true,
    tags: ALL_LISTING_TAGS,
    reason,
    now: Date.now(),
  });
}

export async function POST(request) {
  // Read body once; we may need it for either auth path.
  let body = null;
  try {
    body = await request.clone().json();
  } catch {
    // Non-JSON body is fine for the admin-token path.
  }

  // --- Prismic webhook path ---
  // Prismic posts { type, secret, documents: [...ids], ... } on publish/unpublish.
  const webhookSecret = process.env.PRISMIC_WEBHOOK_SECRET;
  if (body && webhookSecret && body.secret === webhookSecret) {
    const docIds = Array.isArray(body.documents) ? body.documents : [];

    // Test ping / no-op events from Prismic — no documents. Do NOT purge:
    // this used to nuke the whole site on every health ping.
    if (docIds.length === 0) {
      return NextResponse.json({
        revalidated: false,
        reason: "ping",
        now: Date.now(),
      });
    }

    try {
      const client = createClient();
      // Resolve the published docs to {type, uid}. Unpublished docs won't come
      // back from the Content API; we fall through to a listing-only refresh.
      const docs = await client.getByIDs(docIds, {
        fetch: ["document.type", "document.uid"],
      });

      const results = docs.results || [];
      if (results.length === 0) {
        return revalidateListings("prismic-webhook-unresolved");
      }

      const listingTags = new Set();
      const paths = new Set();
      let refreshHome = false; // home page's "latest" sections (article published)
      let globalPurge = false; // homepage singleton edited → global SEO metadata

      for (const doc of results) {
        // The homepage singleton feeds site-wide fallback metadata in the root
        // layout (every page). Editing it is rare; purge globally for correctness.
        if (doc.type === "homepage") {
          globalPurge = true;
          continue;
        }

        const detail = DETAIL_TAG[doc.type];
        if (detail && doc.uid) {
          // Refresh just this document's detail page (data cache + route).
          revalidateTag(detail(doc.uid));
          paths.add(linkResolver(doc));
        }

        const listing = LISTING_TAG[doc.type];
        if (listing) listingTags.add(listing);

        // The homepage shows the latest articles.
        if (doc.type === "articles") refreshHome = true;
      }

      if (globalPurge) {
        revalidateTag("prismic");
        return NextResponse.json({
          revalidated: true,
          reason: "homepage-document-edit",
          tags: ["prismic"],
          now: Date.now(),
        });
      }

      for (const tag of listingTags) revalidateTag(tag);
      for (const path of paths) revalidatePath(path);
      if (refreshHome) revalidatePath("/");

      return NextResponse.json({
        revalidated: true,
        listingTags: [...listingTags],
        paths: [...paths],
        home: refreshHome,
        docs: docIds.length,
        resolved: results.length,
        now: Date.now(),
      });
    } catch (err) {
      // Never silently drop a publish — fall back to a listing-only refresh.
      console.error("[revalidate] Prismic webhook handler failed:", err);
      return revalidateListings("prismic-webhook-error");
    }
  }

  // --- Admin / cron-secret path ---
  // Deliberate "nuke everything" escape hatch for manual/scheduled full purges.
  const auth = await requireAdmin(request, { allowCron: true });
  if (!auth.ok) return auth.response;

  revalidateTag("prismic");
  return NextResponse.json({ revalidated: true, tags: ["prismic"], now: Date.now() });
}
