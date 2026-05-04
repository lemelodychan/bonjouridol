'use client'

import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import styles from './layout.module.scss'
import Image from 'next/image'
import LogoMobileMenu from '@/app/assets/logo_normal_white.svg'
import { IoLogOutOutline } from 'react-icons/io5'
import { FiUser } from 'react-icons/fi'

import Button from '@/app/components/IconButton'

const ProcessingContext = createContext(null)

export function useProcessing() {
  return useContext(ProcessingContext)
}

function ProcessingProvider({ children }) {
  const [processing, setProcessing]       = useState(false)
  const [processResult, setProcessResult] = useState(null)
  const [processTotal, setProcessTotal]   = useState(0)

  const handleProcessQueue = useCallback(async (rawCount) => {
    setProcessTotal(rawCount)
    setProcessing(true)
    setProcessResult(null)
    const totals = { processed: 0, pending: 0, rejected: 0, errors: [] }
    try {
      while (true) {
        const res  = await fetch('/api/admin/curation/queue/process', { method: 'POST' })
        const text = await res.text()
        let data
        try {
          data = JSON.parse(text)
        } catch {
          totals.errors.push(
            `Server error${res.status !== 200 ? ` (${res.status})` : ''} — remaining items not processed. ` +
            `Items processed so far are saved. Click Process again to continue.`
          )
          break
        }
        if (!res.ok) { totals.errors.push(data.error || `Server error ${res.status}`); break }
        totals.processed += data.processed || 0
        totals.pending   += data.pending   || 0
        totals.rejected  += data.rejected  || 0
        totals.errors     = totals.errors.concat(data.errors || [])
        setProcessResult({ ...totals, running: data.processed > 0 })
        if (!data.processed) break
      }
      setProcessResult(totals)
    } catch (err) {
      setProcessResult({ ...totals, error: err.message })
    } finally {
      setProcessing(false)
    }
  }, [])

  return (
    <ProcessingContext.Provider value={{ processing, processResult, processTotal, handleProcessQueue, setProcessResult }}>
      {children}
    </ProcessingContext.Provider>
  )
}

function ProcessingBar() {
  const { processing, processResult, processTotal } = useProcessing()
  const isRunning = processing || processResult?.running
  if (!isRunning) return null
  return (
    <div className={styles.processingBar}>
      <div className={styles.processingBarTrack}>
        <div
          className={styles.processingBarFill}
          style={{ width: `${processTotal > 0 ? Math.min(100, Math.round(((processResult?.processed || 0) / processTotal) * 100)) : 100}%` }}
        />
      </div>
      <span className={styles.processingBarLabel}>
        Processing… {processResult?.processed || 0}{processTotal > 0 ? ` / ${processTotal}` : ''}
      </span>
    </div>
  )
}

export default function AdminLayout({ children }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Add robots meta tag to prevent indexing
    const metaRobots = document.querySelector('meta[name="robots"]')
    if (metaRobots) {
      metaRobots.setAttribute('content', 'noindex, nofollow, noarchive, nosnippet, noimageindex')
    } else {
      const meta = document.createElement('meta')
      meta.name = 'robots'
      meta.content = 'noindex, nofollow, noarchive, nosnippet, noimageindex'
      document.head.appendChild(meta)
    }

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
    <ProcessingProvider>
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
                href="/admin/artist-profiles"
                className={pathname === '/admin/artist-profiles' ? styles.active : ''}
              >
                Artist Profiles
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
            <li>
              <Link
                href="/admin/galleries"
                className={pathname === '/admin/galleries' ? styles.active : ''}
              >
                Gallery Manager
              </Link>
            </li>
            <li>
              <Link
                href="/admin/curation"
                className={pathname.startsWith('/admin/curation') ? styles.active : ''}
              >
                Content Queue
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
          <ProcessingBar />
          <svg width={0} height={0} style={{ position: 'absolute' }}>
            <defs>
              <linearGradient id="bi-gradient-2" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF3194" />
                <stop offset="100%" stopColor="#7272FC" />
              </linearGradient>
            </defs>
          </svg>
          {children}
        </main>
      </div>
    </ProcessingProvider>
  )
}

