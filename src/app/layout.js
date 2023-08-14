import './globals.scss'
import { DM_Sans, Poppins, Noto_Sans_JP } from 'next/font/google'

export const metadata = {
  title: 'BONJOUR IDOL',
  description: 'v2',
}

export default function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  )
}