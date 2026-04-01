import { useEffect, useState } from 'react'
import { apiClient } from '../api/apiClient'

export default function StockAlerts() {
  const [lowStock, setLowStock] = useState([])
  const [outOfStock, setOutOfStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('low')
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const fetchAlerts = async () => {
      setSyncing(true)
      try {
        const [lowRes, outRes] = await Promise.all([
          apiClient.get('/stock/low'),
          apiClient.get('/stock/out')
        ])
        setLowStock(lowRes.data || [])
        setOutOfStock(outRes.data || [])
        setLastUpdate(new Date())
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
        setSyncing(false)
      }
    }
    fetchAlerts()
    const pollInterval = setInterval(fetchAlerts, 1000) // Poll every 1 second ⚡ ULTRA REAL-TIME
    return () => clearInterval(pollInterval) // Cleanup interval on unmount
  }, [])

  const displayAlerts = activeTab === 'low' ? lowStock : outOfStock
  const isEmpty = displayAlerts.length === 0

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full mx-auto mb-4 animate-pulse"></div>
        <p className="text-xl text-slate-600 font-semibold">Loading alerts...</p>
      </div>
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-3">❌</div>
        <p className="text-xl text-red-600 font-bold">{error}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-100">
      <div className="px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-10 lg:mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-3">
                🔔 Stock Alerts
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 font-medium">Monitor low and out-of-stock items</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border-2 border-green-300 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-xs font-semibold text-green-700">Live</span>
              </div>
              <p className="text-xs text-gray-500">
                Updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 lg:mb-10 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setActiveTab('low')}
            className={`flex-1 px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 border-2 ${
              activeTab === 'low'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg border-amber-700'
                : 'bg-white text-slate-700 border-slate-300 hover:border-amber-400 hover:shadow-md'
            }`}
          >
            <span className="text-2xl mr-2">⚠️</span> Low Stock
            <span className="ml-2 bg-white/30 px-3 py-1 rounded-full text-sm font-bold">{lowStock.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('out')}
            className={`flex-1 px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 border-2 ${
              activeTab === 'out'
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg border-red-800'
                : 'bg-white text-slate-700 border-slate-300 hover:border-red-400 hover:shadow-md'
            }`}
          >
            <span className="text-2xl mr-2">❌</span> Out of Stock
            <span className="ml-2 bg-white/30 px-3 py-1 rounded-full text-sm font-bold">{outOfStock.length}</span>
          </button>
        </div>

        {/* Alerts List */}
        <div className="space-y-4 lg:space-y-5">
          {displayAlerts.length > 0 ? (
            displayAlerts.map((alert, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-6 lg:p-8 border-l-8 transition-all duration-300 hover:shadow-xl hover:scale-102 ${
                  activeTab === 'low'
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-500 shadow-lg'
                    : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-500 shadow-lg'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                  {/* Left: Product Info */}
                  <div className="md:col-span-2">
                    <div className="mb-4">
                      <div className={`text-sm font-bold uppercase tracking-widest mb-2 ${
                        activeTab === 'low' ? 'text-amber-700' : 'text-red-700'
                      }`}>
                        Product Reference
                      </div>
                      <div className="text-3xl lg:text-4xl font-black text-slate-800">{alert.reference}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-xs font-bold text-slate-600 uppercase mb-1">Location</div>
                        <div className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          📍 {alert.warehouse_location}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-600 uppercase mb-1">Last Updated</div>
                        <div className="text-lg font-semibold text-slate-700">
                          {new Date(alert.last_updated).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {alert.barcode && (
                      <div>
                        <div className="text-xs font-bold text-slate-600 uppercase mb-1">Barcode</div>
                        <code className={`text-sm font-mono font-bold px-3.5 py-2.5 rounded-lg ${
                          activeTab === 'low'
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-red-200 text-red-900'
                        }`}>
                          {alert.barcode}
                        </code>
                      </div>
                    )}
                  </div>

                  {/* Right: Stock Status */}
                  <div className={`rounded-xl p-6 text-center ${
                    activeTab === 'low'
                      ? 'bg-gradient-to-br from-amber-100 to-orange-100'
                      : 'bg-gradient-to-br from-red-100 to-pink-100'
                  }`}>
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Stock Status</div>
                    <div className={`text-5xl lg:text-6xl font-black mb-3 ${
                      activeTab === 'low' ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {alert.current_stock}
                    </div>
                    <div className="text-sm font-bold text-slate-700 mb-3">
                      Current Stock
                    </div>
                    <div className="bg-white rounded-lg p-3 mb-3">
                      <div className="text-xs text-slate-600 font-medium mb-1">Reorder Level</div>
                      <div className="text-2xl font-black text-slate-800">{alert.reorder_level}</div>
                    </div>
                    <button className={`w-full py-2.5 rounded-lg font-bold text-white text-sm transition-all hover:shadow-lg ${
                      activeTab === 'low'
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
                        : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                    }`}>
                      Place Order
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 lg:py-20">
              <div className="text-6xl mb-4">✨</div>
              <p className="text-2xl lg:text-3xl font-bold text-slate-700 mb-2">
                All Clear!
              </p>
              <p className="text-lg text-slate-600 font-medium">
                No {activeTab === 'low' ? 'low stock' : 'out of stock'} items to worry about
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
