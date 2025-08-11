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
        // Get the list of excluded IPs from environment variable
        const excludedIPs = process.env.NEXT_PUBLIC_UMAMI_EXCLUDED_IPS?.split(',') || []
        
        // Fetch the client's IP address
        const response = await fetch('/api/client-ip')
        const data = await response.json()
        const clientIP = data.ip
        
        // Check if the client's IP is in the excluded list
        if (excludedIPs.includes(clientIP)) {
          console.log('Umami tracking disabled for IP:', clientIP)
          setShouldTrack(false)
          // Set the global flag for other components
          window.umami = { disabled: true }
        } else {
          setShouldTrack(true)
        }
      } catch (error) {
        console.error('Error checking IP for Umami exclusion:', error)
        // Default to tracking if there's an error
        setShouldTrack(true)
      }
    }
    
    checkIPAndDisable()
  }, [])

  if (!isClient || !shouldTrack) {
    return null
  }

  return (
    <Script
      src="https://cloud.umami.is/script.js"
      strategy="afterInteractive"
      defer
      data-website-id="f092e573-6aba-45f6-af52-71e7d3c51bd0"
      data-host-url="https://cloud.umami.is"
      data-auto-track="true"
    />
  )
}
