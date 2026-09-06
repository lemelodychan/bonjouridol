"use client";

/**
 * Bonjour Party — client shell. Owns the JA/EN toggle and the design's scroll
 * effects (parallax hero, back-to-top), and composes the page-only slices at
 * their fixed positions. All CMS data arrives as plain serializable props from
 * the server page; all static UI copy comes from locales/{ja,en}.json.
 */
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  TbArrowRight,
  TbArrowUp,
  TbTicket,
  TbCalendarEvent,
  TbMapPin,
  TbGlassFull,
} from "react-icons/tb";
import styles from "./party.module.scss";
import ja from "./locales/ja.json";
import en from "./locales/en.json";
import bgParis from "./assets/bg-paris.jpg";
import discoBall from "./assets/disco-ball.png";
import logo from "./assets/logo.png";
import PartyLineup from "@/slices/PartyLineup";
import PartyRules from "@/slices/PartyRules";
import PartyAbout from "@/slices/PartyAbout";
import PartySocials from "@/slices/PartySocials";
import Timetable from "./Timetable";
import PartyMarquee from "./PartyMarquee";

const DICT = { ja, en };
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

// Localized long date split into the date itself and a weekday tag, so the
// tag can be styled apart, e.g. "October 12, 2026" + "(Mon・Holiday)" /
// "2026年10月12日" + "(月・祝)". The holiday token shows only when is_holiday.
function fmtDate(iso, lang, isHoliday = false) {
  if (!iso) return { date: "", tag: "" };
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (lang === "ja") {
    const tag = `${WEEKDAYS_JA[wd]}${isHoliday ? "・祝" : ""}`;
    return { date: `${y}年${m}月${d}日`, tag: `(${tag})` };
  }
  const tag = `${WEEKDAYS_EN[wd]}${isHoliday ? "" : ""}`;
  return { date: `${MONTHS[m - 1]} ${d}, ${y}`, tag: `(${tag})` };
}
function fmtDot(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y}.${m}.${d}`;
}

export default function PartyPage({
  event = {},
  ticketUrl = "",
  lineupSlice = null,
  rulesSlice = null,
  aboutSlice = null,
  socialsSlice = null,
  timetable = [],
  visibility = {},
  pricing = {},
}) {
  // Per-section visibility from Prismic. Undefined → visible (see page.js).
  const show = {
    lineup: visibility.lineup !== false,
    timetable: visibility.timetable !== false,
    rules: visibility.rules !== false,
    about: visibility.about !== false,
    socials: visibility.socials !== false,
  };
  const [lang, setLang] = useState("ja");
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);
  const bgRef = useRef(null);

  const t = DICT[lang];
  const confirmed = !!event.times_confirmed;
  const venueName =
    lang === "ja"
      ? event.venue_name_ja || event.venue_name_en
      : event.venue_name_en || event.venue_name_ja;
  const venueSub =
    lang === "ja"
      ? event.venue_sub_ja || event.venue_sub_en
      : event.venue_sub_en || event.venue_sub_ja;

  useEffect(() => {
    const hero = heroRef.current;
    let io;
    if (hero && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => setScrolled(!entries[0].isIntersecting),
        { threshold: 0, rootMargin: "-52px 0px 0px 0px" }
      );
      io.observe(hero);
    }
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const bg = bgRef.current;
        if (!bg || !hero) return;
        const top = hero.getBoundingClientRect().top;
        bg.style.transform = `translateY(${top * 0.14}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      if (io) io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const scrollTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  // Smooth-scroll the hero CTA to the tickets section. Keeps the #tickets href
  // as a no-JS / a11y fallback; scroll-margin-top on .section handles the
  // fixed-header offset.
  const scrollToTickets = (e) => {
    const el = document.getElementById("tickets");
    if (!el) return;
    e.preventDefault();
    try {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      el.scrollIntoView();
    }
  };

  const timeValue = confirmed
    ? `${event.open_time || ""} / ${event.start_time || ""}`
    : `${t.tba} / ${t.tba}`;

  // Ticket tiers: prefer CMS content, resolving each field to the active
  // language; fall back to the built-in locale defaults when Prismic is empty.
  const tiers = pricing.tiers?.length
    ? pricing.tiers.map((tt) => ({
        name: lang === "ja" ? tt.name_ja || tt.name_en : tt.name_en || tt.name_ja,
        price: tt.price,
        note: lang === "ja" ? tt.note_ja || tt.note_en : tt.note_en || tt.note_ja,
        hot: tt.hot,
      }))
    : t.tiers || [];
  const drinkNote =
    (lang === "ja" ? pricing.drinkNote_ja : pricing.drinkNote_en) || t.drinkNote;

  return (
    <div className={styles.bleed}>
      <div className={styles.page}>
        {/* Language toggle */}
        <div className={styles.toggle}>
          <div className={`${styles.knob} ${lang === "en" ? styles.knobEn : ""}`} />
          <button
            className={lang === "ja" ? styles.active : ""}
            onClick={() => setLang("ja")}
            type="button"
          >
            JA
          </button>
          <button
            className={lang === "en" ? styles.active : ""}
            onClick={() => setLang("en")}
            type="button"
          >
            EN
          </button>
        </div>

        {/* Hero */}
        <section ref={heroRef} className={styles.hero}>
          {/* Decorative backdrop — clipped in isolation so the CTA's glow
              shadow (below) is never cut off at the hero's bottom edge. */}
          <div className={styles.heroBgLayer}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={bgRef} src={bgParis.src} alt="" aria-hidden="true" className={styles.heroBg} />
            <div className={styles.heroFade} />
            <Image src={discoBall} alt="" aria-hidden="true" className={styles.disco} sizes="520px" />
            <div className={styles.heroGlow} />
            <span className={`${styles.spark} ${styles.spark1}`} />
            <span className={`${styles.spark} ${styles.spark2}`} />
            <span className={styles.dot1} />
            <span className={styles.dot2} />
          </div>
          <Image src={logo} alt="Bonjour Party" className={styles.logo} priority sizes="480px" />
          <p className={styles.heroTag}>{t.heroTag}</p>
          <div className={styles.heroCtas}>
            <div className={styles.badges}>
              <div className={`${styles.badge} ${styles.badgePink}`}>
                <TbCalendarEvent size={16} aria-hidden />
                {(() => {
                    const { date, tag } = fmtDate(event.event_date, lang, event.is_holiday);
                    return (
                      <>
                        {date}
                        &nbsp;{tag}
                      </>
                    );
                  })()}
              </div>
              <div className={`${styles.badge} ${styles.badgeIndigo}`}>
                <TbMapPin size={16} aria-hidden />
                {venueName}
              </div>
            </div>
            <a href="#tickets" className={styles.cta} onClick={scrollToTickets}>
              {t.ctaTickets}
              <TbArrowRight size={18} aria-hidden />
            </a>
          </div>
        </section>

        {/* Marquee */}
        <PartyMarquee text={t.marquee} />

        {/* Event info + tickets */}
        <section id="tickets" className={styles.section}>
          <div className={styles.kicker}>{t.infoKicker}</div>
          <h2 className={styles.h2}>{t.infoTitle}</h2>

          <div className={styles.infoCard}>
            <div className={styles.infoRow}>
              <div className={styles.infoBar} style={{ background: "var(--pk)" }} />
              <div className={styles.infoValueContainer}>
                <div className={styles.infoLabel}>{t.venueLabel}</div>
                <div className={styles.infoValue}>
                  {venueName}
                  {venueSub && <span className={styles.infoSub}> {venueSub}</span>}
                </div>
              </div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoBar} style={{ background: "var(--iv)" }} />
              <div className={styles.infoValueContainer}>
                <div className={styles.infoLabel}>{t.dateLabel}</div>
                <div className={styles.infoValue}>
                  {(() => {
                    const { date, tag } = fmtDate(event.event_date, lang, event.is_holiday);
                    return (
                      <>
                        {date}
                        {tag && <span className={styles.dateTag}>{tag}</span>}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoBar} style={{ background: "var(--teal)" }} />
              <div className={styles.infoValueContainer}>
                <div className={styles.infoLabel}>{t.timeLabel}</div>
                <div className={styles.infoValue}>{timeValue}</div>
              </div>
            </div>
          </div>

          <div className={styles.priceKicker}>{t.priceKicker}</div>
          <div className={styles.tiers}>
            {tiers.map((tier, i) => (
              <div
                className={`${styles.tier} ${tier.hot ? styles.tierHot : styles.tierPlain}`}
                key={i}
              >
                <div className={`${styles.tierName} ${tier.hot ? styles.hot : styles.plain}`}>
                  {tier.name}
                </div>
                <div className={styles.tierPrice}>{tier.price}</div>
                {tier.note && <div className={styles.tierNote}>{tier.note}</div>}
              </div>
            ))}
          </div>
          {drinkNote && (
            <div className={styles.drinkNote}>
              <div className={styles.icon}>
                <TbGlassFull size={16} aria-hidden />
              </div>
              <div className={styles.txt}>{drinkNote}</div>
            </div>
          )}
          {ticketUrl && (
            <a
              className={styles.buyBtn}
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <TbTicket size={20} aria-hidden />
              {t.ctaBuy}
              <span className={styles.fabBadge}>{t.onSaleBadge}</span>
            </a>
          )}
        </section>

        {/* CMS-driven sections (page-only slices). Each is gated by a Prismic
            visibility toggle so unconfirmed sections can be hidden without
            editing slice content. */}
        {show.lineup && <PartyLineup slice={lineupSlice} lang={lang} t={t} />}
        {show.timetable && (
          <Timetable rows={timetable} lang={lang} t={t} confirmed={confirmed} />
        )}
        {show.rules && <PartyRules slice={rulesSlice} lang={lang} t={t} />}
        {show.about && <PartyAbout slice={aboutSlice} lang={lang} t={t} />}

        <footer className={styles.footer}>
          {show.socials && <PartySocials slice={socialsSlice} t={t} />}
          {t.footerNote && <div className={styles.footerNote}>{t.footerNote}</div>}
        </footer>

        {ticketUrl && (
          <div className={`${styles.ticketFab} ${scrolled ? styles.show : ""}`}>
            {t.onSaleBadge && (
              <span className={styles.fabBadge}>{t.onSaleBadge}</span>
            )}
            <a
              className={styles.ticketFabLink}
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <TbTicket size={20} aria-hidden />
              <span>{t.ctaBuy}</span>
            </a>
          </div>
        )}

        <button
          className={`${styles.backTop} ${scrolled ? styles.show : ""}`}
          onClick={scrollTop}
          aria-label="Back to top"
          type="button"
        >
          <TbArrowUp size={22} strokeWidth={2.6} aria-hidden />
        </button>
      </div>
    </div>
  );
}
