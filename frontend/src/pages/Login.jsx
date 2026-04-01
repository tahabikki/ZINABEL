import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faUser, faSignInAlt } from '@fortawesome/free-solid-svg-icons'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const result = await login(username, password)

      if (result.success) {
        setSuccess(result.message)
        // Redirect after successful login
        setTimeout(() => {
          navigate('/')
        }, 1500)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Login failed - please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] via-[#713fa8] to-[#764ba2] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <span className="text-5xl">🏭</span>
            ZINABEL
          </h1>
          <p className="text-white opacity-90 text-lg">Warehouse Management System</p>
          <p className="text-white opacity-75 text-sm mt-2">Login with your ONETECHAPP credentials</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-red-700 text-center font-medium">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 text-green-700 text-center font-medium animate-pulse space-y-2">
              <div>{success}</div>
              <div className="text-sm">🔄 Syncing with online system...</div>
              <div className="text-xs opacity-75">Redirecting to dashboard...</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-[#667eea]" />
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#667eea] focus:ring-3 focus:ring-[#667eea] focus:ring-opacity-20 bg-gray-50 font-medium transition-all duration-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faLock} className="text-[#667eea]" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#667eea] focus:ring-3 focus:ring-[#667eea] focus:ring-opacity-20 bg-gray-50 font-medium transition-all duration-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#667eea] hover:to-[#764ba2] text-white font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-lg shadow-lg"
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin">⟳</span>
                  Authenticating...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSignInAlt} />
                  Login to System
                </>
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm font-medium">
              💡 <strong>Your credentials are from:</strong> https://onetechapp.ma/sageb2b
            </p>
            <p className="text-blue-700 text-xs mt-2 opacity-80">
              The system will auto-sync with your online account every minute to keep the database up-to-date.
            </p>
          </div>

          {/* System Status */}
          <div className="text-center text-xs text-gray-500">
            <p>🔄 Real-time sync enabled</p>
            <p>🔒 Secure authentication</p>
          </div>
        </div>
      </div>
    </div>
  )
}
