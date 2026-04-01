import { Link, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRoute, faCubes, faMap, faBell, faChartBar, faSignOut, faUser } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const navLinks = [
    { to: '/', icon: faChartBar, label: 'Dashboard' },
    { to: '/collection', icon: faRoute, label: 'Collection' },
    { to: '/products', icon: faCubes, label: 'Products' },
    { to: '/warehouse', icon: faMap, label: 'Warehouse' },
    { to: '/alerts', icon: faBell, label: 'Alerts' },
  ]

  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      navigate('/login')
    }
  }

  return (
    <nav className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white sticky top-0 z-50 shadow-2xl border-b-2 border-amber-500/20">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2.5 rounded-lg group-hover:shadow-lg group-hover:from-amber-300 group-hover:to-amber-500 transition-all duration-300">
            <span className="text-xl font-black text-slate-900">Z</span>
          </div>
          <span className="text-2xl lg:text-3xl font-black bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent hidden sm:inline">
            ZINABEL
          </span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="group px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold text-base transition-all duration-300 hover:bg-amber-500/10 hover:text-amber-400 text-slate-200"
            >
              <FontAwesomeIcon icon={link.icon} className="group-hover:scale-110 transition-transform" />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* User Section - Desktop */}
        <div className="hidden lg:flex items-center gap-4">
          {user && (
            <>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-lg">
                <FontAwesomeIcon icon={faUser} className="text-amber-400" />
                <span className="font-semibold text-amber-300">{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 font-semibold transition-all duration-300 hover:scale-105"
              >
                <FontAwesomeIcon icon={faSignOut} />
                <span>Logout</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden text-amber-400 text-2xl hover:scale-110 transition-transform"
        >
          ☰
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-800/95 backdrop-blur-md border-t border-amber-500/20">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-lg flex items-center gap-3 font-semibold text-base transition-all duration-300 hover:bg-amber-500/10 hover:text-amber-400 text-slate-200"
              >
                <FontAwesomeIcon icon={link.icon} className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            ))}
            
            {/* User Section - Mobile */}
            {user && (
              <>
                <div className="border-t border-slate-700 my-3 pt-3">
                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-700/50 rounded-lg mb-2">
                    <FontAwesomeIcon icon={faUser} className="text-amber-400" />
                    <span className="font-semibold text-amber-300">{user.username}</span>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout()
                      setMobileMenuOpen(false)
                    }}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all duration-300"
                  >
                    <FontAwesomeIcon icon={faSignOut} />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
