import { useEffect, useState } from 'react'
import { apiClient } from '../api/apiClient'

export default function Reports() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      setSyncing(true)
      try {
        const response = await apiClient.get('/reports')
        setStats(response.data)
        setLastUpdate(new Date())
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
        setSyncing(false)
      }
    }
    fetchStats()
    const pollInterval = setInterval(fetchStats, 1000) // Poll every 1 second ⚡ ULTRA REAL-TIME
    return () => clearInterval(pollInterval) // Cleanup interval on unmount
  }, [])

  if (loading) return <div className="p-8"><p className="text-gray-600">Loading reports...</p></div>
  if (error) return <div className="p-8"><p className="text-red-600">Error: {error}</p></div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📈 Reports</h1>
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
      
      <div className="grid grid-cols-2 gap-6">
        {/* Summary Stats */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Summary</h2>
          <div className="space-y-3">
            {stats && Object.entries(stats).map(([key, value]) => {
              // Format the key to be readable
              const displayKey = key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase())
              
              return (
                <div key={key} className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-700">{displayKey}</span>
                  <span className="text-2xl font-bold text-blue-600">{value}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📌 Key Metrics</h2>
          <div className="space-y-4">
            {stats && (
              <>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Average items per order</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.total_orders > 0 ? (stats.total_order_items / stats.total_orders).toFixed(1) : 0}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total warehouse capacity</div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.total_warehouse_locations || 0} locations
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Stock alerts Active</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {stats.total_stock_alerts || 0} alerts
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Detailed Statistics</h2>
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Metric</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Value</th>
            </tr>
          </thead>
          <tbody>
            {stats && Object.entries(stats).map(([key, value], idx) => {
              const displayKey = key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase())
              
              return (
                <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3 text-sm font-medium text-gray-800">{displayKey}</td>
                  <td className="px-6 py-3 text-sm font-bold text-blue-600">{value}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
