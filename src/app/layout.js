import './globals.css'
import { DM_Sans, Poppins, Noto_Sans_JP } from 'next/font/google'

import { PrismicPreview, PrismicNextImage } from '@prismicio/next'
import { repositoryName } from '@/prismicio'

import FeaturedImage from '@/app/assets/FeaturedImage.png';

import Navbar from './components/Navbar'
import Topbar from './components/Topbar'
import Footer from './components/Footer'
import Custom404 from '@/app/404';

const DMSans = DM_Sans({ subsets: ['latin'] })

export const metadata = {
  title: 'BONJOUR IDOL',
  description: 'Bonjour Idol is a French media about the Japanese idol scene. Our team are idol fans and will be sharing their passion through photo reports of concerts and events, interviews and more exclusive content.',
  image: '/FeaturedImage.png',
}

export default function RootLayout({ children }) {
  try {
    return (
      <html lang="en">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />

          <meta property="og:url" content="https://www.bonjouridol.com/" />
          <meta property="og:type" content="website" />
          <meta property="og:title" content="BONJOUR IDOL | Home" />
          <meta property="og:description" content="Bonjour Idol is a French media about the Japanese idol scene. Our team are idol fans and will be sharing their passion through photo reports of concerts and events, interviews and more exclusive content. Check it out!" />
          <meta property="og:image" content="/FeaturedImage.png" />

          <meta name="twitter:card" content="summary_large_image" />
          <meta property="twitter:domain" content="bonjouridol.com" />
          <meta property="twitter:url" content="https://www.bonjouridol.com/" />
          <meta name="twitter:title" content="BONJOUR IDOL | Home" />
          <meta name="twitter:description" content="Bonjour Idol is a French media about the Japanese idol scene. Our team are idol fans and will be sharing their passion through photo reports of concerts and events, interviews and more exclusive content. Check it out!" />
          <meta name="twitter:image" content="/FeaturedImage.png" />

          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" />
          <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400;1,9..40,500;1,9..40,700&family=Noto+Sans+JP:wght@400;500;700&family=Poppins:wght@900&display=swap" rel="stylesheet" />
          <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet"></link>
          <script async defer src="https://static.cdn.prismic.io/prismic.js?new=true&repo=bonjouridol"></script>
        </head>
        <body>
          <Topbar />
          <Navbar />
          {children}
          <PrismicPreview repositoryName={repositoryName} />
          <Footer />
        </body>
      </html>
    ) 
  } catch (error) {
      console.error("Error in layout:", error);
      return (
        <html lang="en">
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body>
            <Topbar />
            <Navbar />
            <Custom404 />
            <Footer />
          </body>
        </html>
      )
    }
}
