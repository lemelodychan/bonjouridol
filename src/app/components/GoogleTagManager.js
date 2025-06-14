'use client';

import Script from 'next/script';
import { useEffect } from 'react';

export default function GoogleAnalytics() {
  useEffect(() => {
    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      'event': 'page_view',
      'page_title': document.title,
      'page_location': window.location.href,
      'page_path': window.location.pathname
    });
  }, []);

  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-QMRDRH8ZP6"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-QMRDRH8ZP6', {
            'send_page_view': true,
            'cookie_flags': 'SameSite=None;Secure',
            'debug_mode': true
          });
        `}
      </Script>
    </>
  );
} 