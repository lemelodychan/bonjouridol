'use client';

import { useState, useEffect } from 'react';
import { HiOutlineViewList, HiOutlineViewGrid } from 'react-icons/hi';
import styles from './DirectoryToolbar.module.scss';

const VIEW_MODE_KEY = 'directory-view-mode';

export default function DirectoryToolbar({ totalArtists, viewMode, onViewModeChange }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.artistCount}>
        <span>{totalArtists} {totalArtists === 1 ? 'artist' : 'artists'} found</span>
      </div>
      <div className={styles.viewToggle}>
        <button
          className={styles.toggleButton}
          onClick={() => onViewModeChange('card')}
          aria-label="Card view"
          data-view-button="card"
          suppressHydrationWarning
        >
          <HiOutlineViewGrid />
        </button>
        <button
          className={styles.toggleButton}
          onClick={() => onViewModeChange('row')}
          aria-label="Row view"
          data-view-button="row"
          suppressHydrationWarning
        >
          <HiOutlineViewList />
        </button>
      </div>
    </div>
  );
}

// Helper function to get view mode from localStorage synchronously
function getInitialViewMode() {
  if (typeof window === 'undefined') {
    return 'card'; // Default for SSR
  }
  try {
    // First check if the script already set it globally
    if (window.__DIRECTORY_VIEW_MODE__) {
      return window.__DIRECTORY_VIEW_MODE__;
    }
    // Otherwise read from localStorage directly
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved === 'card' || saved === 'row') {
      return saved;
    }
  } catch (e) {
    // localStorage might not be available
  }
  return 'card'; // Default
}

// Hook to manage view mode with localStorage
export function useViewMode() {
  // Read from localStorage synchronously during initialization to avoid layout shift
  const [viewMode, setViewMode] = useState(() => getInitialViewMode());

  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  return [viewMode, changeViewMode];
}

