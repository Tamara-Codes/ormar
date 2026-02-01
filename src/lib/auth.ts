import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

export type AuthUser = User | null
export type AuthSession = Session | null

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
  // Get the redirect URL based on platform
  const redirectUrl = Capacitor.isNativePlatform()
    ? 'com.ormar.mycloset://login-callback'
    : `${window.location.origin}/login-callback`

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: false,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

export async function signOut(): Promise<{ error: string | null }> {
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
