'use client';

import { useEffect } from 'react';

export default function ErrorHandler() {
  useEffect(() => {
    // Handle chunk loading errors (Next.js production issue)
    const handleChunkError = (event) => {
      const error = event.error || event.reason;
      if (error && (
        error.message?.includes('ChunkLoadError') ||
        error.message?.includes('Loading chunk') ||
        error.message?.includes('Failed to fetch dynamically imported module') ||
        error.name === 'ChunkLoadError'
      )) {
        console.warn(
          '%c[Next.js]',
          'color: #666; font-style: italic;',
          'Chunk loading error detected. This usually happens after a deployment. Please refresh the page.'
        );
        
        // Show a user-friendly message and offer to reload
        if (typeof window !== 'undefined' && !window.chunkErrorHandled) {
          window.chunkErrorHandled = true;
          
          // Try to reload the page after a short delay
          setTimeout(() => {
            if (confirm('The page needs to be refreshed to load the latest version. Reload now?')) {
              window.location.reload();
            }
          }, 1000);
        }
        
        // Prevent the error from bubbling up
        event.preventDefault?.();
        return true;
      }
      return false;
    };

    // Listen for unhandled errors
    window.addEventListener('error', handleChunkError, true);
    window.addEventListener('unhandledrejection', handleChunkError);

    // Override console.error for specific errors
    const originalConsoleError = console.error;
    console.error = function(...args) {
      const errorMessage = args[0]?.toString() || '';
      
      // Check if it's a chunk loading error
      if (errorMessage.includes('ChunkLoadError') || 
          errorMessage.includes('Loading chunk') ||
          errorMessage.includes('Failed to fetch dynamically imported module')) {
        console.warn(
          '%c[Next.js Chunk Error]',
          'color: #ff6b6b; font-weight: bold;',
          'A chunk loading error occurred. This is usually resolved by refreshing the page.'
        );
        return;
      }
      
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
      window.removeEventListener('error', handleChunkError, true);
      window.removeEventListener('unhandledrejection', handleChunkError);
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  return null;
} 