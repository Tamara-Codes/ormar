import { useState } from 'react'
import { Loader, Mail, Lock, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)

    try {
      const { error } = await signInWithGoogle()
      if (error) {
        setError(translateError(error))
      }
    } catch {
      setError('Došlo je do greške. Pokušajte ponovno.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !password) {
      setError('Molimo unesite email i lozinku')
      return
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Lozinke se ne podudaraju')
      return
    }

    if (!isLogin && password.length < 6) {
      setError('Lozinka mora imati najmanje 6 znakova')
      return
    }

    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await signIn(email, password)
        if (error) {
          setError(translateError(error))
        }
      } else {
        const { error } = await signUp(email, password)
        if (error) {
          setError(translateError(error))
        } else {
          setSuccess('Registracija uspješna! Provjerite email za potvrdu.')
        }
      }
    } catch {
      setError('Došlo je do greške. Pokušajte ponovno.')
    } finally {
      setLoading(false)
    }
  }

  const translateError = (error: string): string => {
    if (error.includes('Invalid login credentials')) {
      return 'Pogrešan email ili lozinka'
    }
    if (error.includes('User already registered')) {
      return 'Korisnik s ovim emailom već postoji'
    }
    if (error.includes('Email not confirmed')) {
      return 'Molimo potvrdite email adresu'
    }
    if (error.includes('Invalid email')) {
      return 'Nevažeća email adresa'
    }
    return error
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <svg
              className="w-16 h-16 text-primary"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
              <line x1="16" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="2" />
              <line x1="4" y1="16" x2="28" y2="16" stroke="currentColor" strokeWidth="2" />
              <line x1="4" y1="22" x2="28" y2="22" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="10" r="1.5" fill="currentColor" />
              <circle cx="20" cy="10" r="1.5" fill="currentColor" />
              <line x1="13" y1="19" x2="19" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="13" y1="25" x2="19" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground">My Closet</h1>
          <p className="text-muted-foreground mt-2">Organiziraj i prodaj svoju odjeću</p>
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full py-3 px-4 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm"
        >
          {googleLoading ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          {googleLoading ? 'Prijava...' : 'Nastavi s Google'}
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-background text-muted-foreground">ili</span>
          </div>
        </div>

        {/* Email Option Toggle */}
        <button
          onClick={() => setShowEmailForm(!showEmailForm)}
          className="w-full py-3 px-4 border border-border rounded-lg font-medium text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
        >
          <Mail className="w-5 h-5" />
          {showEmailForm ? 'Sakrij' : 'Nastavi s emailom'}
          {showEmailForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Email Form (collapsible) */}
        {showEmailForm && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Toggle Login/Signup */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  isLogin ? 'bg-primary text-white' : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                Prijava
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  !isLogin ? 'bg-primary text-white' : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                Registracija
              </button>
            </div>

            {/* Email */}
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vas@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Lozinka"
                  className="w-full pl-10 pr-12 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (signup only) */}
            {!isLogin && (
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Potvrdi lozinku"
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  {isLogin ? 'Prijava...' : 'Registracija...'}
                </>
              ) : (
                isLogin ? 'Prijavi se' : 'Registriraj se'
              )}
            </button>
          </form>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}
      </div>
    </div>
  )
}
