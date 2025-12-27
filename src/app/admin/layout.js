'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import styles from './layout.module.scss'
import Image from 'next/image'
import LogoMobileMenu from '@/app/assets/logo_normal_white.svg'
import { IoLogOutOutline } from 'react-icons/io5'
import { FiUser } from 'react-icons/fi'

import Button from '@/app/components/IconButton'

export default function AdminLayout({ children }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't check auth on login page or setup-password page
    if (pathname === '/admin' || pathname === '/admin/setup-password') {
      setLoading(false)
      return
    }

    checkAuth()
    
    // Listen for auth changes
    const supabase = createBrowserSupabaseClient()
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          if (pathname !== '/admin' && pathname !== '/admin/setup-password') {
            router.push('/admin')
          }
        } else if (session) {
          setUser(session.user)
        }
      })

      return () => subscription.unsubscribe()
    }
  }, [router, pathname])

  async function checkAuth() {
    try {
      const supabase = createBrowserSupabaseClient()
      if (!supabase) {
        router.push('/admin')
        return
      }

      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        router.push('/admin')
        return
      }

      setUser(session.user)
      setLoading(false)
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/admin')
    }
  }

  async function handleLogout() {
    try {
      const supabase = createBrowserSupabaseClient()
      if (supabase) {
        // Clear admin cache on logout
        try {
          localStorage.removeItem('admin_stats_cache')
          localStorage.removeItem('admin_playlist_cache')
        } catch (error) {
          console.error('Error clearing cache:', error)
        }
        
        await supabase.auth.signOut()
        router.push('/admin')
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // If on login page or setup-password page, render children directly
  if (pathname === '/admin' || pathname === '/admin/setup-password') {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className={styles.adminLayout}>
      <nav className={styles.sidebar}>
        <div className={styles.logo}>
          <Image 
            src={LogoMobileMenu} 
            alt="BONJOUR IDOL" 
            height={80}
            priority
          />
          <p className={styles.logoSubtitle}>Admin Panel</p>
        </div>

        <ul className={styles.navList}>
          <li>
            <Link 
              href="/admin/overview" 
              className={pathname === '/admin/overview' ? styles.active : ''}
            >
              Overview
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/selection-playlist" 
              className={pathname === '/admin/selection-playlist' ? styles.active : ''}
            >
              Selection Playlist
            </Link>
          </li>
        </ul>

        <div className={styles.userInfo}>
          <FiUser className={styles.userIcon} /> 
          <p className={styles.userEmail}>
            {user.email}
          </p>
        </div>

        <div className={styles.buttonWrapper}>
          <Button 
            onClick={handleLogout}
            disabled={loading} 
            variant="Pink"
            textValue="Logout"
            icon={<IoLogOutOutline />}
          />
        </div>
      </nav>

      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  )
}

