/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Live Reports - Map specific articles
      {
        source: '/2023/12/iketeru-hearts-final-live',
        destination: '/articles/230121-iketeru-hearts-last-live',
        permanent: true,
      },
      {
        source: '/2022/02/unidol-2021-2022-winter-edition-the-dark-horses-finale',
        destination: '/articles/220228-unidol-2021-2022-winter-edition',
        permanent: true,
      },
      {
        source: '/2022/06/youll-melt-more-kechon-chiffon-graduation',
        destination: '/articles/211010-ylmlm-kechon-chiffon-graduation',
        permanent: true,
      },
      {
        source: '/2021/10/equal-love-4th-anniversary-concert',
        destination: '/articles/211005-equal-love-4th-anniversary-concert',
        permanent: true,
      },
      {
        source: '/2021/09/iketeru-hearts-7th-anniversary',
        destination: '/articles/210911-iketeru-hearts-7th-anniversary',
        permanent: true,
      },
      
      // Interviews
      {
        source: '/2020/01/kamieda-emika-interview-part-2',
        destination: '/articles/200119-interview-with-kamieda-emika-part-2',
        permanent: true,
      },
      {
        source: '/2020/01/kamieda-emika-interview-part-1',
        destination: '/articles/interview-with-kamieda-emika-part-1',
        permanent: true,
      },
      
      // News & Press Releases
      {
        source: '/2021/12/one-last-unidol-event-at-usen-studio-coast',
        destination: '/articles/211020-unidol-usen-studio-coast',
        permanent: true,
      },
      {
        source: '/2021/10/unidol-2021-fresh-your-dose-of-vitamins',
        destination: '/articles/211026-unidol-2021-fresh',
        permanent: true,
      },
      
      // Discoveries
      {
        source: '/2020/09/discovery-somosomo',
        destination: '/articles/discovery-somosomo',
        permanent: true,
      },
      {
        source: '/2019/06/summer-idol-songs-2019',
        destination: '/articles/summer-idol-songs-2019',
        permanent: true,
      },
      {
        source: '/2019/02/discovery-festive',
        destination: '/articles/discovery-festive',
        permanent: true,
      },
      
      // Bonjour Idol Style
      {
        source: '/portfolio/neoriyon-2020',
        destination: '/galleries/200801-neoriyon',
        permanent: true,
      },
      
      // New redirects from CSV migration
      {
        source: '/2020/12/ylmlm-younapi-last-live',
        destination: '/articles/201020-youll-melt-more-younapi-graduation',
        permanent: true,
      },
      {
        source: '/2020/07/junjou-afilia-9nin-etranger-prologue-en',
        destination: '/articles/200725-junjou-no-afilia-oneman-request',
        permanent: true,
      },
      {
        source: '/2020/01/equal-love-winter-tour-finale-2019',
        destination: '/articles/200117-equal-love-2019-20-winter-tour-finale',
        permanent: true,
      },
      {
        source: '/2020/03/onepixcel-first-oneman-live-2020',
        destination: '/articles/200209-onepixcel-one-man',
        permanent: true,
      },
      {
        source: '/2019/10/onepixcel-tour-finale-2019',
        destination: '/articles/190922-onepixcel-tour-finale',
        permanent: true,
      },
      {
        source: '/2020/03/akishibu-project-first-concert-2020',
        destination: '/articles/200216-akishibu-project-one-man-live',
        permanent: true,
      },
      {
        source: '/2019/09/tif2019-stu48-en',
        destination: '/articles/190802-04-tif2019-stu48',
        permanent: true,
      },
      {
        source: '/2019/09/tif2019-task-have-fun-en',
        destination: '/articles/190804-tif2019-task-have-fun',
        permanent: true,
      },
      {
        source: '/2019/09/tif2019-equal-love-en',
        destination: '/articles/190802-04-tif2019-equal-love',
        permanent: true,
      },
      {
        source: '/2019/09/tif2019-angerme-beyooooonds-kobushi-factory-en',
        destination: '/articles/190802-04-tif2019-hello-project',
        permanent: true,
      },
      {
        source: '/2019/08/tif2019-wack-en',
        destination: '/articles/190802-tif2019-wack',
        permanent: true,
      },
      {
        source: '/2019/08/tif2019-22-7-en',
        destination: '/articles/190802-04-tif2019-22-7',
        permanent: true,
      },
      {
        source: '/2019/08/tif2019-festive-en',
        destination: '/articles/190804-tif2019-festive',
        permanent: true,
      },
      {
        source: '/2019/08/tif2019-nogizaka46-4th-generation',
        destination: '/articles/190802-04-tif2019-nogizaka46',
        permanent: true,
      },
      {
        source: '/2019/08/tif2019-standup-records-groups',
        destination: '/articles/190802-04-tif2019-standup-records',
        permanent: true,
      },
      {
        source: '/2019/08/tif2019-bnk48-siamdream-en',
        destination: '/articles/190804-tif2019-bnk48-siamdream',
        permanent: true,
      },
      {
        source: '/2019/09/tif2019-akb48-en',
        destination: '/articles/190802-04-tif2019-akb48',
        permanent: true,
      },
      {
        source: '/2019/08/tif2019-ske-nmb-hkt-48-en',
        destination: '/articles/190802-04-tif2019-48groups',
        permanent: true,
      },
      {
        source: '/2021/04/awakoi-tomiyoshi-asuka-first-solo-concert',
        destination: '/articles/210427-awakoi',
        permanent: true,
      },
      {
        source: '/2018/07/banzai-japan-paris-trip-europe',
        destination: '/articles/180708-banzai-japan-in-paris',
        permanent: true,
      },
      {
        source: '/2019/10/milcs-honmono-introduction',
        destination: '/articles/191006-milcs-honmono-tokyo-one-man',
        permanent: true,
      },
      {
        source: '/2019/05/kyueens-encounter-club-malcolm',
        destination: '/articles/190510-kyueens',
        permanent: true,
      },
      {
        source: '/2019/03/notall-tour-finale-chiko-graduation',
        destination: '/articles/190321-notall-tour-finale',
        permanent: true,
      },
      {
        source: '/2019/01/discovery-malcom-mask-mclaren',
        destination: '/articles/discovery-malcolm-mask-mclaren',
        permanent: true,
      },
      {
        source: '/2019/01/discovery-necronomidol',
        destination: '/articles/discovery-necronomidol',
        permanent: true,
      },
      {
        source: '/2018/07/love-japan-expo-2018-interview-fr',
        destination: '/articles/180705-je-2018-equallove-interview',
        permanent: true,
      },
      {
        source: '/2018/07/japan-expo-2018-maneki-kecak-2',
        destination: '/articles/180705-je-2018-maneki-kecak-interview',
        permanent: true,
      },
      {
        source: '/2016/04/kozuki-serena-3rd-live-report',
        destination: '/articles/160424-kozuki-serenas-3rd-one-man-live',
        permanent: true,
      },
      {
        source: '/2017/12/kozuki-serena-6th-oneman',
        destination: '/articles/171230-kozuki-serena-6th-one-man-live',
        permanent: true,
      },
      {
        source: '/2018/08/tokyo-idol-festival-2018-hkt48-en',
        destination: '/articles/180804-tif2018-hkt48',
        permanent: true,
      },
      {
        source: '/2018/08/tokyo-idol-festival-2018-japan-expo-guests',
        destination: '/articles/180804-tif2018-japan-expo-guests',
        permanent: true,
      },
      {
        source: '/2018/08/tokyo-idol-festival-2018-akb48-team8-stu48-bnk48',
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
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig