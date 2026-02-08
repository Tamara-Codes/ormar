import { Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { HomePage } from './pages/HomePage'
import { AddItemPage } from './pages/AddItemPage'
import { ItemDetailPage } from './pages/ItemDetailPage'
import { PreparePostPage } from './pages/PreparePostPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { LoginPage } from './pages/LoginPage'
import { LoginCallbackPage } from './pages/LoginCallbackPage'
import { Loader } from 'lucide-react'

function AppRoutes() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Allow login-callback route even when not authenticated (during OAuth flow)
  if (location.pathname === '/login-callback') {
    return (
      <Routes>
        <Route path="/login-callback" element={<LoginCallbackPage />} />
      </Routes>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/add-item" element={<AddItemPage />} />
      <Route path="/item/:id" element={<ItemDetailPage />} />
      <Route path="/prepare-post" element={<PreparePostPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
