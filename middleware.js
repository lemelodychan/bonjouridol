import { NextResponse } from 'next/server'

// Redirect mapping for old site URLs
const redirectMap = {
  // Live Reports
  '/2023/12/iketeru-hearts-final-live': '/articles/230121-iketeru-hearts-last-live',
  '/2022/02/unidol-2021-2022-winter-edition-the-dark-horses-finale': '/articles/220228-unidol-2021-2022-winter-edition',
  '/2022/06/youll-melt-more-kechon-chiffon-graduation': '/articles/211010-ylmlm-kechon-chiffon-graduation',
  '/2021/10/equal-love-4th-anniversary-concert': '/articles/211005-equal-love-4th-anniversary-concert',
  '/2021/09/iketeru-hearts-7th-anniversary': '/articles/210911-iketeru-hearts-7th-anniversary',
  
  // Interviews
  '/2020/01/kamieda-emika-interview-part-2': '/articles/200119-interview-with-kamieda-emika-part-2',
  '/2020/01/kamieda-emika-interview-part-1': '/articles/interview-with-kamieda-emika-part-1',
  
  // News & Press Releases
  '/2021/12/one-last-unidol-event-at-usen-studio-coast': '/articles/211020-unidol-usen-studio-coast',
  '/2021/10/unidol-2021-fresh-your-dose-of-vitamins': '/articles/211026-unidol-2021-fresh',
  
  // Discoveries
  '/2020/09/discovery-somosomo': '/articles/discovery-somosomo',
  '/2019/06/summer-idol-songs-2019': '/articles/summer-idol-songs-2019',
  '/2019/02/discovery-festive': '/articles/discovery-festive',
  
  // Bonjour Idol Style
  '/portfolio/neoriyon-2020': '/galleries/200801-neoriyon',
  
  // New redirects from CSV migration
  '/2020/12/ylmlm-younapi-last-live': '/articles/201020-youll-melt-more-younapi-graduation',
  '/2020/07/junjou-afilia-9nin-etranger-prologue-en': '/articles/200725-junjou-no-afilia-oneman-request',
  '/2020/01/equal-love-winter-tour-finale-2019': '/articles/200117-equal-love-2019-20-winter-tour-finale',
  '/2020/03/onepixcel-first-oneman-live-2020': '/articles/200209-onepixcel-one-man',
  '/2019/10/onepixcel-tour-finale-2019': '/articles/190922-onepixcel-tour-finale',
  '/2020/03/akishibu-project-first-concert-2020': '/articles/200216-akishibu-project-one-man-live',
  '/2019/09/tif2019-stu48-en': '/articles/190802-04-tif2019-stu48',
  '/2019/09/tif2019-task-have-fun-en': '/articles/190804-tif2019-task-have-fun',
  '/2019/09/tif2019-equal-love-en': '/articles/190802-04-tif2019-equal-love',
  '/2019/09/tif2019-angerme-beyooooonds-kobushi-factory-en': '/articles/190802-04-tif2019-hello-project',
  '/2019/09/tif2019-wack-en': '/articles/190802-tif2019-wack',
  '/2019/09/tif2019-22-7-en': '/articles/190802-04-tif2019-22-7',
  '/2019/09/tif2019-festive-en': '/articles/190804-tif2019-festive',
  '/2019/09/tif2019-nogizaka46-4th-generation': '/articles/190802-04-tif2019-nogizaka46',
  '/2019/09/tif2019-standup-records-groups': '/articles/190802-04-tif2019-standup-records',
  '/2019/09/tif2019-bnk48-siamdream-en': '/articles/190804-tif2019-bnk48-siamdream',
  '/2019/09/tif2019-akb48-en': '/articles/190802-04-tif2019-akb48',
  '/2019/09/tif2019-ske-nmb-hkt-48-en': '/articles/190802-04-tif2019-48groups',
  '/2021/04/awakoi-tomiyoshi-asuka-first-solo-concert': '/articles/210427-awakoi',
  '/2018/07/banzai-japan-paris-trip-europe': '/articles/180708-banzai-japan-in-paris',
  '/2019/10/milcs-honmono-introduction': '/articles/191006-milcs-honmono-tokyo-one-man',
  '/2019/05/kyueens-encounter-club-malcolm': '/articles/190510-kyueens',
  '/2019/03/notall-tour-finale-chiko-graduation': '/articles/190321-notall-tour-finale',
  '/2019/01/discovery-malcom-mask-mclaren': '/articles/discovery-malcolm-mask-mclaren',
  '/2019/01/discovery-necronomidol': '/articles/discovery-necronomidol',
  '/2018/07/love-japan-expo-2018-interview-fr': '/articles/180705-je-2018-equallove-interview',
  '/2018/07/japan-expo-2018-maneki-kecak-2': '/articles/180705-je-2018-maneki-kecak-interview',
  '/2016/04/kozuki-serena-3rd-live-report': '/articles/160424-kozuki-serenas-3rd-one-man-live',
  '/2017/12/kozuki-serena-6th-oneman': '/articles/171230-kozuki-serena-6th-one-man-live',
  '/2018/08/tokyo-idol-festival-2018-hkt48-en': '/articles/180804-tif2018-hkt48',
  '/2018/08/tokyo-idol-festival-2018-japan-expo-guests': '/articles/180804-tif2018-japan-expo-guests',
  '/2018/08/tokyo-idol-festival-2018-akb48-team8-stu48-bnk48': '/articles/180804-tif2018-akb48-team8-stu48-bnk48',
  
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
