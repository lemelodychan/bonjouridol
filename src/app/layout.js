import './globals.css'
import { DM_Sans, Poppins, Noto_Sans_JP } from 'next/font/google'

import { PrismicPreview, PrismicNextImage } from '@prismicio/next'
import { repositoryName, createClient } from '@/prismicio'
import Script from 'next/script';

import ErrorHandler from './components/ErrorHandler'
import ConditionalSiteLayout from './components/ConditionalSiteLayout'
import GoogleTagManager from './components/GoogleTagManager'
import UmamiTracker from './components/UmamiTracker'

const DMSans = DM_Sans({ subsets: ['latin'] })

export async function generateMetadata() {
  try {
    const client = createClient();
    const homepage = await client.getSingle("homepage");

    return {
      metadataBase: new URL('https://www.bonjouridol.com'),
      title: homepage.data.meta_title || 'BONJOUR IDOL',
      description: homepage.data.meta_description || 'Bonjour Idol is a French media about the Japanese idol scene. Our team are idol fans and will be sharing their passion through photo reports of concerts and events, interviews and more exclusive content.',
      openGraph: {
        title: homepage.data.meta_title || 'BONJOUR IDOL',
        description: homepage.data.meta_description || 'Bonjour Idol is a French media about the Japanese idol scene. Our team are idol fans and will be sharing their passion through photo reports of concerts and events, interviews and more exclusive content.',
        url: 'https://www.bonjouridol.com',
        images: [
          {
            url: homepage.data.meta_image?.url || '/FeaturedImage.png',
            width: 1200,
            height: 630,
            alt: homepage.data.meta_title || 'Bonjour Idol',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: homepage.data.meta_title || 'BONJOUR IDOL',
        description: homepage.data.meta_description || 'Bonjour Idol is a French media about the Japanese idol scene. Our team are idol fans and will be sharing their passion through photo reports of concerts and events, interviews and more exclusive content.',
        images: [homepage.data.meta_image?.url || '/FeaturedImage.png'],
      },
    };
  } catch (error) {
    console.error('Error fetching layout metadata:', error);
    return {
      metadataBase: new URL('https://www.bonjouridol.com'),
      title: 'BONJOUR IDOL',
      description: 'Bonjour Idol is a French media about the Japanese idol scene. Our team are idol fans and will be sharing their passion through photo reports of concerts and events, interviews and more exclusive content.',
      openGraph: {
        title: 'BONJOUR IDOL',
        description: 'Bonjour Idol is a French media about the Japanese idol scene. Our team are idol fans and will be sharing their passion through photo reports of concerts and events, interviews and more exclusive content.',
        url: 'https://www.bonjouridol.com',
        images: [
          {
            url: '/FeaturedImage.png',
            width: 1200,
            height: 630,
            alt: 'Bonjour Idol',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'BONJOUR IDOL',
        description: 'Bonjour Idol is a French media about the Japanese idol scene. Our team are idol fans and will be sharing their passion through photo reports of concerts and events, interviews and more exclusive content.',
        images: ['/FeaturedImage.png'],
      },
    };
  }
}

export default async function RootLayout({ children }) {
  try {
    return (
      <html lang="en">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="google-site-verification" content="WOV1O-V5Z53289sOWAWW_caWIAFnluDcQ6PEdiJ0pCU" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" />
          <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400;1,9..40,500;1,9..40,700&family=Noto+Sans+JP:wght@400;500;700&family=Poppins:wght@900&display=swap" rel="stylesheet" />
          <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet"></link>
          <GoogleTagManager />
          <UmamiTracker />
        </head>
        <body>
          <ErrorHandler />
          <ConditionalSiteLayout>
            {children}
          </ConditionalSiteLayout>
          <script async defer src="https://static.cdn.prismic.io/prismic.js?new=true&repo=bonjouridol"></script>
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
            <ErrorHandler />
            <div>Something went wrong. Please try again.</div>
          </body>
        </html>
      )
    }
}
