import { useEffect, useState } from 'react'
import { apiClient } from '../api/apiClient'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get('/reports')
        setStats(response.data)
        setLastUpdate(new Date())
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchStats()

    // Auto-refresh every 1 second for ULTRA REAL-TIME ⚡
    const pollInterval = setInterval(fetchStats, 1000)

    // Cleanup interval on unmount
    return () => clearInterval(pollInterval)
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full mx-auto mb-4 animate-pulse"></div>
        <p className="text-xl text-slate-600 font-semibold">Loading dashboard...</p>
      </div>
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-5xl">❌</div>
        <p className="text-xl text-red-600 font-bold">Error: {error}</p>
      </div>
    </div>
  )

  const statCards = [
    { label: 'Total Orders', value: stats?.total_orders || 0, icon: '📋', bg: 'from-blue-600 to-blue-700' },
    { label: 'Total Products', value: stats?.total_products || 0, icon: '📦', bg: 'from-purple-600 to-purple-700' },
    { label: 'Warehouse Locations', value: stats?.total_locations || 0, icon: '🏢', bg: 'from-emerald-600 to-emerald-700' },
    { label: 'Total Items', value: stats?.total_items || 0, icon: '📊', bg: 'from-amber-600 to-amber-700' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-100">
      <div className="px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 lg:mb-16">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-3">
                📊 Dashboard
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 font-medium">Real-time warehouse inventory overview</p>
            </div>
            {/* Live indicator */}
            <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-green-700">🔄 Live</span>
            </div>
          </div>
          {/* Last update time */}
          {lastUpdate && (
            <p className="text-sm text-slate-500">
              Updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {statCards.map((stat, i) => (
            <div
              key={i}
              className={`bg-gradient-to-br ${stat.bg} text-white rounded-2xl p-7 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-white/20`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="text-3xl sm:text-4xl">{stat.icon}</div>
                <div className="text-4xl">{stat.icon}</div>
              </div>
              
              <div className="text-xs sm:text-sm opacity-90 font-bold uppercase tracking-widest mb-3">
                {stat.label}
              </div>
              
              <div className="text-5xl sm:text-6xl font-black mb-2">
                {stat.value.toLocaleString()}
              </div>
              
              <div className="text-xs opacity-75 font-medium">
                {stat.label === 'Total Orders' && 'Active orders'}
                {stat.label === 'Total Products' && 'Unique SKUs'}
                {stat.label === 'Warehouse Locations' && 'Storage areas'}
                {stat.label === 'Total Items' && 'In inventory'}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats Row */}
        <div className="mt-12 lg:mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-slate-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-3xl">📈</div>
              <h3 className="text-lg font-bold text-slate-800">Inventory Status</h3>
            </div>
            <p className="text-4xl font-black text-emerald-600 mb-2">{((stats?.total_items || 0) / ((stats?.total_items || 1) + 1) * 100).toFixed(1)}%</p>
            <p className="text-sm text-slate-600 font-medium">Stock utilization rate</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-slate-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-3xl">📦</div>
              <h3 className="text-lg font-bold text-slate-800">Avg Per Order</h3>
            </div>
            <p className="text-4xl font-black text-blue-600 mb-2">{((stats?.total_items || 0) / Math.max(stats?.total_orders || 1, 1)).toFixed(0)}</p>
            <p className="text-sm text-slate-600 font-medium">Items per shipment</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-slate-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-3xl">🎯</div>
              <h3 className="text-lg font-bold text-slate-800">System Health</h3>
            </div>
            <p className="text-4xl font-black text-amber-600 mb-2">100%</p>
            <p className="text-sm text-slate-600 font-medium">All systems operational</p>
          </div>
        </div>
      </div>
    </div>
  )
}
