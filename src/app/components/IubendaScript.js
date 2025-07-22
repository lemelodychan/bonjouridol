'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

export default function IubendaScript() {
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    // Check for existing consent
    const hasConsent = localStorage.getItem('analytics-consent') === 'granted';
    setConsentGranted(hasConsent);

    // Listen for consent changes
    const handleConsentChange = (event) => {
      if (event.detail.consent === 'granted') {
        setConsentGranted(true);
        localStorage.setItem('analytics-consent', 'granted');
        // Initialize iubenda after consent
        initializeIubenda();
      } else if (event.detail.consent === 'denied') {
        setConsentGranted(false);
        localStorage.setItem('analytics-consent', 'denied');
        // Clear any existing iubenda data
        clearIubenda();
      }
    };

    // Listen for custom consent events
    window.addEventListener('analytics-consent', handleConsentChange);

    // If consent was previously granted, initialize iubenda
    if (hasConsent) {
      initializeIubenda();
    }

    return () => {
      window.removeEventListener('analytics-consent', handleConsentChange);
    };
  }, []);

  const initializeIubenda = () => {
    // Initialize iubenda configuration
    if (typeof window !== 'undefined') {
      window._iub = window._iub || [];
      window._iub.csConfiguration = {
        "siteId": 3888654,
        "cookiePolicyId": 26602420,
        "lang": "en",
        "storage": {
          "useSiteId": true
        }
      };
    }
  };

  const clearIubenda = () => {
    // Clear iubenda cookies and data
    if (typeof window !== 'undefined') {
      // Clear iubenda related cookies
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.startsWith('iub_') || name.startsWith('_iub_')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    }
  };

  // Only render scripts if consent is granted
  if (!consentGranted) {
    return null;
  }

  return (
    <>
      <Script id="iubenda-config" strategy="beforeInteractive">
        {`
          var _iub = _iub || [];
          _iub.csConfiguration = {"siteId":3888654,"cookiePolicyId":26602420,"lang":"en","storage":{"useSiteId":true}};
        `}
      </Script>
      <Script
        src="https://cs.iubenda.com/autoblocking/3888654.js"
        strategy="afterInteractive"
      />
      <Script
        src="//cdn.iubenda.com/cs/gpp/stub.js"
        strategy="afterInteractive"
      />
      <Script
        src="//cdn.iubenda.com/cs/iubenda_cs.js"
        strategy="afterInteractive"
        charSet="UTF-8"
      />
    </>
  );
} 