import { NextResponse } from 'next/server'

// Redirect mapping for old site URLs
const redirectMap = {
  // Live Reports
  '/taking-different-pathways-with-hope-and-love-iketeru-hearts-final-live': '/articles/iketeru-hearts-final-live-2023',
  '/unidol-2021-2022-winter-edition-the-dark-horses-finale': '/articles/unidol-2021-2022-winter-finale',
  '/dont-stop-youll-melt-more-delivery-lifesavers-tour-tokyo-kechon-chiffon-graduation': '/articles/youll-melt-more-kechon-chiffon-graduation-2022',
  '/4-years-already-love-anniversary-concert': '/articles/love-anniversary-concert-2021',
  '/seven-years-of-love-iketeru-hearts-7th-anniversary-live': '/articles/iketeru-hearts-7th-anniversary-2021',
  
  // Interviews
  '/a-japanese-girl-in-spain-interview-with-kamieda-emika-former-nmb48-part-2': '/articles/kamieda-emika-interview-part-2-2020',
  '/a-japanese-girl-in-spain-interview-with-kamieda-emika-former-nmb48-part-1': '/articles/kamieda-emika-interview-part-1-2020',
  
  // News & Press Releases
  '/one-last-unidol-event-at-usen-studio-coast': '/articles/unidol-usen-studio-coast-final-2021',
  '/unidol-2021-fresh-your-dose-of-vitamins': '/articles/unidol-2021-fresh-event',
  
  // Discoveries
  '/discovery-first-contact-with-somosomo': '/articles/somosomo-discovery-2020',
  '/beach-watermelons-and-bikini-a-summer-idol-playlist': '/articles/summer-idol-playlist-2019',
  '/discovery-festive': '/articles/festive-discovery-2019',
  
  // Bonjour Idol Style
  '/neoriyon-stupid-august-2020': '/galleries/200801-neoriyon',
  
  // Categories
  '/interviews': '/features',
  '/news': '/pressrelease',
  '/behind-the-scenes': '/features',
  '/bonjour-idol-style': '/galleries',
  
  // Language redirects
  '/fr': '/',
  '/en': '/',
}

export function middleware(request) {
  const { pathname } = request.nextUrl
  
  // Check if we have a redirect for this path
  const destination = redirectMap[pathname]
  
  if (destination) {
    console.log(`Middleware redirecting ${pathname} to ${destination}`)
    return NextResponse.redirect(new URL(destination, request.url), 301)
  }
  
  // Handle tag redirects
  if (pathname.startsWith('/tag/')) {
    const tag = pathname.replace('/tag/', '')
    const searchUrl = new URL('/search', request.url)
    searchUrl.searchParams.set('tag', tag)
    return NextResponse.redirect(searchUrl, 301)
  }
  
  // Handle language redirects with paths
  if (pathname.startsWith('/fr/') || pathname.startsWith('/en/')) {
    const newPath = pathname.replace(/^\/(fr|en)\//, '/')
    return NextResponse.redirect(new URL(newPath, request.url), 301)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
