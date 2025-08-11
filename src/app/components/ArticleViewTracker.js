'use client'

import { useEffect } from 'react'

export default function ArticleViewTracker({ slug, type }) {
  useEffect(() => {
    if (!slug || !type) return

    const trackView = async () => {
      try {
        await fetch('/api/articles/view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slug,
            type,
          }),
        })
      } catch (error) {
        console.error('Error tracking view:', error)
      }
    }

    // Track view after a short delay to ensure it's a real page view
    const timer = setTimeout(trackView, 1000)

    return () => clearTimeout(timer)
  }, [slug, type])

  return null // This component doesn't render anything
}
