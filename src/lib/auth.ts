import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { SocialLogin } from '@capgo/capacitor-social-login'

export type AuthUser = User | null
export type AuthSession = Session | null

// Initialize Google Auth on native platforms
export async function initializeGoogleAuth() {
  if (Capacitor.isNativePlatform()) {
    await SocialLogin.initialize({
      google: {
        webClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
      },
    })
  }
}

export async function signUp(email: string, password: string): Promise<{ user: AuthUser; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { user: null, error: error.message }
  }

  return { user: data.user, error: null }
}

export async function signIn(email: string, password: string): Promise<{ user: AuthUser; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { user: null, error: error.message }
  }

  return { user: data.user, error: null }
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  // Use native Google Sign-In on Android/iOS
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await SocialLogin.login({
        provider: 'google',
        options: {
          scopes: ['email', 'profile'],
        },
      })

      if (result?.provider === 'google' && result.result.responseType === 'online') {
        const idToken = result.result.idToken
        if (!idToken) {
          return { error: 'No ID token received from Google' }
        }

        // Pass the ID token to Supabase
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        })

        if (error) {
          return { error: error.message }
        }
        return { error: null }
      }

      return { error: 'Google sign-in failed' }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Google sign-in failed' }
    }
  }

  // Web fallback - use OAuth redirect
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/login-callback`,
      skipBrowserRedirect: false,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

export async function signOut(): Promise<{ error: string | null }> {
  // Sign out of native Google session on mobile
  if (Capacitor.isNativePlatform()) {
    try {
      await SocialLogin.logout({ provider: 'google' })
    } catch {
      // Ignore errors - user might not have signed in with Google
    }
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentSession(): Promise<AuthSession> {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export function onAuthStateChange(callback: (user: AuthUser) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
}

export async function resetPassword(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}
