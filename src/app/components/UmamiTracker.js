'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

export default function UmamiTracker() {
  const [shouldTrack, setShouldTrack] = useState(true)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Check if Umami is already disabled in localStorage
    const isDisabledInStorage = localStorage.getItem('umami.disabled') === '1'
    if (isDisabledInStorage) {
      console.log('🚫 Umami tracking DISABLED (from localStorage)')
      setShouldTrack(false)
      window.umami = { disabled: true }
      return
    }
    
    const checkIPAndDisable = async () => {
      try {
        // Use the server-side API to check IP and get environment variables
        const response = await fetch('/api/umami-check')
        const data = await response.json()
        
        console.log('UmamiTracker debug:', data)
        
        if (data.shouldDisable) {
          console.log('🚫 Umami tracking DISABLED for IP:', data.clientIP)
          setShouldTrack(false)
          // Set the global flag for other components
          window.umami = { disabled: true }
          // Set localStorage to prevent any tracking
          localStorage.setItem('umami.disabled', '1')
        } else {
          console.log('✅ Umami tracking ENABLED for IP:', data.clientIP)
          setShouldTrack(true)
          // Remove localStorage flag if it exists
          localStorage.removeItem('umami.disabled')
        }
      } catch (error) {
        console.error('❌ Error checking IP for Umami exclusion:', error)
        // Default to tracking if there's an error
        setShouldTrack(true)
      }
    }
    
    checkIPAndDisable()
  }, [])

  if (!isClient) {
    console.log('🚫 UmamiTracker: Not client side yet')
    return null
  }

  if (!shouldTrack) {
    console.log('🚫 UmamiTracker: Not rendering script (disabled for IP)')
    return null
  }

  console.log('✅ UmamiTracker: Rendering script')
  return (
    <Script
      src="https://cloud.umami.is/script.js"
      strategy="afterInteractive"
      defer
      data-website-id="f092e573-6aba-45f6-af52-71e7d3c51bd0"
      data-host-url="https://cloud.umami.is"
      data-auto-track="true"
      data-do-not-track="false"
    />
  )
}
