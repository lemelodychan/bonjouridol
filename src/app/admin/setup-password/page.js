'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import Button from '@/app/components/IconButton'
import { IoArrowForwardOutline } from 'react-icons/io5'
import styles from './page.module.scss'
import LogoDesktop from '@/app/assets/logo_croissant_pink.svg'

function SetupPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const subscriptionRef = useRef(null)

  useEffect(() => {
    checkInvitationToken()
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [])

  async function checkInvitationToken() {
    try {
      const supabase = createBrowserSupabaseClient()
      if (!supabase) {
        setError('Supabase client not available. Please check your configuration.')
        setChecking(false)
        return
      }

      // Check URL for invitation token first (before Supabase auto-processes it)
      // This needs to be done synchronously before any async operations
      let hasInvitationToken = false
      if (typeof window !== 'undefined') {
        const hash = window.location.hash
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1))
          const type = hashParams.get('type')
          if (type === 'invite') {
            hasInvitationToken = true
          }
        }
        
        // Also check query params
        const type = searchParams.get('type')
        if (type === 'invite') {
          hasInvitationToken = true
        }
      }

      // If we have an invitation token, always show password setup form
      // (Supabase will create a session automatically, but we still need to set password)
      if (hasInvitationToken) {
        // Wait a moment for Supabase to process the token and create a session
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            // User has session from invitation - show password setup form
            setTokenValid(true)
          } else {
            setError('Invalid or expired invitation link. Please contact the administrator.')
          }
          setChecking(false)
        }, 500)
        return
      }

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        // Check again for invitation token in case it was processed
        const hash = typeof window !== 'undefined' ? window.location.hash : ''
        const isInvite = hash.includes('type=invite') || searchParams.get('type') === 'invite'
        
        if (event === 'SIGNED_IN' && session && isInvite) {
          // User signed in via invitation token - show password setup form
          setTokenValid(true)
          setChecking(false)
        } else if (event === 'USER_UPDATED' && session) {
          // Password was updated, redirect to admin
          router.push('/admin/overview')
        }
      })
      
      subscriptionRef.current = subscription

      // Check if user already has a session
      const { data: { session: existingSession } } = await supabase.auth.getSession()
      if (existingSession) {
        // Check again for invitation token (might have been added to URL after page load)
        const hash = typeof window !== 'undefined' ? window.location.hash : ''
        const isInvite = hash.includes('type=invite') || searchParams.get('type') === 'invite'
        
        if (isInvite) {
          // Has invitation token - show password setup even with existing session
          setTokenValid(true)
          setChecking(false)
          return
        }
        
        // No invitation token - user already authenticated, redirect to admin
        router.push('/admin/overview')
        return
      }

      // No session and no invitation token found
      setError('No valid invitation token found. Please use the link from your invitation email.')
      setChecking(false)
    } catch (error) {
      console.error('Error checking invitation token:', error)
      setError('An error occurred while checking your invitation. Please try again or contact the administrator.')
      setChecking(false)
    }
  }

  async function handleSetupPassword(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate passwords
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    try {
      const supabase = createBrowserSupabaseClient()
      if (!supabase) {
        setError('Supabase client not available. Please check your environment variables.')
        setLoading(false)
        return
      }

      // Update user password
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        console.error('Password update error:', updateError)
        setError(updateError.message || 'Failed to set password. Please try again or contact the administrator.')
        setLoading(false)
        return
      }

      if (data.user) {
        // Password set successfully, check if we have a session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // Clear any old cache
          try {
            localStorage.removeItem('admin_stats_cache')
            localStorage.removeItem('admin_playlist_cache')
          } catch (error) {
            console.error('Error clearing cache:', error)
          }
          
          // Redirect to admin panel
          router.push('/admin/overview')
        } else {
          // Session not created, redirect to login
          setError('Password set successfully! Please log in with your new password.')
          setTimeout(() => {
            router.push('/admin')
          }, 2000)
        }
      } else {
        setError('Password update failed. Please try again.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Setup password error:', error)
      setError(error.message || 'An error occurred while setting your password. Please try again.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className={styles.setupContainer}>
        <div className={styles.setupBox}>
          <p>Verifying invitation...</p>
        </div>
      </div>
    )
  }

  if (!tokenValid && !error) {
    return (
      <div className={styles.setupContainer}>
        <div className={styles.setupBox}>
          <div className={styles.logoContainer}>
            <Image 
              src={LogoDesktop} 
              alt="BONJOUR IDOL" 
              height={44}
              priority
            />
          </div>
          <h1 className={styles.setupTitle}>Invalid Invitation</h1>
          <p className={styles.subtitle}>
            No valid invitation token found. Please use the link from your invitation email.
          </p>
          <div className={styles.buttonWrapper}>
            <Button 
              onClick={() => router.push('/admin')}
              variant="Pink"
              textValue="Go to Login"
              icon={<IoArrowForwardOutline />}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.setupContainer}>
      <div className={styles.setupBox}>
        <div className={styles.logoContainer}>
          <Image 
            src={LogoDesktop} 
            alt="BONJOUR IDOL" 
            height={44}
            priority
          />
        </div>
        <h1 className={styles.setupTitle}>Set Up Your Password</h1>
        <p className={styles.subtitle}>
          Welcome! Please create a password to access the admin panel.
        </p>
        
        <form onSubmit={handleSetupPassword} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your password (min. 6 characters)"
              minLength={6}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Confirm your password"
              minLength={6}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.buttonWrapper}>
            <Button 
              type="submit" 
              disabled={loading} 
              variant="Pink"
              textValue={loading ? 'Setting up...' : 'Set Password'}
              icon={<IoArrowForwardOutline />}
            />
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SetupPassword() {
  return (
    <Suspense fallback={
      <div className={styles.setupContainer}>
        <div className={styles.setupBox}>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <SetupPasswordContent />
    </Suspense>
  )
}

