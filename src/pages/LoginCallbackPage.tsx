import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader } from 'lucide-react'

export function LoginCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleCallback() {
      try {
        // Supabase automatically processes the session from the URL hash
        // Wait a bit for it to process, then check the session
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error processing OAuth callback:', sessionError)
          setError(sessionError.message)
          setTimeout(() => navigate('/'), 2000)
          return
        }

        if (session) {
          // Session is set, redirect to home
          navigate('/')
        } else {
          // No session yet, wait a bit more and try again
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession()
            if (retrySession) {
              navigate('/')
            } else {
              setError('Authentication failed. Please try again.')
              setTimeout(() => navigate('/'), 2000)
            }
          }, 1000)
        }
      } catch (err) {
        console.error('Error in OAuth callback:', err)
        setError('An error occurred during sign in.')
        setTimeout(() => navigate('/'), 2000)
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {error ? (
          <>
            <p className="text-destructive">{error}</p>
            <p className="text-muted-foreground text-sm">Redirecting...</p>
          </>
        ) : (
          <>
            <Loader className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Completing sign in...</p>
          </>
        )}
      </div>
    </div>
  )
}

