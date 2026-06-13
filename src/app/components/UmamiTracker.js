'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

const WEBSITE_ID = 'f092e573-6aba-45f6-af52-71e7d3c51bd0'

/**
 * Loads Umami after a quick IP check. Admin IPs in NEXT_PUBLIC_UMAMI_EXCLUDED_IPS
 * are skipped — we never persist umami.disabled to localStorage (Umami's script
 * reads that key and it caused tracking to stick "off" across sessions).
 */
export default function UmamiTracker() {
  const [status, setStatus] = useState('checking') // 'checking' | 'load' | 'skip'

  useEffect(() => {
  // Clear legacy flag that permanently disabled Umami for some browsers
    try {
      localStorage.removeItem('umami.disabled')
    } catch {}

    let cancelled = false

    async function check() {
      try {
        const response = await fetch('/api/umami-check')
        const data = await response.json()
        if (cancelled) return

        if (data.shouldDisable) {
          window.umami = { disabled: true }
          setStatus('skip')
        } else {
          setStatus('load')
        }
      } catch {
        if (!cancelled) setStatus('load')
      }
    }

    check()
    return () => { cancelled = true }
  }, [])

  if (status !== 'load') return null

  return (
    <Script
      src="https://cloud.umami.is/script.js"
      strategy="afterInteractive"
      data-website-id={WEBSITE_ID}
      data-auto-track="true"
    />
  )
}
