'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Topbar from './Topbar'
import Footer from './Footer'
import ConsentBanner from './ConsentBanner'
import Playlist from './Playlist'
import ScrollControls from './ScrollControls'
import { Analytics } from "@vercel/analytics/next"

export default function ConditionalSiteLayout({ children }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')
  // The Bonjour Party page is a standalone bespoke landing with its own chrome.
  const isPartyRoute = pathname?.startsWith('/party')

  if (isAdminRoute || isPartyRoute) {
    return <>{children}</>
  }

  return (
    <>
      <Topbar />
      <Navbar />
      {children}
      <Analytics />
      <Footer />
      <ConsentBanner />
      <Playlist />
      <ScrollControls />
    </>
  )
}

