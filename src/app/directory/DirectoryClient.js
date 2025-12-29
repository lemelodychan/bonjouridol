'use client';

import { useEffect, useState } from 'react';
import ArtistProfile from "../components/ArtistProfile";
import DirectoryToolbar, { useViewMode } from "../components/DirectoryToolbar";
import styles from "./page.module.scss";

export default function DirectoryClient({ 
  artistsByLetter, 
  availableLetters, 
  hasSpecialChars, 
  likeCounts,
  totalArtists 
}) {
  const [viewMode, changeViewMode] = useViewMode();
  const [isHydrated, setIsHydrated] = useState(false);

  // Mark as hydrated after initial render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Update the injected CSS when view mode changes (for content visibility and button styling)
  useEffect(() => {
    const styleEl = document.getElementById('directory-view-mode-styles');
    if (styleEl) {
      if (viewMode === 'row') {
        styleEl.textContent = '[data-view="card"] { display: none !important; } [data-view-button="row"] { background-color: var(--bi-dark-pink) !important; color: white !important; } [data-view-button="card"] { background-color: transparent !important; color: var(--bi-dark-pink) !important; }';
      } else {
        styleEl.textContent = '[data-view="row"] { display: none !important; } [data-view-button="card"] { background-color: var(--bi-dark-pink) !important; color: white !important; } [data-view-button="row"] { background-color: transparent !important; color: var(--bi-dark-pink) !important; }';
      }
    }
  }, [viewMode]);

  return (
    <div className={styles.DirectoryContainer}>
      <DirectoryToolbar 
        totalArtists={totalArtists} 
        viewMode={viewMode}
        onViewModeChange={changeViewMode}
      />
      <div className={styles.DirectoryContent}>
        <div className={styles.ArtistsGrid}>
          {availableLetters.map((letter) => (
            <div key={letter} id={`letter-${letter}`} className={styles.LetterSection}>
              <h2 className={styles.LetterHeader}>{letter}</h2>
              {/* After hydration, only render the active view. Before hydration, render both */}
              {!isHydrated ? (
                <>
                  {/* Card view */}
                  <div 
                    className={`${styles.ArtistsGroup}`}
                    data-view="card"
                    suppressHydrationWarning
                  >
                    {artistsByLetter[letter].map((artist) => (
                      <ArtistProfile
                        key={artist.id}
                        artist={artist}
                        noConstraints
                        hideDescription
                        likeCounts={likeCounts}
                        viewMode="card"
                      />
                    ))}
                  </div>
                  {/* Row view */}
                  <div 
                    className={`${styles.ArtistsGroup} ${styles.rowView}`}
                    data-view="row"
                    suppressHydrationWarning
                  >
                    {artistsByLetter[letter].map((artist) => (
                      <ArtistProfile
                        key={artist.id}
                        artist={artist}
                        noConstraints
                        hideDescription
                        likeCounts={likeCounts}
                        viewMode="row"
                      />
                    ))}
                  </div>
                </>
              ) : (
                /* After hydration, only render the active view */
                <div 
                  className={`${styles.ArtistsGroup} ${viewMode === 'row' ? styles.rowView : ''}`}
                >
                  {artistsByLetter[letter].map((artist) => (
                    <ArtistProfile
                      key={artist.id}
                      artist={artist}
                      noConstraints
                      hideDescription
                      likeCounts={likeCounts}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          {/* Handle artists starting with non-alphabetic characters */}
          {artistsByLetter['#'] && artistsByLetter['#'].length > 0 && (
            <div key="#" id="letter-#" className={styles.LetterSection}>
              <h2 className={styles.LetterHeader}>#</h2>
              {!isHydrated ? (
                <>
                  {/* Card view */}
                  <div 
                    className={`${styles.ArtistsGroup}`}
                    data-view="card"
                    suppressHydrationWarning
                  >
                    {artistsByLetter['#'].map((artist) => (
                      <ArtistProfile
                        key={artist.id}
                        artist={artist}
                        noConstraints
                        hideDescription
                        likeCounts={likeCounts}
                        viewMode="card"
                      />
                    ))}
                  </div>
                  {/* Row view */}
                  <div 
                    className={`${styles.ArtistsGroup} ${styles.rowView}`}
                    data-view="row"
                    suppressHydrationWarning
                  >
                    {artistsByLetter['#'].map((artist) => (
                      <ArtistProfile
                        key={artist.id}
                        artist={artist}
                        noConstraints
                        hideDescription
                        likeCounts={likeCounts}
                        viewMode="row"
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div 
                  className={`${styles.ArtistsGroup} ${viewMode === 'row' ? styles.rowView : ''}`}
                >
                  {artistsByLetter['#'].map((artist) => (
                    <ArtistProfile
                      key={artist.id}
                      artist={artist}
                      noConstraints
                      hideDescription
                      likeCounts={likeCounts}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

