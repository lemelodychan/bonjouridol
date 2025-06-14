'use client';

import { useEffect } from 'react';

export default function ErrorHandler() {
  useEffect(() => {
    // Override console.error for specific errors
    const originalConsoleError = console.error;
    console.error = function(...args) {
      const errorMessage = args[0]?.toString() || '';
      
      // Check if it's a YouTube-related error
      if (errorMessage.includes('youtube-nocookie.com') || 
          errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
        console.log(
          '%c[YouTube Player]',
          'color: #666; font-style: italic;',
          'Some YouTube features are blocked by your privacy settings. This is normal and won\'t affect video playback.'
        );
        return;
      }

      // Check if it's a Google Analytics error
      if (errorMessage.includes('google-analytics.com')) {
        console.log(
          '%c[Analytics]',
          'color: #666; font-style: italic;',
          'Some analytics features are blocked by your privacy settings. This is normal and won\'t affect site functionality.'
        );
        return;
      }
      
      // For all other errors, use the original console.error
      originalConsoleError.apply(console, args);
    };

    // Override console.warn for non-critical warnings
    const originalConsoleWarn = console.warn;
    console.warn = function(...args) {
      const warningMessage = args[0]?.toString() || '';
      
      // Ignore overflow warnings
      if (warningMessage.includes('overflow: visible') || 
          warningMessage.includes('view-transitions')) {
        return;
      }
      
      // For all other warnings, use the original console.warn
      originalConsoleWarn.apply(console, args);
    };

    // Cleanup function
    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  return null;
} 