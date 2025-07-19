'use client';

import { useState, useEffect } from 'react';
import styles from './ConsentBanner.module.scss';

export default function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('analytics-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleConsent = (granted) => {
    // Dispatch custom event for GoogleTagManager to listen to
    window.dispatchEvent(new CustomEvent('analytics-consent', {
      detail: { consent: granted ? 'granted' : 'denied' }
    }));

    // Store user choice
    localStorage.setItem('analytics-consent', granted ? 'granted' : 'denied');
    
    // Hide banner
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className={styles.consentBanner}>
      <div className={styles.container}>
        <div className={styles.text}>
          <p>
            We use cookies to analyze traffic and improve your experience. 
            By continuing to browse, you accept our use of cookies.
          </p>
        </div>
        <div className={styles.buttons}>
          <button
            onClick={() => handleConsent(false)}
            className={`${styles.button} ${styles.decline}`}
          >
            Decline
          </button>
          <button
            onClick={() => handleConsent(true)}
            className={`${styles.button} ${styles.accept}`}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
} 