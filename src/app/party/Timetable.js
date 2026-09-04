"use client";

// Derived timetable — rows are built server-side (in page.js) from the single
// party_lineup groups list, so there is no double data-entry. This component
// only renders and language-switches them.
import { TbCamera } from "react-icons/tb";
import styles from "./party.module.scss";

export default function Timetable({ rows = [], lang = "ja", t = {}, confirmed = true }) {
  if (!rows.length) return null;
  const nm = (r) => (lang === "ja" ? r.name_ja || r.name_en : r.name_en || r.name_ja) || "";

  return (
    <section id="timetable" className={`${styles.section} ${styles.tt}`}>
      <div className={styles.ttHead}>
        <div className={styles.kicker}>{t.ttKicker}</div>
        <h2 className={styles.h2}>{t.ttTitle}</h2>
        {t.ttSub && <p className={styles.ttSub}>{t.ttSub}</p>}
      </div>

      {!confirmed && <div className={styles.ttTentative}>{t.ttTentative}</div>}

      <div className={styles.ttList}>
        {rows.map((r, i) => (
          <div className={styles.ttRow} key={i}>
            <div className={styles.ttTime}>{r.time}</div>
            <div className={styles.ttRail}>
              <div className={styles.ttLine} />
              <div className={styles.ttNode} />
            </div>
            <div className={`${styles.ttCard} ${r.isHeadliner ? styles.head : ""}`}>
              <div className={styles.ttCardTop}>
                <div className={styles.ttName}>{nm(r)}</div>
                {r.photosOk && (
                  <span className={styles.camPill}>
                    <TbCamera size={14} style={{ color: "var(--iv)" }} aria-hidden />
                  </span>
                )}
              </div>
              {(r.liveRange || r.mng) && (
                <div className={styles.ttMeta}>
                  {r.liveRange && (
                    <span className={styles.ttLive}>
                      {t.liveLabel} {r.liveRange}
                    </span>
                  )}
                  {r.mng && (
                    <span className={styles.ttMng}>
                      {t.mngLabel} {r.mng}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
