import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import CollectionCircuit from './pages/CollectionCircuit'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Warehouse from './pages/Warehouse'
import StockAlerts from './pages/StockAlerts'
import OrderDetail from './pages/OrderDetail'

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-2xl font-bold text-[#667eea]">⟳ Loading...</div>
      </div>
    )
  }

  if (!user?.authenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Main App Routes
function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-2xl font-bold text-[#667eea]">⟳ Loading...</div>
      </div>
    )
  }

  const isAuthenticated = user?.authenticated

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <Dashboard />
            </>
          </ProtectedRoute>
        }
      />
      <Route
        path="/collection"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <CollectionCircuit />
            </>
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <Products />
            </>
          </ProtectedRoute>
        }
      />
      <Route
        path="/warehouse"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <Warehouse />
            </>
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <StockAlerts />
            </>
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/:orderNumber"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <OrderDetail />
            </>
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App
