'use client';

import { useEffect, useState } from 'react';
import styles from './RightClickProtection.module.scss';

export default function RightClickProtection({ articleType }) {
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // Only disable right-click for Press Release articles
    if (articleType === 'Press release') {
      const handleContextMenu = (e) => {
        e.preventDefault();
        
        // Show toast notification
        setShowToast(true);
        
        // Hide toast after 3 seconds
        setTimeout(() => {
          setShowToast(false);
        }, 3000);
        
        return false;
      };

      // Add event listener to disable right-click
      document.addEventListener('contextmenu', handleContextMenu);

      // Cleanup function to remove event listener
      return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
      };
    }
  }, [articleType]);

  // Render toast notification if needed
  if (showToast) {
    return (
      <div className={styles.toast}>
        Sorry! Right-click is disabled for Press Release articles
      </div>
    );
  }

  return null;
} 