"use client";

import { useEffect } from "react";

export default function SearchTracker({ searchTerm }) {
  useEffect(() => {
    // Track search results page view with the search term
    if (typeof window !== 'undefined' && window.gtag && searchTerm && searchTerm.trim()) {
      window.gtag('event', 'search', {
        'search_term': searchTerm.trim(),
        'event_category': 'engagement',
        'event_label': 'search_results_page',
        'custom_parameter': 'results_page_view'
      });
    }
  }, [searchTerm]);

  // This component doesn't render anything visible
  return null;
} 