'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

export default function GoogleTagManager() {
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    // Check for existing consent
    const hasConsent = localStorage.getItem('analytics-consent') === 'granted';
    setConsentGranted(hasConsent);

    // Listen for consent changes from the custom banner
    const handleConsentChange = (event) => {
      if (event.detail.consent === 'granted') {
        setConsentGranted(true);
        localStorage.setItem('analytics-consent', 'granted');
        // Initialize analytics after consent
        initializeAnalytics();
      } else if (event.detail.consent === 'denied') {
        setConsentGranted(false);
        localStorage.setItem('analytics-consent', 'denied');
        // Clear any existing analytics data
        clearAnalytics();
      }
    };

    // Listen for custom consent events
    window.addEventListener('analytics-consent', handleConsentChange);

    // If consent was previously granted, initialize analytics
    if (hasConsent) {
      initializeAnalytics();
    }

    return () => {
      window.removeEventListener('analytics-consent', handleConsentChange);
    };
  }, []);

  const initializeAnalytics = () => {
    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    
    // Configure gtag with consent settings
    if (typeof window.gtag !== 'undefined') {
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted',
        'ad_storage': 'granted'
      });
      
      // Send page view
      window.gtag('event', 'page_view', {
        'page_title': document.title,
        'page_location': window.location.href,
        'page_path': window.location.pathname
      });
    }
  };

  const clearAnalytics = () => {
    // Clear analytics cookies and data
    if (typeof window.gtag !== 'undefined') {
      window.gtag('consent', 'update', {
        'analytics_storage': 'denied',
        'ad_storage': 'denied'
      });
    }
    
    // Clear localStorage analytics data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('_ga') || key.startsWith('_gid') || key.startsWith('_gat')) {
        localStorage.removeItem(key);
      }
    });
  };

  return (
    <>
      {/* Always load the gtag script, but configure it to respect consent */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-QMRDRH8ZP6"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          
          // Set default consent to denied until explicitly granted
          gtag('consent', 'default', {
            'analytics_storage': 'denied',
            'ad_storage': 'denied'
          });
          
          gtag('js', new Date());
          gtag('config', 'G-QMRDRH8ZP6', {
            'send_page_view': false, // Don't send page view until consent is granted
            'cookie_flags': 'SameSite=None;Secure',
            'debug_mode': false
          });
          
          // If consent was previously granted, update it now
          if (localStorage.getItem('analytics-consent') === 'granted') {
            gtag('consent', 'update', {
              'analytics_storage': 'granted',
              'ad_storage': 'granted'
            });
            
            // Send the page view
            gtag('event', 'page_view', {
              'page_title': document.title,
              'page_location': window.location.href,
              'page_path': window.location.pathname
            });
          }
        `}
      </Script>
    </>
  );
} 