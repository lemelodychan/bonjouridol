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