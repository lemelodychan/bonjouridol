"use client";

/**
 * Bonjour Party line-up. Page-only slice: composed directly by the /party page
 * (src/app/party/PartyPage.js) which passes the current `lang` and the static
 * locale dictionary `t`. The same groups also feed the derived timetable.
 *
 * @typedef {import("@prismicio/client").Content.PartyLineupSlice} PartyLineupSlice
 * @param {{ slice: PartyLineupSlice, lang?: 'ja'|'en', t?: Record<string,string> }}
 */
import { PrismicNextImage } from "@prismicio/next";
import { asLink } from "@prismicio/client";
import {
  TbBrandX,
  TbBrandInstagram,
  TbBrandTiktok,
  TbWorld,
  TbCamera,
  TbStarFilled,
} from "react-icons/tb";
import styles from "./page.module.scss";

const TINT_A = ["#FBD9EC", "#E6DEFB", "#D8F3F1"];
const TINT_B = ["#F7C2E0", "#D2C6F7", "#BFEBE8"];

// Social icons render with currentColor, so they inherit the pill's accent.
const SOCIALS = [
  { key: "twitter", Icon: TbBrandX, label: "Twitter" },
  { key: "instagram", Icon: TbBrandInstagram, label: "Instagram" },
  { key: "tiktok", Icon: TbBrandTiktok, label: "TikTok" },
  { key: "website", Icon: TbWorld, label: "Website" },
];

// Brand accent per tint, matching the photo-placeholder colours (0 pink,
// 1 indigo, 2 teal) so an artist's social icons pick up their card's colour.
const ACCENTS = ["var(--pk2)", "var(--iv2)", "var(--teal2)"];

function Socials({ group }) {
  const links = SOCIALS.map((s) => ({ ...s, href: asLink(group[s.key]) })).filter(
    (s) => s.href
  );
  if (!links.length) return null;
  return (
    <div
      className={styles.socials}
      style={{
        "--accent": ACCENTS[group.tint % ACCENTS.length],
        "--accent-bg": TINT_A[group.tint % TINT_A.length],
      }}
    >
      {links.map(({ key, Icon, label, href }) => (
        <a
          key={key}
          href={href}
          className={styles.social}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
        >
          <Icon />
        </a>
      ))}
    </div>
  );
}

const PartyLineup = ({ slice, lang = "ja", t = {} }) => {
  const groups = slice?.primary?.groups || [];
  if (!groups.length) return null;

  const nm = (g) =>
    (lang === "ja" ? g.name_ja || g.name_en : g.name_en || g.name_ja) || "";

  const cards = groups.map((g, i) => ({
    ...g,
    rank: String(i + 1).padStart(2, "0"),
    tint: i % 3,
  }));
  const featured = cards.filter((g) => g.is_headliner);
  const grid = cards.filter((g) => !g.is_headliner);

  return (
    <section
      id="lineup"
      className={styles.lineup}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      <div className={styles.head}>
        <div className={styles.kicker}>{t.lineupKicker}</div>
        <h2 className={styles.h2}>{t.lineupTitle}</h2>
      </div>

      {featured.map((g, i) => (
        <div className={styles.featCard} key={`f${i}`}>
          <div
            className={styles.featMedia}
            style={{ "--ta": TINT_A[g.tint], "--tb": TINT_B[g.tint] }}
          >
            {g.image?.url && (
              <PrismicNextImage field={g.image} className={styles.photo} fallbackAlt="" />
            )}
            <div className={styles.rankBig}>{g.rank}</div>
            <span className={styles.headTag}>
              <TbStarFilled size={11} aria-hidden />
              {t.headlinerTag}
            </span>
            {g.photos_ok && (
              <span className={styles.okPill}>
                <TbCamera size={16} style={{ color: "var(--iv)" }} aria-hidden />
                <span className={styles.okTxt}>{t.photoOk}</span>
              </span>
            )}
            {!g.image?.url && <div className={styles.photoLabel}>{t.photoLabel}</div>}
          </div>
          <div className={styles.featBody}>
            <div className={styles.featInfo}>
              <div className={styles.featName}>{nm(g)}</div>
              <Socials group={g} />
            </div>
            <div className={styles.performing}>{t.performingTag}</div>
          </div>
        </div>
      ))}

      {grid.length > 0 && (
        <div className={styles.grid}>
          {grid.map((g, i) => (
            <div className={styles.gridCard} key={`g${i}`}>
              <div
                className={styles.gridMedia}
                style={{ "--ta": TINT_A[g.tint], "--tb": TINT_B[g.tint] }}
              >
                {g.image?.url && (
                  <PrismicNextImage field={g.image} className={styles.photo} fallbackAlt="" />
                )}
                <div className={styles.rankSm}>{g.rank}</div>
                {g.photos_ok && (
                  <span className={styles.okPillSm}>
                    <TbCamera size={15} style={{ color: "var(--iv)" }} aria-hidden />
                  </span>
                )}
                {!g.image?.url && <div className={styles.photoLabelSm}>{t.photoLabel}</div>}
              </div>
              <div className={styles.gridBody}>
                <div className={styles.gridName}>{nm(g)}</div>
                <Socials group={g} />
              </div>
            </div>
          ))}
        </div>
      )}

{/*       <div className={styles.legend}>
        <span className={styles.legendIcon}>
          <TbCamera size={16} style={{ color: "var(--iv)" }} aria-hidden />
        </span>
        <div className={styles.legendTxt}>{t.photoLegend}</div>
      </div> */}
    </section>
  );
};

export default PartyLineup;
