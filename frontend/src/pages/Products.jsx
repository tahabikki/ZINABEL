import { useEffect, useState } from 'react'
import { apiClient } from '../api/apiClient'

export default function Products() {
  const [products, setProducts] = useState([])
  const [stockData, setStockData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, in-stock, low-stock, out-of-stock
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // grid or table
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [syncing, setSyncing] = useState(false)

  // Fetch products with auto-polling
  useEffect(() => {
    const fetchData = async () => {
      setSyncing(true)
      try {
        const [productsRes, stockRes] = await Promise.all([
          apiClient.get('/products'),
          apiClient.get('/stock/alerts')
        ])
        setProducts(productsRes.data || [])
        setStockData(stockRes.data || [])
        setLastUpdate(new Date())
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
        setSyncing(false)
      }
    }
    fetchData()
    const pollInterval = setInterval(fetchData, 1000) // Poll every 1 second ⚡ ULTRA REAL-TIME
    return () => clearInterval(pollInterval) // Cleanup interval on unmount
  }, [])

  // Get total stock for a product
  const getTotalStock = (reference) => {
    return stockData
      .filter(s => s.reference === reference)
      .reduce((sum, s) => sum + (s.current_stock || 0), 0)
  }

  // Get stock status
  const getStockStatus = (reference) => {
    const total = getTotalStock(reference)
    if (total === 0) return 'out'
    if (total < 10) return 'low'
    return 'good'
  }

  // Smart search function - searches across all fields with fuzzy matching
  const smartSearch = (product, term) => {
    if (!term.trim()) return true
    
    const searchWords = term.toLowerCase().split(' ').filter(w => w.length > 0)
    
    const searchableText = [
      product.reference || '',
      product.description || '',
      product.barcode || '',
      getTotalStock(product.reference).toString()
    ].join(' ').toLowerCase()
    
    // Match if ANY word appears in searchable text (OR logic)
    return searchWords.some(word => searchableText.includes(word))
  }

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = smartSearch(p, searchTerm)
    
    const status = getStockStatus(p.reference)
    let matchesFilter = true
    if (filterStatus === 'in-stock') matchesFilter = status === 'good'
    if (filterStatus === 'low-stock') matchesFilter = status === 'low'
    if (filterStatus === 'out-of-stock') matchesFilter = status === 'out'
    
    return matchesSearch && matchesFilter
  })

  // Get stock locations for a product
  const getLocations = (reference) => {
    return stockData.filter(s => s.reference === reference)
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">📦</div>
        <p className="text-xl text-gray-600 font-semibold">Loading products...</p>
      </div>
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">❌</div>
        <p className="text-xl text-red-600 font-bold">Error: {error}</p>
      </div>
    </div>
  )

  const inStock = products.filter(p => getStockStatus(p.reference) === 'good').length
  const lowStock = products.filter(p => getStockStatus(p.reference) === 'low').length
  const outOfStock = products.filter(p => getStockStatus(p.reference) === 'out').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-100">
      <div className="px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-10 lg:mb-14">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-3">
                📦 Products Inventory
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 font-medium">Smart catalog with real-time stock tracking</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-2 border-green-300 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${syncing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-sm font-semibold text-green-700">Live</span>
              </div>
              <p className="text-xs text-gray-500">
                Updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 mb-10 lg:mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-3 border-blue-300 rounded-2xl p-6 lg:p-7 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="text-sm text-blue-700 font-bold uppercase tracking-wide">Total Products</div>
              <div className="text-2xl">📊</div>
            </div>
            <div className="text-4xl lg:text-5xl font-black text-blue-600">{products.length}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-3 border-green-300 rounded-2xl p-6 lg:p-7 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="text-sm text-green-700 font-bold uppercase tracking-wide">In Stock</div>
              <div className="text-2xl">✓</div>
            </div>
            <div className="text-4xl lg:text-5xl font-black text-green-600">{inStock}</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-3 border-amber-300 rounded-2xl p-6 lg:p-7 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="text-sm text-amber-700 font-bold uppercase tracking-wide">Low Stock</div>
              <div className="text-2xl">⚠️</div>
            </div>
            <div className="text-4xl lg:text-5xl font-black text-amber-600">{lowStock}</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 border-3 border-red-300 rounded-2xl p-6 lg:p-7 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="text-sm text-red-700 font-bold uppercase tracking-wide">Out of Stock</div>
              <div className="text-2xl">❌</div>
            </div>
            <div className="text-4xl lg:text-5xl font-black text-red-600">{outOfStock}</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-8 lg:mb-10 space-y-5 lg:space-y-6">
          <div className="relative group">
            <input
              type="text"
              placeholder="🔍 Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-5 sm:px-6 py-4 border-3 border-slate-300 rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-200 text-base sm:text-lg font-medium bg-white transition-all duration-300 placeholder:text-slate-400"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 lg:gap-3">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-4 rounded-xl font-bold text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 border-2 ${
                filterStatus === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-blue-500 hover:shadow-md'
              }`}
            >
              All
              <span className="ml-2 text-xs font-semibold">({products.length})</span>
            </button>
            <button
              onClick={() => setFilterStatus('in-stock')}
              className={`px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-4 rounded-xl font-bold text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 border-2 ${
                filterStatus === 'in-stock'
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg scale-105'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-green-500 hover:shadow-md'
              }`}
            >
              ✓ Stock
              <span className="ml-1 text-xs font-semibold">({inStock})</span>
            </button>
            <button
              onClick={() => setFilterStatus('low-stock')}
              className={`px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-4 rounded-xl font-bold text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 border-2 ${
                filterStatus === 'low-stock'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg scale-105'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-amber-500 hover:shadow-md'
              }`}
            >
              ⚠️ Low
              <span className="ml-1 text-xs font-semibold">({lowStock})</span>
            </button>
            <button
              onClick={() => setFilterStatus('out-of-stock')}
              className={`px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-4 rounded-xl font-bold text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 border-2 ${
                filterStatus === 'out-of-stock'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg scale-105'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-red-500 hover:shadow-md'
              }`}
            >
              ❌ Out
              <span className="ml-1 text-xs font-semibold">({outOfStock})</span>
            </button>
          </div>

          {/* View Mode */}
          <div className="flex gap-2 lg:gap-3">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 sm:flex-none px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-4 rounded-xl font-bold text-xs sm:text-sm lg:text-base transition-all duration-300 border-2 ${
                viewMode === 'grid'
                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500 hover:shadow-md'
              }`}
            >
              📊 Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 sm:flex-none px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-4 rounded-xl font-bold text-xs sm:text-sm lg:text-base transition-all duration-300 border-2 ${
                viewMode === 'table'
                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500 hover:shadow-md'
              }`}
            >
              📋 Table
            </button>
          </div>
        </div>

      {/* Products Display */}
      {viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product, idx) => {
              const totalStock = getTotalStock(product.reference)
              const status = getStockStatus(product.reference)
              const statusConfig = {
                'good': { border: 'border-green-400', bg: 'bg-gradient-to-br from-green-50 to-green-100', icon: '✓', color: 'text-green-600' },
                'low': { border: 'border-yellow-400', bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100', icon: '⚠️', color: 'text-yellow-600' },
                'out': { border: 'border-red-400', bg: 'bg-gradient-to-br from-red-50 to-red-100', icon: '❌', color: 'text-red-600' }
              }[status]
              
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedProduct(product)}
                  className={`rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-3 ${statusConfig.bg} ${statusConfig.border}`}
                >
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="text-xs text-gray-600 font-bold uppercase tracking-wide">📦 PRODUCT</div>
                        <div className="text-xl font-bold text-gray-800 break-words mt-1">{product.reference}</div>
                      </div>
                      <div className={`px-3 py-2 rounded-full text-lg font-bold text-white ${
                        status === 'good' ? 'bg-green-600' :
                        status === 'low' ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}>
                        {statusConfig.icon}
                      </div>
                    </div>
                    {product.description && (
                      <div className="text-sm text-gray-700 line-clamp-2 font-medium">{product.description}</div>
                    )}
                  </div>

                  <div className="mb-4 p-4 bg-white rounded-lg border-2 border-gray-300">
                    <div className="text-xs text-gray-600 font-bold uppercase mb-2">📊 TOTAL STOCK</div>
                    <div className={`text-3xl font-bold ${statusConfig.color}`}>{totalStock || 0}</div>
                  </div>

                  {product.barcode && (
                    <div className="text-xs text-gray-600 font-mono mb-4 bg-white p-3 rounded-lg border-2 border-gray-300 font-semibold">{product.barcode}</div>
                  )}

                  <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:shadow-lg transition text-base">
                    View Details →
                  </button>
                </div>
              )
            })
          ) : (
            <div className="col-span-full text-center py-16 text-gray-500">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-xl font-bold mb-2">No products found</p>
              <p className="text-base">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      ) : (
        // Table View
        <div className="bg-white rounded-2xl shadow-xl overflow-x-auto mb-8 border-4 border-gray-200">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white">
              <tr>
                <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">📦 Reference</th>
                <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">Description</th>
                <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">Barcode</th>
                <th className="px-6 py-5 text-center text-sm font-bold uppercase tracking-wider">Total Stock</th>
                <th className="px-6 py-5 text-center text-sm font-bold uppercase tracking-wider">Status</th>
                <th className="px-6 py-5 text-center text-sm font-bold uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product, idx) => {
                  const totalStock = getTotalStock(product.reference)
                  const status = getStockStatus(product.reference)
                  
                  return (
                    <tr key={idx} className={`border-b-2 border-gray-200 transition-colors duration-300 ${idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-100'}`}>
                      <td className="px-6 py-5 text-base font-mono font-bold text-blue-600">{product.reference}</td>
                      <td className="px-6 py-5 text-base text-gray-700 font-medium">{product.description || '-'}</td>
                      <td className="px-6 py-5 text-base text-gray-600 font-mono font-semibold">{product.barcode || '-'}</td>
                      <td className="px-6 py-5 text-center">
                        <span className="font-bold text-xl text-gray-800 bg-blue-100 px-4 py-2 rounded-lg inline-block">{totalStock || 0}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-4 py-2 rounded-full text-xs font-bold text-white whitespace-nowrap inline-block ${
                          status === 'good' ? 'bg-green-600' :
                          status === 'low' ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}>
                          {status === 'good' ? '✓ In Stock' :
                           status === 'low' ? '⚠️ Low' :
                           '❌ Out'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="text-blue-600 hover:text-blue-800 font-bold text-base hover:underline transition"
                        >
                          Details →
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 font-semibold">
                    📭 No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-center text-base text-gray-600 font-medium mt-6">
        Showing <span className="font-bold text-blue-600">{filteredProducts.length}</span> of <span className="font-bold text-blue-600">{products.length}</span> products
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-4 border-gray-200">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white p-8 flex justify-between items-center shadow-lg">
              <h2 className="text-3xl font-bold">📦 Product Details</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-white text-3xl hover:scale-125 transition-transform duration-300 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-3 border-blue-200">
                <label className="text-xs text-blue-700 font-bold uppercase tracking-widest">📦 REFERENCE</label>
                <p className="text-4xl font-bold text-blue-600 mt-2">{selectedProduct.reference}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-3 border-purple-200">
                <label className="text-xs text-purple-700 font-bold uppercase tracking-widest">📝 DESCRIPTION</label>
                <p className="text-lg text-gray-800 mt-2 font-medium">{selectedProduct.description || 'No description available'}</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-3 border-green-300">
                <label className="text-xs text-green-700 font-bold uppercase tracking-widest">📊 TOTAL STOCK</label>
                <p className="text-4xl font-bold text-green-600 mt-2">{getTotalStock(selectedProduct.reference)} units</p>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl border-3 border-gray-300">
                <label className="text-xs text-gray-700 font-bold uppercase tracking-widest">🏢 STOCK LOCATIONS</label>
                <div className="space-y-3 mt-4">
                  {getLocations(selectedProduct.reference).length > 0 ? (
                    getLocations(selectedProduct.reference).map((loc, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border-3 border-gray-300 flex justify-between items-center hover:shadow-lg transition">
                        <div className="font-mono font-bold text-lg text-gray-800">📍 {loc.warehouse_location}</div>
                        <div className="text-2xl font-bold text-blue-600 bg-blue-100 px-4 py-2 rounded-lg">{loc.current_stock} units</div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 text-base font-medium">No stock locations available</p>
                  )}
                </div>
              </div>

              {selectedProduct.barcode && (
                <div>
                  <label className="text-xs text-gray-600 font-semibold">📛 BARCODE</label>
                  <p className="font-mono text-gray-800">{selectedProduct.barcode}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
