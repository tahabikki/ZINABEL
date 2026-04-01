import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { apiClient } from '../api/apiClient'

export default function OrderDetail() {
  const { orderNumber } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const fetchOrder = async () => {
      setSyncing(true)
      try {
        const response = await apiClient.get(`/orders/${orderNumber}`)
        setOrder(response.data)
        setLastUpdate(new Date())
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
        setSyncing(false)
      }
    }
    fetchOrder()
    const pollInterval = setInterval(fetchOrder, 1000) // Poll every 1 second ⚡ ULTRA REAL-TIME
    return () => clearInterval(pollInterval) // Cleanup interval on unmount
  }, [orderNumber])

  if (loading) return <div className="p-8"><p className="text-gray-600">Loading order...</p></div>
  if (error || !order) return (
    <div className="p-8">
      <button onClick={() => navigate(-1)} className="text-blue-600 underline mb-4">← Back</button>
      <p className="text-red-600">Error: {error || 'Order not found'}</p>
    </div>
  )

  return (
    <div className="p-8">
      <button 
        onClick={() => navigate(-1)}
        className="text-blue-600 underline mb-6 hover:text-blue-800"
      >
        ← Back to Orders
      </button>
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📋 Order: {order.order_number}</h1>
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
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-sm text-gray-600 uppercase mb-1">Client</div>
          <div className="text-2xl font-bold text-gray-800">{order.client}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-sm text-gray-600 uppercase mb-1">Order Date</div>
          <div className="text-2xl font-bold text-gray-800">{order.order_date}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-sm text-gray-600 uppercase mb-1">Status</div>
          <div className="text-2xl font-bold text-green-600">{order.status || 'Pending'}</div>
        </div>
      </div>

      {order.description && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Notes</h2>
          <p className="text-gray-700">{order.description}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Order Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold">SKU</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Product</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Quantity</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Unit Price</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 text-sm text-gray-700">{item.product_sku || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-800 font-medium">{item.product_name || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{item.quantity || 0}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">${Number(item.unit_price || 0).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm font-bold text-blue-600">
                      ${(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-4 text-center text-gray-500">
                    No items found for this order
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
