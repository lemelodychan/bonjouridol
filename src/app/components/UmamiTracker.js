'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

export default function UmamiTracker() {
  const [shouldTrack, setShouldTrack] = useState(true)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
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
        } else {
          console.log('✅ Umami tracking ENABLED for IP:', data.clientIP)
          setShouldTrack(true)
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
