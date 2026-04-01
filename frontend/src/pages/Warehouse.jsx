import { useEffect, useState } from 'react'
import { apiClient } from '../api/apiClient'

export default function Warehouse() {
  const [locations, setLocations] = useState([])
  const [sectionDetail, setSectionDetail] = useState(null)
  const [selectedSection, setSelectedSection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const fetchLocations = async () => {
      setSyncing(true)
      try {
        const response = await apiClient.get('/warehouse/locations')
        const locs = response.data?.locations || []
        setLocations(locs)
        setLastUpdate(new Date())
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
        setSyncing(false)
      }
    }
    fetchLocations()
    const pollInterval = setInterval(fetchLocations, 1000) // Poll every 1 second ⚡ ULTRA REAL-TIME
    return () => clearInterval(pollInterval) // Cleanup interval on unmount
  }, [])

  // Fetch section details when section is selected
  useEffect(() => {
    if (!selectedSection) {
      setSectionDetail(null)
      return
    }

    const fetchSectionDetail = async () => {
      try {
        const response = await apiClient.get(`/api/warehouse/section/${selectedSection}`)
        setSectionDetail(response.data)
      } catch (err) {
        console.error('Error fetching section:', err)
      }
    }
    fetchSectionDetail()
  }, [selectedSection])

  // Extract sections from location codes
  const sections = [...new Set(locations
    .map(l => {
      const loc = l.warehouse_location || ''
      return loc.split('-')[0] || 'UNKNOWN'
    })
    .filter(Boolean)
  )].sort()

  if (loading) return <div className="p-8"><p className="text-gray-600">Loading warehouse data...</p></div>
  if (error) return <div className="p-8"><p className="text-red-600">Error: {error}</p></div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">🏢 Warehouse Stock Tracking</h1>
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
      
      {/* Section Navigation */}
      <div className="mb-8 flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedSection(null)}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            selectedSection === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📊 All Sections ({locations.length})
        </button>
        {sections.map(section => {
          const count = locations.filter(l => 
            (l.warehouse_location || '').startsWith(section)
          ).length
          return (
            <button
              key={section}
              onClick={() => setSelectedSection(section)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                selectedSection === section
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🚀 Section {section} ({count})
            </button>
          )
        })}
      </div>

      {/* Main Content Area */}
      {selectedSection && sectionDetail ? (
        // Section Detail View - Show all items in section with stock tracking
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Section {selectedSection} - Detailed Stock Tracking</h2>
          
          <div className="space-y-4">
            {sectionDetail.locations && sectionDetail.locations.length > 0 ? (
              sectionDetail.locations.map((location, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">📍 {location.location}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {location.item_count} items | {location.total_qty} total quantity ordered
                      </p>
                    </div>
                  </div>

                  {/* Stock Items in this Location */}
                  {location.stock_items && location.stock_items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-semibold text-gray-600 mb-3">📦 Stock Items:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {location.stock_items.map((stock, sIdx) => (
                          <div key={sIdx} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded p-3 border border-blue-200">
                            <div className="font-mono font-bold text-blue-600 text-sm mb-1">{stock.reference}</div>
                            <div className="text-lg font-bold text-gray-800">{stock.current_stock}</div>
                            <div className="text-xs text-gray-600 mt-1">Current Stock</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No locations found in Section {selectedSection}</div>
            )}
          </div>
        </div>
      ) : !selectedSection ? (
        // Overview - All Locations Summary
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Stock Summary by Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.length > 0 ? (
              locations.map((location, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-600 hover:shadow-lg transition cursor-pointer"
                  onClick={() => setSelectedSection(location.warehouse_location.split('-')[0])}
                >
                  <div className="text-lg font-bold text-gray-800 mb-2">
                    📍 {location.warehouse_location}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-600">Items:</span>
                      <span className="font-semibold ml-2">{location.item_count}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Qty:</span>
                      <span className="font-semibold ml-2">{location.total_qty}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-blue-600 font-semibold">
                    → Click to see stock details
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No warehouse locations found
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Select a section to view detailed stock tracking
        </div>
      )}
    </div>
  )
}
