/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Live Reports - Map specific articles
      {
        source: '/taking-different-pathways-with-hope-and-love-iketeru-hearts-final-live',
        destination: '/articles/iketeru-hearts-final-live-2023',
        permanent: true,
      },
      {
        source: '/unidol-2021-2022-winter-edition-the-dark-horses-finale',
        destination: '/articles/unidol-2021-2022-winter-finale',
        permanent: true,
      },
      {
        source: '/dont-stop-youll-melt-more-delivery-lifesavers-tour-tokyo-kechon-chiffon-graduation',
        destination: '/articles/youll-melt-more-kechon-chiffon-graduation-2022',
        permanent: true,
      },
      {
        source: '/4-years-already-love-anniversary-concert',
        destination: '/articles/love-anniversary-concert-2021',
        permanent: true,
      },
      {
        source: '/seven-years-of-love-iketeru-hearts-7th-anniversary-live',
        destination: '/articles/iketeru-hearts-7th-anniversary-2021',
        permanent: true,
      },
      
      // Interviews
      {
        source: '/a-japanese-girl-in-spain-interview-with-kamieda-emika-former-nmb48-part-2',
        destination: '/articles/kamieda-emika-interview-part-2-2020',
        permanent: true,
      },
      {
        source: '/a-japanese-girl-in-spain-interview-with-kamieda-emika-former-nmb48-part-1',
        destination: '/articles/kamieda-emika-interview-part-1-2020',
        permanent: true,
      },
      
      // News & Press Releases
      {
        source: '/one-last-unidol-event-at-usen-studio-coast',
        destination: '/articles/unidol-usen-studio-coast-final-2021',
        permanent: true,
      },
      {
        source: '/unidol-2021-fresh-your-dose-of-vitamins',
        destination: '/articles/unidol-2021-fresh-event',
        permanent: true,
      },
      
      // Discoveries
      {
        source: '/discovery-first-contact-with-somosomo',
        destination: '/articles/somosomo-discovery-2020',
        permanent: true,
      },
      {
        source: '/beach-watermelons-and-bikini-a-summer-idol-playlist',
        destination: '/articles/summer-idol-playlist-2019',
        permanent: true,
      },
      {
        source: '/discovery-festive',
        destination: '/articles/festive-discovery-2019',
        permanent: true,
      },
      
      // Bonjour Idol Style
      {
        source: '/neoriyon-stupid-august-2020',
        destination: '/galleries/200801-neoriyon',
        permanent: true,
      },
      
      // New redirects from CSV migration
      {
        source: '/ylmlm-younapi-last-live',
        destination: '/articles/201020-youll-melt-more-younapi-graduation',
        permanent: true,
      },
      {
        source: '/junjou-afilia-9nin-etranger-prologue-en',
        destination: '/articles/200725-junjou-no-afilia-oneman-request',
        permanent: true,
      },
      {
        source: '/equal-love-winter-tour-finale-2019',
        destination: '/articles/200117-equal-love-2019-20-winter-tour-finale',
        permanent: true,
      },
      {
        source: '/onepixcel-first-oneman-live-2020',
        destination: '/articles/200209-onepixcel-one-man',
        permanent: true,
      },
      {
        source: '/onepixcel-tour-finale-2019',
        destination: '/articles/190922-onepixcel-tour-finale',
        permanent: true,
      },
      {
        source: '/akishibu-project-first-concert-2020',
        destination: '/articles/200216-akishibu-project-one-man-live',
        permanent: true,
      },
      {
        source: '/tif2019-stu48-en',
        destination: '/articles/190802-04-tif2019-stu48',
        permanent: true,
      },
      {
        source: '/tif2019-task-have-fun-en',
        destination: '/articles/190804-tif2019-task-have-fun',
        permanent: true,
      },
      {
        source: '/tif2019-equal-love-en',
        destination: '/articles/190802-04-tif2019-equal-love',
        permanent: true,
      },
      {
        source: '/tif2019-angerme-beyooooonds-kobushi-factory-en',
        destination: '/articles/190802-04-tif2019-hello-project',
        permanent: true,
      },
      {
        source: '/tif2019-wack-en',
        destination: '/articles/190802-tif2019-wack',
        permanent: true,
      },
      {
        source: '/tif2019-22-7-en',
        destination: '/articles/190802-04-tif2019-22-7',
        permanent: true,
      },
      {
        source: '/tif2019-festive-en',
        destination: '/articles/190804-tif2019-festive',
        permanent: true,
      },
      {
        source: '/tif2019-nogizaka46-4th-generation',
        destination: '/articles/190802-04-tif2019-nogizaka46',
        permanent: true,
      },
      {
        source: '/tif2019-standup-records-groups',
        destination: '/articles/190802-04-tif2019-standup-records',
        permanent: true,
      },
      {
        source: '/tif2019-bnk48-siamdream-en',
        destination: '/articles/190804-tif2019-bnk48-siamdream',
        permanent: true,
      },
      {
        source: '/tif2019-akb48-en',
        destination: '/articles/190802-04-tif2019-akb48',
        permanent: true,
      },
      {
        source: '/tif2019-ske-nmb-hkt-48-en',
        destination: '/articles/190802-04-tif2019-48groups',
        permanent: true,
      },
      {
        source: '/awakoi-tomiyoshi-asuka-first-solo-concert',
        destination: '/articles/210427-awakoi',
        permanent: true,
      },
      {
        source: '/banzai-japan-paris-trip-europe',
        destination: '/articles/180708-banzai-japan-in-paris',
        permanent: true,
      },
      {
        source: '/milcs-honmono-introduction',
        destination: '/articles/191006-milcs-honmono-tokyo-one-man',
        permanent: true,
      },
      {
        source: '/kyueens-encounter-club-malcolm',
        destination: '/articles/190510-kyueens',
        permanent: true,
      },
      {
        source: '/notall-tour-finale-chiko-graduation',
        destination: '/articles/190321-notall-tour-finale',
        permanent: true,
      },
      {
        source: '/discovery-malcom-mask-mclaren',
        destination: '/articles/discovery-malcolm-mask-mclaren',
        permanent: true,
      },
      {
        source: '/discovery-necronomidol',
        destination: '/articles/discovery-necronomidol',
        permanent: true,
      },
      {
        source: '/love-japan-expo-2018-interview-fr',
        destination: '/articles/180705-je-2018-equallove-interview',
        permanent: true,
      },
      {
        source: '/japan-expo-2018-maneki-kecak-2',
        destination: '/articles/180705-je-2018-maneki-kecak-interview',
        permanent: true,
      },
      {
        source: '/kozuki-serena-3rd-live-report',
        destination: '/articles/160424-kozuki-serenas-3rd-one-man-live',
        permanent: true,
      },
      {
        source: '/kozuki-serena-6th-oneman',
        destination: '/articles/171230-kozuki-serena-6th-one-man-live',
        permanent: true,
      },
      {
        source: '/tokyo-idol-festival-2018-hkt48-en',
        destination: '/articles/180804-tif2018-hkt48',
        permanent: true,
      },
      {
        source: '/tokyo-idol-festival-2018-japan-expo-guests',
        destination: '/articles/180804-tif2018-japan-expo-guests',
        permanent: true,
      },
      {
        source: '/tokyo-idol-festival-2018-akb48-team8-stu48-bnk48',
        destination: '/articles/180804-tif2018-akb48-team8-stu48-bnk48',
        permanent: true,
      },
      
      // Category redirects (if you want to redirect entire sections)
      {
        source: '/interviews',
        destination: '/features',
        permanent: true,
      },
      {
        source: '/news',
        destination: '/pressrelease',
        permanent: true,
      },
      {
        source: '/behind-the-scenes',
        destination: '/features',
        permanent: true,
      },
      
      // Tag redirects (for SEO preservation)
      {
        source: '/tag/:tag*',
        destination: '/search?tag=:tag*',
        permanent: true,
      },
      
      // Language redirects
      {
        source: '/fr/:path*',
        destination: '/:path*',
        permanent: true,
      },
      {
        source: '/en/:path*',
        destination: '/:path*',
        permanent: true,
      },
    ]
  },
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube-nocookie.com https://www.youtube.com https://static.cdn.prismic.io https://www.googletagmanager.com https://www.google-analytics.com https://va.vercel-scripts.com https://cloud.umami.is; frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://bonjouridol.prismic.io https://*.prismic.io; img-src 'self' data: https: https://*.prismic.io https://images.prismic.io https://images.unsplash.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://static.cdn.prismic.io https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://*.prismic.io https://cloud.umami.is;"
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig