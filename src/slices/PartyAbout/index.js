"use client";

/**
 * Bonjour Party about section. Page-only slice composed by /party's PartyPage.
 * Body is bilingual Rich Text (paragraphs + bold/italic); paragraphs are mapped
 * to the party `.p` style so the design is unchanged.
 * @typedef {import("@prismicio/client").Content.PartyAboutSlice} PartyAboutSlice
 * @param {{ slice: PartyAboutSlice, lang?: 'ja'|'en', t?: Record<string,string> }}
 */
import { PrismicRichText } from "@prismicio/react";
import styles from "./page.module.scss";

// A Rich Text field is "filled" when at least one block carries text.
const hasText = (field) =>
  Array.isArray(field) && field.some((b) => (b.text || "").trim().length > 0);

const PartyAbout = ({ slice, lang = "ja", t = {} }) => {
  const en = slice?.primary?.body_en;
  const ja = slice?.primary?.body_ja;
  // Prefer the active language, fall back to the other if it's empty.
  const field =
    lang === "ja" ? (hasText(ja) ? ja : en) : hasText(en) ? en : ja;
  if (!hasText(field)) return null;

  return (
    <section
      id="about"
      className={styles.about}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      <div className={styles.kicker}>{t.aboutKicker}</div>
      <h2 className={styles.h2}>{t.aboutTitle}</h2>
      <div className={styles.body}>
        <PrismicRichText
          field={field}
          components={{
            paragraph: ({ children }) => <p className={styles.p}>{children}</p>,
          }}
        />
      </div>
    </section>
  );
};

export default PartyAbout;
