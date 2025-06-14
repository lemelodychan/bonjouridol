/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'browsing-topics=(), run-ad-auction=(), join-ad-interest-group=(), private-state-token-redemption=(), private-state-token-issuance=(), private-aggregation=(), attribution-reporting=()'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube-nocookie.com https://www.youtube.com; frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://www.youtube-nocookie.com https://www.youtube.com;"
          }
        ]
      }
    ]
  },
  // Enable Vercel Analytics
  analyticsId: process.env.VERCEL_ANALYTICS_ID
}

module.exports = nextConfig