"use client";

/**
 * Bonjour Party marquee — same seamless-loop logic as the main site's
 * ArtistHighlight ticker (SeamlessTicker): the repeat unit is duplicated across
 * several spans, JS measures one unit's exact width into --ticker-width, and the
 * strip translates by precisely that distance so the loop is truly seamless at
 * any content/viewport width. Only the fonts/colours are party-specific.
 */
import { useEffect, useRef, useState } from "react";
import styles from "./party.module.scss";

export default function PartyMarquee({ text, reverse = false, duration = 20 }) {
  const contentRef = useRef(null);
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const content = contentRef.current;
    const container = containerRef.current;
    if (!content || !container) return;

    const updateAnimation = () => {
      // Force a reflow so scrollWidth is accurate before we measure.
      void content.offsetWidth;
      const contentWidth = content.scrollWidth / 2; // content is duplicated
      content.style.setProperty("--ticker-width", `${contentWidth}px`);
      setIsReady(true);
    };

    const timeoutId = setTimeout(updateAnimation, 0);

    const resizeObserver = new ResizeObserver(updateAnimation);
    resizeObserver.observe(content);
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [reverse, text]);

  return (
    <div
      ref={containerRef}
      className={`${styles.marquee} ${reverse ? styles.marqueeReverse : ""}`}
    >
      <div
        ref={contentRef}
        className={styles.marqueeInner}
        style={{
          animationDuration: `${duration}s`,
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.2s ease-in",
        }}
      >
        <span className={styles.marqueeText}>{text}</span>
        <span className={styles.marqueeText}>{text}</span>
        <span className={styles.marqueeText}>{text}</span>
        <span className={styles.marqueeText}>{text}</span>
        <span className={styles.marqueeText}>{text}</span>
        <span className={styles.marqueeText}>{text}</span>
      </div>
    </div>
  );
}
