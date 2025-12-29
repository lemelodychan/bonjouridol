'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './ArtistHighlight.module.scss';

export default function SeamlessTicker({ reverse = false, duration = 30 }) {
  const contentRef = useRef(null);
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const content = contentRef.current;
    const container = containerRef.current;
    
    if (!content || !container) return;

    // Calculate the width of one set of content (half the total width since we duplicate)
    const updateAnimation = () => {
      // Force a reflow to ensure accurate measurements
      void content.offsetWidth;
      
      const totalWidth = content.scrollWidth;
      const contentWidth = totalWidth / 2; // Divide by 2 because content is duplicated
      
      // Set CSS custom property for the exact width
      content.style.setProperty('--ticker-width', `${contentWidth}px`);
      
      setIsReady(true);
    };

    // Wait for next frame to ensure layout is complete
    const timeoutId = setTimeout(() => {
      updateAnimation();
    }, 0);

    // Recalculate on resize
    const resizeObserver = new ResizeObserver(() => {
      updateAnimation();
    });
    resizeObserver.observe(content);
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [reverse]);

  const tickerText = 'Artist Highlight・アーティストハイライト・';

  return (
    <div 
      ref={containerRef}
      className={`${styles.ticker} ${reverse ? styles.reverse : ''}`}
    >
      <div 
        ref={contentRef} 
        className={styles.tickerContent}
        style={{ 
          opacity: isReady ? 1 : 0,
          transition: 'opacity 0.2s ease-in'
        }}
      >
        <span className={styles.tickerText}>{tickerText}</span>
        <span className={styles.tickerText}>{tickerText}</span>
        <span className={styles.tickerText}>{tickerText}</span>
        <span className={styles.tickerText}>{tickerText}</span>
        <span className={styles.tickerText}>{tickerText}</span>
        <span className={styles.tickerText}>{tickerText}</span>
      </div>
    </div>
  );
}

