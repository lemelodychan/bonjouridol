'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import Button from '@/app/components/IconButton'
import { IoArrowForwardOutline } from 'react-icons/io5'
import styles from './page.module.scss'
import LogoDesktop from '@/app/assets/logo_croissant_pink.svg'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    try {
      const supabase = createBrowserSupabaseClient()
      if (!supabase) {
        setChecking(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Clear any old cache on login to ensure fresh data
        try {
          localStorage.removeItem('admin_stats_cache')
          localStorage.removeItem('admin_playlist_cache')
        } catch (error) {
          console.error('Error clearing cache:', error)
        }
        router.push('/admin/overview')
      } else {
        setChecking(false)
      }
    } catch (error) {
      console.error('Error checking session:', error)
      setChecking(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createBrowserSupabaseClient()
      if (!supabase) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
        console.error('Supabase client creation failed', {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing'
        })
        setError('Supabase client not available. Please check your environment variables are set correctly.')
        setLoading(false)
        return
      }

      console.log('Attempting login with Supabase client')
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error('Sign in error:', signInError)
        setError(signInError.message || 'Invalid email or password')
        setLoading(false)
        return
      }

      if (data.session) {
        console.log('Login successful, redirecting...')
        // Clear any old cache on login to ensure fresh data
        try {
          localStorage.removeItem('admin_stats_cache')
          localStorage.removeItem('admin_playlist_cache')
        } catch (error) {
          console.error('Error clearing cache:', error)
        }
        router.push('/admin/overview')
      } else {
        setError('Login failed. No session created.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(error.message || 'An error occurred during login. Please check your connection and Supabase configuration.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginBox}>
          <p>Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <div className={styles.logoContainer}>
          <Image 
            src={LogoDesktop} 
            alt="BONJOUR IDOL" 
            height={44}
            priority
          />
        </div>
        <h1 className={styles.loginTitle}>Admin Login</h1>
        
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="admin@example.com"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your password"
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.buttonWrapper}>
            <Button 
              type="submit" 
              disabled={loading} 
              variant="Pink"
              textValue={loading ? 'Logging in...' : 'Login'}
              icon={<IoArrowForwardOutline />}
            />
          </div>
          <p className={styles.note}>Access is by invitation only. <br />Contact the administrator if you need access.</p>
        </form>
      </div>
    </div>
  )
}

