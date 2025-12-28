'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { HiChevronUp } from 'react-icons/hi'
import styles from './ScrollControls.module.scss'

export default function ScrollControls() {
  const [isVisible, setIsVisible] = useState(false)
  const pathname = usePathname()
  const isArticlePage = pathname?.startsWith('/articles/')

  useEffect(() => {
    const calculateThreshold = () => {
      // Navbar height is approximately 64px
      const navbarHeight = 64
      
      // Check if we're on homepage (which has HeroPost)
      const isHomepage = pathname === '/'
      
      // Hero height is 640px on mobile, but we'll use a reasonable threshold
      // On desktop, hero is relative, so we'll use a smaller threshold
      const heroHeight = typeof window !== 'undefined' && window.innerWidth < 768 ? 640 : 0
      
      // Return threshold: navbar + hero (if homepage), or just navbar
      return isHomepage ? navbarHeight + heroHeight : navbarHeight
    }

    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset
      const threshold = calculateThreshold()
      
      // Show button when scrolled past threshold, hide when at top
      setIsVisible(scrollY > threshold)
    }

    // Check initial scroll position
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [pathname])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <div className={`${styles.scrollControls} ${isVisible ? styles.visible : ''} ${isArticlePage ? styles.articlePage : ''}`}>
      <button
        className={styles.button}
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        <HiChevronUp />
      </button>
    </div>
  )
}

