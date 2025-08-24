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
  
  // New redirects from CSV migration
  '/ylmlm-younapi-last-live': '/articles/201020-youll-melt-more-younapi-graduation',
  '/junjou-afilia-9nin-etranger-prologue-en': '/articles/200725-junjou-no-afilia-oneman-request',
  '/equal-love-winter-tour-finale-2019': '/articles/200117-equal-love-2019-20-winter-tour-finale',
  '/onepixcel-first-oneman-live-2020': '/articles/200209-onepixcel-one-man',
  '/onepixcel-tour-finale-2019': '/articles/190922-onepixcel-tour-finale',
  '/akishibu-project-first-concert-2020': '/articles/200216-akishibu-project-one-man-live',
  '/tif2019-stu48-en': '/articles/190802-04-tif2019-stu48',
  '/tif2019-task-have-fun-en': '/articles/190804-tif2019-task-have-fun',
  '/tif2019-equal-love-en': '/articles/190802-04-tif2019-equal-love',
  '/tif2019-angerme-beyooooonds-kobushi-factory-en': '/articles/190802-04-tif2019-hello-project',
  '/tif2019-wack-en': '/articles/190802-tif2019-wack',
  '/tif2019-22-7-en': '/articles/190802-04-tif2019-22-7',
  '/tif2019-festive-en': '/articles/190804-tif2019-festive',
  '/tif2019-nogizaka46-4th-generation': '/articles/190802-04-tif2019-nogizaka46',
  '/tif2019-standup-records-groups': '/articles/190802-04-tif2019-standup-records',
  '/tif2019-bnk48-siamdream-en': '/articles/190804-tif2019-bnk48-siamdream',
  '/tif2019-akb48-en': '/articles/190802-04-tif2019-akb48',
  '/tif2019-ske-nmb-hkt-48-en': '/articles/190802-04-tif2019-48groups',
  '/awakoi-tomiyoshi-asuka-first-solo-concert': '/articles/210427-awakoi',
  '/banzai-japan-paris-trip-europe': '/articles/180708-banzai-japan-in-paris',
  '/milcs-honmono-introduction': '/articles/191006-milcs-honmono-tokyo-one-man',
  '/kyueens-encounter-club-malcolm': '/articles/190510-kyueens',
  '/notall-tour-finale-chiko-graduation': '/articles/190321-notall-tour-finale',
  '/discovery-malcom-mask-mclaren': '/articles/discovery-malcolm-mask-mclaren',
  '/discovery-necronomidol': '/articles/discovery-necronomidol',
  '/love-japan-expo-2018-interview-fr': '/articles/180705-je-2018-equallove-interview',
  '/japan-expo-2018-maneki-kecak-2': '/articles/180705-je-2018-maneki-kecak-interview',
  '/kozuki-serena-3rd-live-report': '/articles/160424-kozuki-serenas-3rd-one-man-live',
  '/kozuki-serena-6th-oneman': '/articles/171230-kozuki-serena-6th-one-man-live',
  '/tokyo-idol-festival-2018-hkt48-en': '/articles/180804-tif2018-hkt48',
  '/tokyo-idol-festival-2018-japan-expo-guests': '/articles/180804-tif2018-japan-expo-guests',
  '/tokyo-idol-festival-2018-akb48-team8-stu48-bnk48': '/articles/180804-tif2018-akb48-team8-stu48-bnk48',
  
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
