import { createContext, useContext, useState, useEffect } from 'react'
import { apiClient } from '../api/apiClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await apiClient.get('/auth/status')
      if (response.data.authenticated) {
        setUser({
          username: response.data.username,
          authenticated: true
        })
      }
    } catch (err) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    try {
      setError(null)
      const response = await apiClient.post('/auth/login', {
        username,
        password
      })

      if (response.data.success) {
        setUser({
          username: response.data.user.username,
          authenticated: true,
          sessionId: response.data.user.session_id
        })
        
        // Trigger immediate sync after successful login
        try {
          await apiClient.post('/sync/trigger')
          console.log('🔄 Sync triggered after login')
        } catch (syncErr) {
          console.warn('⚠️ Could not trigger sync:', syncErr.message)
        }
        
        return { success: true, message: response.data.message }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Login failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout')
      setUser(null)
      setError(null)
      return { success: true }
    } catch (err) {
      setError('Logout failed')
      return { success: false, error: 'Logout failed' }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, checkAuthStatus }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
