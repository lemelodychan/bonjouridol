/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube-nocookie.com https://www.youtube.com https://static.cdn.prismic.io https://www.googletagmanager.com https://www.google-analytics.com https://va.vercel-scripts.com; frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://bonjouridol.prismic.io https://*.prismic.io; img-src 'self' data: https: https://*.prismic.io https://images.prismic.io https://images.unsplash.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://static.cdn.prismic.io https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://*.prismic.io;"
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig