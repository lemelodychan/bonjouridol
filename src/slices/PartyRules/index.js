"use client";

/**
 * Bonjour Party rules & manners. Page-only slice composed by /party's PartyPage.
 * @typedef {import("@prismicio/client").Content.PartyRulesSlice} PartyRulesSlice
 * @param {{ slice: PartyRulesSlice, lang?: 'ja'|'en', t?: Record<string,string> }}
 */
import styles from "./page.module.scss";

const PartyRules = ({ slice, lang = "ja", t = {} }) => {
  const rules = slice?.primary?.rules || [];
  if (!rules.length) return null;
  const pick = (en, ja) => (lang === "ja" ? ja || en : en || ja) || "";

  return (
    <section
      id="rules"
      className={styles.rules}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      <div className={styles.kicker}>{t.rulesKicker}</div>
      <h2 className={styles.h2}>{t.rulesTitle}</h2>
      <div className={styles.list}>
        {rules.map((r, i) => (
          <div className={styles.item} key={i}>
            <div className={styles.num}>{i + 1}</div>
            <div className={styles.body}>
              <div className={styles.title}>{pick(r.title_en, r.title_ja)}</div>
              <div className={styles.text}>{pick(r.text_en, r.text_ja)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PartyRules;
