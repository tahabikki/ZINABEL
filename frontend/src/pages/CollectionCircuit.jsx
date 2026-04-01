import { useState, useEffect, useRef } from 'react'
import { apiClient } from '../api/apiClient'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faFolderOpen, faSearch, faPrint, faDownload, faFileInvoice } from '@fortawesome/free-solid-svg-icons'

export default function CollectionCircuit() {
  const [collapsed, setCollapsed] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [selectedSection, setSelectedSection] = useState(null)
  const [loadingItems, setLoadingItems] = useState(false)
  const [showUnlocated, setShowUnlocated] = useState(false)
  const [showNegativeStock, setShowNegativeStock] = useState(false)
  const [showZeroStock, setShowZeroStock] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const printRef = useRef(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Build URL with date filter if provided
        const url = selectedDate ? `/orders?date=${selectedDate}` : '/orders'
        const response = await apiClient.get(url)
        // API now returns {orders: [...], count: N}
        const orderIds = response.data?.orders || []
        
        // Fetch full details for each order
        const orderDetails = await Promise.all(
          orderIds.map(id =>
            apiClient.get(`/orders/${id}`).catch(() => null)
          )
        )
        
        // Filter out failed requests and extract order details
        const orderObjects = orderDetails
          .filter(res => res && res.data)
          .map(res => ({
            order_number: res.data.order_number || res.data.id,
            reference: res.data.reference || res.data.order_number,
            client: res.data.client || 'Unknown',
            order_date: res.data.order_date || 'N/A'
          }))
        
        setOrders(orderObjects)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()

    // Auto-refresh every 1 second for ULTRA REAL-TIME ⚡
    const pollInterval = setInterval(fetchOrders, 1000)
    return () => clearInterval(pollInterval)
  }, [selectedDate])

  // Fetch items for selected order
  useEffect(() => {
    if (!selectedOrder) {
      setOrderItems([])
      setSelectedSection(null)
      return
    }

    const fetchOrderItems = async () => {
      setLoadingItems(true)
      try {
        const response = await apiClient.get(`/orders/${selectedOrder.order_number}`)
        if (response.data?.items) {
          setOrderItems(response.data.items)
          // Set first section as default if available
          const sections = extractSections(response.data.items)
          if (sections.length > 0) {
            setSelectedSection(sections[0])
          }
        }
      } catch (err) {
        console.error('Error fetching order items:', err)
        setOrderItems([])
      } finally {
        setLoadingItems(false)
      }
    }
    fetchOrderItems()
  }, [selectedOrder])

  // Extract unique sections from warehouse locations
  const extractSections = (items) => {
    const sections = new Set()
    items.forEach(item => {
      if (item.warehouse_location && item.warehouse_location !== 'XXXXXX') {
        const section = item.warehouse_location.split('-')[0].trim()
        sections.add(section)
      }
    })
    return Array.from(sections).sort()
  }

  // Get items for selected section
  const getItemsInSection = () => {
    if (!selectedSection) return []
    return orderItems.filter(item => {
      if (item.warehouse_location === 'XXXXXX') return false
      const section = item.warehouse_location.split('-')[0].trim()
      return section === selectedSection
    }).sort((a, b) => a.warehouse_location.localeCompare(b.warehouse_location))
  }

  // Get unlocated items
  const getUnlocatedItems = () => {
    return orderItems.filter(item => 
      item.warehouse_location === 'XXXXXX' || !item.warehouse_location
    )
  }

  const sections = extractSections(orderItems)
  const itemsInSection = getItemsInSection()

  // Calculate order summary statistics
  const getOrderStats = () => {
    if (!orderItems || orderItems.length === 0) {
      return { totalItems: 0, totalQuantity: 0, totalReferences: 0, totalSections: 0, unlocatedItems: 0, locatedItems: 0, negativeStockItems: 0, zeroStockItems: 0 }
    }
    
    const totalItems = orderItems.length
    const totalQuantity = orderItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)
    const uniqueReferences = new Set(orderItems.map(item => item.reference)).size
    const totalSections = sections.length
    
    // Count items with valid locations vs unlocated
    const unlocatedItems = orderItems.filter(item => 
      item.warehouse_location === 'XXXXXX' || !item.warehouse_location
    ).length
    const locatedItems = totalItems - unlocatedItems
    
    // Count negative stock items
    const negativeStockItems = orderItems.filter(item => {
      const stockNum = parseInt(item.stock)
      return !isNaN(stockNum) && stockNum < 0
    }).length

    // Count zero stock items (with valid locations)
    const zeroStockItems = orderItems.filter(item => {
      const stockNum = parseInt(item.stock)
      return stockNum === 0 && item.warehouse_location && item.warehouse_location !== 'XXXXXX'
    }).length
    
    // Calculate positive items (total - problematic ones)
    const positiveItems = totalItems - (unlocatedItems + zeroStockItems + negativeStockItems)
    
    return {
      totalItems,
      totalQuantity,
      totalReferences: uniqueReferences,
      totalSections,
      unlocatedItems,
      locatedItems,
      negativeStockItems,
      zeroStockItems,
      positiveItems
    }
  }

  const orderStats = getOrderStats()

  const filteredOrders = orders.filter(o => {
    // Filter by search term
    const matchesSearch = (o.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.client || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filter by client - if selected, only show that client
    const matchesClient = !selectedClient || (o.client || '').trim() === selectedClient
    
    // Filter by date - supports both single date and date range
    let matchesDate = true
    if (selectedDate) {
      // Single date filter
      try {
        const [year, month, day] = selectedDate.split('-')
        const formattedDate = `${day}/${month}/${year}`
        matchesDate = (o.order_date || '').trim() === formattedDate
      } catch {
        matchesDate = false
      }
    } else if (dateFrom || dateTo) {
      // Date range filter
      try {
        const orderDateParts = (o.order_date || '').trim().split('/')
        if (orderDateParts.length === 3) {
          const [day, month, year] = orderDateParts
          const orderDate = new Date(`${year}-${month}-${day}`)
          
          let fromMatch = true
          let toMatch = true
          
          if (dateFrom) {
            const fromDate = new Date(dateFrom + 'T00:00:00')
            fromMatch = orderDate >= fromDate
          }
          
          if (dateTo) {
            const toDate = new Date(dateTo + 'T23:59:59')
            toMatch = orderDate <= toDate
          }
          
          matchesDate = fromMatch && toMatch
        } else {
          matchesDate = false
        }
      } catch {
        matchesDate = false
      }
    }
    
    return matchesSearch && matchesClient && matchesDate
  })

  // Get unique clients from orders
  const getUniqueClients = () => {
    const clients = new Set()
    orders.forEach(o => {
      if (o.client) {
        clients.add((o.client || '').trim())
      }
    })
    return Array.from(clients).sort()
  }

  const uniqueClients = getUniqueClients()

  // Get items with negative stock
  const getNegativeStockItems = () => {
    return orderItems.filter(item => {
      const stockNum = parseInt(item.stock)
      return !isNaN(stockNum) && stockNum < 0
    })
  }

  // Get items with zero stock (excluding unlocated items)
  const getZeroStockItems = () => {
    return orderItems.filter(item => {
      const stockNum = parseInt(item.stock)
      // Include zero stock items that have valid locations (not unlocated)
      return stockNum === 0 && item.warehouse_location && item.warehouse_location !== 'XXXXXX'
    })
  }

  // Generate PDF-friendly HTML
  // Generate beautiful collection order invoice
  const generateCollectionInvoice = () => {
    // CHECK: Order must have at least some located items
    const locatedItems = orderItems.filter(item => 
      item.warehouse_location && item.warehouse_location !== 'XXXXXX'
    )
    
    if (!orderItems || orderItems.length === 0) {
      alert('⚠️ No items in this order!\n\nLoad an order first.')
      return
    }
    
    if (locatedItems.length === 0) {
      alert('⚠️ Cannot generate PDF!\n\nThis order has NO located items.\n\nAll items are either:\n• Unlocated (XXXXXX)\n• Missing warehouse location\n\nPlease assign warehouse locations first.')
      return
    }
    
    const formatStock = (val) => {
      if (val === null || val === undefined || val === '') return '0'
      const stockNum = parseInt(val)
      return isNaN(stockNum) ? '0' : stockNum.toString()
    }

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Collection Order Invoice - ${selectedOrder.order_number}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', 'Tahoma', 'Geneva', 'Verdana', sans-serif; background: #f5f5f5; line-height: 1.5; color: #333; overflow-x: hidden; padding: 25px 15px; }
          
          .invoice-container { width: 700px; margin: 0 auto; background: white; padding: 25px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; }
          
          .invoice-header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 18px; 
            border-radius: 8px 8px 0 0;
            text-align: center;
            margin-bottom: 0;
          }
          
          .invoice-header h1 { font-size: 26px; margin-bottom: 6px; letter-spacing: 0.5px; }
          .invoice-header p { font-size: 12px; opacity: 0.9; }
          
          .invoice-meta { 
            display: grid; 
            grid-template-columns: 1fr 1fr 1fr; 
            gap: 15px; 
            padding: 18px;
            background: #f8f9fa;
            border-bottom: 2px solid #e0e0e0;
            margin-bottom: 20px;
          }
          
          .meta-item label { font-size: 10px; font-weight: bold; color: #667eea; text-transform: uppercase; display: block; margin-bottom: 5px; }
          .meta-item value { font-size: 14px; font-weight: bold; color: #333; display: block; }
          
          .content { padding: 18px; }
          
          .section { margin-bottom: 22px; page-break-inside: avoid; }
          .section-title { 
            background: #667eea; 
            color: white; 
            padding: 12px 16px; 
            font-size: 14px; 
            font-weight: bold; 
            border-radius: 5px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 11px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-radius: 5px;
            overflow: hidden;
            table-layout: fixed;
            margin-bottom: 15px;
          }
          
          .items-table th { 
            background: linear-gradient(135deg, #f0f0f0 0%, #e8e8e8 100%); 
            padding: 10px 12px; 
            text-align: left; 
            font-weight: bold; 
            border-bottom: 2px solid #667eea; 
            font-size: 10px; 
            color: #333;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .items-table td { 
            padding: 8px 10px; 
            border-bottom: 1px solid #e0e0e0;
            word-wrap: break-word;
            word-break: break-word;
          }
          
          .items-table tr:hover { background: #f9f9f9; }
          .items-table tr:nth-child(even) { background: #fafafa; }
          
          .location { font-weight: bold; color: #667eea; font-family: 'Courier New', monospace; font-size: 11px; }
          .quantity { font-weight: bold; color: #28a745; font-size: 11px; }
          .stock { color: #0066cc; font-weight: bold; font-size: 10px; }
          .stock-negative { color: #dc3545; font-weight: bold; background: #fff0f0; padding: 2px 4px; border-radius: 2px; font-size: 10px; }
          .stock-zero { color: #ff9800; font-weight: bold; font-size: 10px; }
          .product-ref { font-weight: bold; color: #333; font-size: 11px; }
          .description { color: #666; font-size: 9px; }
          
          .total-row { 
            background: #e8f5e9; 
            font-weight: bold; 
            border-top: 2px solid #28a745;
            border-bottom: 2px solid #28a745;
          }
          
          .alert-section {
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 18px;
            font-size: 11px;
          }
          
          .alert-section strong { color: #d39e00; }
          
          .summary-section { 
            background: linear-gradient(135deg, #f0f4ff 0%, #f5f0ff 100%);
            border: 2px solid #667eea;
            border-radius: 6px;
            padding: 18px;
            margin-top: 25px;
            margin-bottom: 20px;
          }
          
          .summary-title { 
            font-size: 14px; 
            font-weight: bold; 
            color: #667eea; 
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          
          .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 12px;
          }
          
          .summary-item {
            text-align: center;
            padding: 12px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          
          .summary-item label { 
            font-size: 9px; 
            color: #666; 
            text-transform: uppercase;
            font-weight: bold;
            display: block;
            margin-bottom: 5px;
          }
          
          .summary-item value { 
            font-size: 18px; 
            font-weight: bold; 
            color: #667eea; 
            display: block;
          }
          
          .footer {
            text-align: center;
            margin-top: 25px;
            padding-top: 15px;
            border-top: 2px solid #e0e0e0;
            font-size: 10px;
            color: #999;
          }
          
          .print-only {
            display: none;
          }
          
          @media print {
            body { padding: 0; }
            .print-only { display: block; }
            .no-print { display: none; }
            .invoice-container { box-shadow: none; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div style="background: white; padding: 20px; text-align: center; border-bottom: 2px solid #667eea; margin-bottom: 20px;">
          <button onclick="generatePDF()" style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 40px;
            font-size: 16px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            📥 DOWNLOAD PDF
          </button>
          <p style="margin-top: 10px; color: #666; font-size: 12px;">Click the button above to download the invoice as PDF</p>
        </div>

        <div id="invoice" class="invoice-container">
          <div class="invoice-header">
            <h1>📦 COLLECTION ORDER INVOICE</h1>
            <p>Warehouse Picking Guide</p>
          </div>

          <div class="invoice-meta">
            <div class="meta-item">
              <label>Order Number</label>
              <value>${selectedOrder.order_number}</value>
            </div>
            <div class="meta-item">
              <label>Client</label>
              <value>${selectedOrder.client}</value>
            </div>
            <div class="meta-item">
              <label>Date</label>
              <value>${selectedOrder.order_date}</value>
            </div>
          </div>

          <div class="content">
            ${sections.map(section => {
              const sectionItems = orderItems.filter(item => {
                if (item.warehouse_location === 'XXXXXX' || !item.warehouse_location) return false
                const itemSection = item.warehouse_location.split('-')[0].trim()
                return itemSection === section
              }).sort((a, b) => a.warehouse_location.localeCompare(b.warehouse_location))

              const sectionQty = sectionItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)

              return `
                <div class="section">
                  <div class="section-title">
                    <span>🏢 SECTION ${section}</span>
                    <span>${sectionItems.length} items | Qty: ${sectionQty}</span>
                  </div>
                  <table class="items-table">
                    <thead>
                      <tr>
                        <th style="width: 25%;">📍 Location</th>
                        <th style="width: 14%;">📦 Product</th>
                        <th style="width: 36%;">📝 Description</th>
                        <th style="width: 8%;">📈 Qty</th>
                        <th style="width: 8%;">📊 Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${sectionItems.map((item, idx) => {
                        const stockVal = formatStock(item.stock)
                        const stockNum = parseInt(stockVal)
                        let stockClass = 'stock'
                        if (stockNum < 0) stockClass = 'stock-negative'
                        else if (stockNum === 0) stockClass = 'stock-zero'
                        
                        return `
                        <tr>
                          <td class="location">${item.warehouse_location}</td>
                          <td class="product-ref">${item.reference}</td>
                          <td class="description">${item.description || 'N/A'}</td>
                          <td class="quantity">${item.quantity}</td>
                          <td class="${stockClass}">${stockVal}</td>
                        </tr>
                      `}).join('')}
                      <tr class="total-row">
                        <td colspan="3" style="text-align: right;">SECTION ${section} TOTAL:</td>
                        <td>${sectionQty}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              `
            }).join('')}

            ${getUnlocatedItems().length > 0 ? `
              <div class="section">
                <div class="section-title" style="background: #dc3545;">
                  ⚠️ UNLOCATED ITEMS (${getUnlocatedItems().length})
                </div>
                <table class="items-table">
                  <thead>
                    <tr>
                      <th style="width: 18%;">📦 Product</th>
                      <th style="width: 58%;">📝 Description</th>
                      <th style="width: 10%;">📈 Qty</th>
                      <th style="width: 10%;">📊 Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${getUnlocatedItems().map(item => {
                      const stockVal = formatStock(item.stock)
                      const stockNum = parseInt(stockVal)
                      let stockClass = 'stock'
                      if (stockNum < 0) stockClass = 'stock-negative'
                      else if (stockNum === 0) stockClass = 'stock-zero'
                      
                      return `
                      <tr style="background: #fff5f5;">
                        <td class="product-ref">${item.reference}</td>
                        <td class="description">${item.description || 'N/A'}</td>
                        <td class="quantity">${item.quantity}</td>
                        <td class="${stockClass}">${stockVal}</td>
                      </tr>
                    `}).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            ${getNegativeStockItems().length > 0 ? `
              <div class="alert-section">
                <strong>⚠️ NEGATIVE STOCK ALERT (${getNegativeStockItems().length} items):</strong>
                <div style="margin-top: 8px;">
                  ${getNegativeStockItems().map(item => `${item.reference} (${item.stock})`).join(', ')}
                </div>
                <div style="margin-top: 8px; font-size: 12px;">Check these items carefully. Consider alternative sources or customer backorders.</div>
              </div>
            ` : ''}

            ${getZeroStockItems().length > 0 ? `
              <div class="alert-section" style="background: #f0f8ff; border-color: #0066cc;">
                <strong style="color: #0066cc;">⚠️ ZERO STOCK ITEMS (${getZeroStockItems().length} items):</strong>
                <div style="margin-top: 8px;">
                  ${getZeroStockItems().map(item => `${item.reference}`).join(', ')}
                </div>
                <div style="margin-top: 8px; font-size: 12px;">These items have no stock available. Verify with management.</div>
              </div>
            ` : ''}

            <div class="summary-section">
              <div class="summary-title">📊 COLLECTION SUMMARY</div>
              <div class="summary-grid">
                <div class="summary-item">
                  <label>Total Items</label>
                  <value>${orderStats.totalItems}</value>
                </div>
                <div class="summary-item">
                  <label>Total Quantity</label>
                  <value>${orderStats.totalQuantity}</value>
                </div>
                <div class="summary-item">
                  <label>Sections</label>
                  <value>${orderStats.totalSections}</value>
                </div>
                <div class="summary-item">
                  <label>References</label>
                  <value>${orderStats.totalReferences}</value>
                </div>
              </div>
            </div>

            <div class="footer">
              <p>Generated: ${new Date().toLocaleString()}</p>
              <p style="margin-top: 8px;">📋 Follow the sections and locations in order to collect items efficiently without backtracking</p>
              <p style="margin-top: 8px; font-style: italic;">ZINABEL - Professional Warehouse Management System</p>
            </div>
          </div>
        </div>

        <div class="print-only" style="margin-top: 50px; page-break-before: always; text-align: center; color: #999;">
          <p>--- End of Collection Order Invoice ---</p>
        </div>
      </body>
      <script>
        function generatePDF() {
          console.log('� Starting PDF generation...')
          const element = document.getElementById('invoice')
          
          if (!element) {
            console.error('❌ Invoice element not found!')
            alert('❌ Error: Invoice content not found.')
            return
          }
          
          console.log('Generating PDF now')
          
          html2pdf()
            .set({
              margin: [15, 12, 15, 12],           // A4 margins in mm (top, left, bottom, right)
              filename: 'Collection-Invoice.pdf',
              image: { type: 'png', quality: 0.95 },
              html2canvas: { 
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: 744,                 // Adjusted for 700px container
                windowHeight: 1050,
                logging: false,
                allowTaint: true
              },
              jsPDF: { 
                orientation: 'portrait', 
                unit: 'mm', 
                format: 'a4',
                compress: true
              }
            })
            .from(element)
            .save()
            .then(() => alert('✅ PDF downloaded successfully!'))
            .catch(err => alert('Error: ' + err.message))
        }
        
        // Don't auto-generate - let user click button
        console.log('✅ Invoice loaded. Click the button to download PDF.')
        
        // ✅ CORRECT FIX: Use window.onload to wait for full page render
        window.addEventListener('load', () => {
          console.log('✅ Page fully rendered! Auto-generating PDF in 500ms...')
          setTimeout(generatePDF, 500)
        })
      <\/script>
      </html>
    `

    // ✅ BROWSER PDF GENERATION (html2pdf.js - No Backend Needed!)
    console.log('📂 Opening invoice in new window...')
    console.log('   📊 HTML size:', Math.round(invoiceHtml.length / 1024), 'KB')
    
    // Open new window at exact A4 size (794px = 210mm at 96 DPI)
    const invoiceWindow = window.open('', '_blank', 'width=820,height=1200,resizable=yes')
    
    if (invoiceWindow) {
      invoiceWindow.document.write(invoiceHtml)
      invoiceWindow.document.close()
      
      console.log('✅ Invoice window opened successfully!')
      console.log('   📄 You can now download the PDF using the button in the new window')
    } else {
      console.error('❌ Failed to open window - browser may have blocked it')
      alert('❌ Could not open invoice window.\n\nPlease enable pop-ups for this site and try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#667eea] via-[#713fa8] to-[#764ba2] text-white px-4 md:px-6 py-6 md:py-8 shadow-xl sticky top-0 z-40">
        <div className="max-w-full">
          <h1 className="text-2xl md:text-4xl font-bold mb-2 flex items-center gap-2 md:gap-3">
            <FontAwesomeIcon icon={faChevronRight} className="animate-pulse text-lg md:text-2xl" /> Picking Route Optimizer
          </h1>
          <p className="opacity-90 text-sm md:text-lg hidden sm:block">Efficiently navigate warehouse sections. Mark items as collected.</p>
        </div>
      </div>

      <div className="flex flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {/* LEFT SIDEBAR - Orders List */}
        <div
          className={`
            transition-all duration-500 ease-in-out flex flex-col
            ${collapsed 
              ? 'w-16 md:w-20 bg-gradient-to-b from-[#667eea] via-[#713fa8] to-[#764ba2] shadow-2xl rounded-r-3xl' 
              : 'w-full sm:w-64 md:w-72 lg:w-80 bg-white shadow-xl border-r-4 border-gray-200'}
            ${collapsed ? '' : 'border-b sm:border-b-0 sm:border-r-4'}
            hidden sm:flex
          `}
        >
          {/* Header with Collapse Button */}
          {!collapsed && (
            <div className="p-4 sm:p-6 border-b-4 border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center gap-2 sm:gap-3 text-[#667eea] font-bold text-sm sm:text-lg">
                <FontAwesomeIcon icon={faFolderOpen} size="lg" />
                <span>Orders</span>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white rounded-full hover:scale-125 transition-transform duration-300 shadow-lg hover:shadow-xl text-xs sm:text-base"
                title="Collapse orders list"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
            </div>
          )}

          {/* Search & Filter Section */}
          {!collapsed && (
            <div className="bg-white border-b-2 border-gray-200 p-3 sm:p-4 md:p-5 space-y-4">
              {/* Search Input */}
              <div className="relative group">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-4 top-2.5 sm:top-3.5 text-gray-400 group-focus-within:text-[#667eea] transition text-sm"
                />
                <input
                  type="text"
                  placeholder="🔍 Search by order or client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:border-[#667eea] focus:ring-3 focus:ring-[#667eea] focus:ring-opacity-20 bg-gray-50 font-medium text-sm transition-all duration-300"
                />
              </div>

              {/* Date Filter Section - Cleaner Design */}
              <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 p-4 sm:p-5 rounded-xl border-2 border-blue-200 space-y-4">
                {/* Label */}
                <div className="flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Filter by Date</label>
                </div>
                
                {/* Date Range Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600">From - To</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        placeholder="From"
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-[#667eea] focus:ring-3 focus:ring-[#667eea] focus:ring-opacity-20 bg-white font-medium text-sm transition-all duration-300 cursor-pointer"
                        title="Start date"
                      />
                    </div>
                    <div>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        placeholder="To"
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-[#667eea] focus:ring-3 focus:ring-[#667eea] focus:ring-opacity-20 bg-white font-medium text-sm transition-all duration-300 cursor-pointer"
                        title="End date"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Select Buttons - Stacked Vertically */}
                <div className="space-y-2">
                  {(() => {
                    const today = new Date().toISOString().split('T')[0]
                    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
                    const sevenDaysAgo = new Date(Date.now() - 604800000).toISOString().split('T')[0]
                    
                    const isToday = selectedDate === today
                    const isYesterday = selectedDate === yesterday
                    const isLast7Days = dateFrom === sevenDaysAgo && dateTo === today
                    const isAll = !selectedDate && !dateFrom && !dateTo
                    
                    return (
                      <>
                        <button
                          onClick={() => {
                            setSelectedDate(today)
                            setDateFrom('')
                            setDateTo('')
                          }}
                          title="Show today's orders"
                          className={`w-full px-3 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                            isToday
                              ? 'bg-green-500 text-white shadow-lg' 
                              : 'bg-white text-green-600 border-2 border-green-300 hover:bg-green-50'
                          }`}
                        >
                          📆 Today
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDate(yesterday)
                            setDateFrom('')
                            setDateTo('')
                          }}
                          title="Show yesterday's orders"
                          className={`w-full px-3 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                            isYesterday
                              ? 'bg-orange-500 text-white shadow-lg' 
                              : 'bg-white text-orange-600 border-2 border-orange-300 hover:bg-orange-50'
                          }`}
                        >
                          ← Yesterday
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDate('')
                            setDateFrom(sevenDaysAgo)
                            setDateTo(today)
                          }}
                          title="Show orders from last 7 days"
                          className={`w-full px-3 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                            isLast7Days
                              ? 'bg-blue-500 text-white shadow-lg' 
                              : 'bg-white text-blue-600 border-2 border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          📊 Last 7 Days
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDate('')
                            setDateFrom('')
                            setDateTo('')
                          }}
                          title="Show all orders"
                          className={`w-full px-3 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                            isAll
                              ? 'bg-purple-500 text-white shadow-lg' 
                              : 'bg-white text-purple-600 border-2 border-purple-300 hover:bg-purple-50'
                          }`}
                        >
                          🔄 All Orders
                        </button>
                      </>
                    )
                  })()}
                </div>

                {/* Clear Button - Clean & Centered - After All Orders */}
                {(selectedDate || dateFrom || dateTo) && (
                  <div className="text-center">
                    <button
                      onClick={() => {
                        setSelectedDate('')
                        setDateFrom('')
                        setDateTo('')
                      }}
                      className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all duration-200 text-sm"
                    >
                      ✕ Clear Filter
                    </button>
                  </div>
                )}

                {/* Selected Date Summary - Compact */}
                {(selectedDate || dateFrom || dateTo) && (
                  <div className="px-3 py-2 bg-white rounded-lg border-2 border-green-300 text-center">
                    {selectedDate ? (
                      <>
                        <p className="text-xs text-gray-500">Selected Date:</p>
                        <p className="text-sm font-bold text-green-600 mt-0.5">
                          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: '2-digit'
                          })}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500">Date Range:</p>
                        <p className="text-sm font-bold text-green-600 mt-0.5">
                          {dateFrom ? new Date(dateFrom + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'From'} → {dateTo ? new Date(dateTo + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'To'}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Client Filter Section */}
                <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 p-4 sm:p-5 rounded-xl border-2 border-purple-200 space-y-3">
                  {/* Label */}
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Select Client</label>
                  </div>

                  {/* Custom Scrollable Client Dropdown */}
                  <div className="relative">
                    {/* Trigger Button */}
                    <button
                      onClick={() => setShowClientDropdown(!showClientDropdown)}
                      className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg bg-white font-medium text-sm transition-all duration-300 cursor-pointer hover:border-purple-500 hover:bg-purple-50 flex items-center justify-between"
                    >
                      <span>
                        {selectedClient ? (
                          <span className="text-purple-600 font-bold">{selectedClient}</span>
                        ) : (
                          <span className="text-gray-500">🔄 All Clients</span>
                        )}
                      </span>
                      <span className={`transform transition-transform duration-300 ${showClientDropdown ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>

                    {/* Scrollable Client List */}
                    {showClientDropdown && (
                      <div className="absolute top-14 left-0 right-0 bg-white border-2 border-purple-300 rounded-lg shadow-2xl z-50 overflow-hidden">
                        {/* "All Clients" Option */}
                        <button
                          onClick={() => {
                            setSelectedClient('')
                            setShowClientDropdown(false)
                          }}
                          className={`w-full px-4 py-3 text-sm font-bold text-left transition-all duration-200 ${
                            !selectedClient
                              ? 'bg-purple-500 text-white'
                              : 'bg-white text-gray-700 hover:bg-purple-50'
                          }`}
                        >
                          🔄 All Clients
                        </button>

                        {/* Scrollable List */}
                        <div className="max-h-64 overflow-y-auto border-t-2 border-purple-200">
                          {uniqueClients.map((client) => (
                            <button
                              key={client}
                              onClick={() => {
                                setSelectedClient(client)
                                setShowClientDropdown(false)
                              }}
                              className={`w-full px-4 py-3 text-sm font-semibold text-left transition-all duration-200 border-b border-purple-100 ${
                                selectedClient === client
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-white text-gray-700 hover:bg-purple-50'
                              }`}
                            >
                              👤 {client}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Overlay to close dropdown */}
                    {showClientDropdown && (
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowClientDropdown(false)}
                      />
                    )}
                  </div>

                  {/* Selected Client Summary */}
                  {selectedClient && (
                    <div className="px-3 py-2 bg-white rounded-lg border-2 border-purple-300 text-center">
                      <p className="text-xs text-gray-500">Selected Client:</p>
                      <p className="text-sm font-bold text-purple-600 mt-0.5">
                        {selectedClient}
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Orders List */}
          {!collapsed && (
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
              {/* Date & Client Filter Indicator */}
              {(selectedDate || dateFrom || dateTo || selectedClient || filteredOrders.length > 0) && (
                <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white shadow-lg mb-3 space-y-2">
                  {(selectedDate || dateFrom || dateTo) && (
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <span>📅</span>
                      {selectedDate ? (
                        <span>
                          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: '2-digit'
                          })}
                        </span>
                      ) : (
                        <span>
                          {dateFrom ? new Date(dateFrom + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'From'} → {dateTo ? new Date(dateTo + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'To'}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {selectedClient && (
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <span>👤</span>
                      <span className="bg-white bg-opacity-20 px-2 py-1 rounded">
                        {selectedClient}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <span>📊 Total:</span>
                    <span className="bg-green-400 text-green-900 px-3 py-1 rounded-full font-extrabold">
                      {filteredOrders.length}
                    </span>
                    <span className="text-blue-100">({filteredOrders.length === 1 ? 'order' : 'orders'})</span>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="p-6 text-center text-gray-500 text-sm font-medium">⏳ Loading orders...</div>
              ) : error ? (
                <div className="p-6 text-center text-red-500 text-sm font-bold">❌ Error: {error}</div>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`
                      p-3 sm:p-4 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-102
                      ${
                        selectedOrder?.id === order.id
                          ? 'bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-xl scale-100'
                          : 'bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 hover:shadow-md border-2 border-transparent hover:border-[#667eea]'
                      }
                    `}
                  >
                    <div className="font-bold text-xs sm:text-sm md:text-base truncate flex items-center gap-1 sm:gap-2">
                      <span className="text-base sm:text-lg">📦</span>
                      {order.order_number}
                    </div>
                    <div className={`text-xs mt-1 sm:mt-2 opacity-80 font-medium truncate flex items-center gap-1`}>
                      <span>👤</span> <span className="truncate">{order.client}</span>
                    </div>
                    <div className={`text-xs opacity-70 font-medium flex items-center gap-1 truncate`}>
                      <span>📅</span> {order.order_date}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500 text-sm font-medium">❌ No orders found</div>
              )}
            </div>
          )}

          {/* Collapsed Label - Arrow Button */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="flex flex-col items-center justify-center gap-3 py-8 text-white hover:scale-110 transition-transform duration-300 h-full font-bold"
              title="Expand orders list"
            >
              <FontAwesomeIcon icon={faChevronRight} size="xl" className="text-white" />
              <div className="text-[11px] font-bold text-center px-2" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                ORDERS
              </div>
            </button>
          )}
        </div>

        {/* RIGHT PANEL - Route Details */}
        <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl p-4 sm:p-6 md:p-8 border-2 sm:border-4 border-gray-200">
            {selectedOrder ? (
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
                    📦 Order: <span className="text-[#667eea]">{selectedOrder.order_number}</span>
                  </h2>
                  <div className="text-3xl sm:text-4xl">🎯</div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-10">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl border-2 border-blue-200 hover:shadow-lg transition">
                    <div className="text-xs sm:text-sm text-gray-700 mb-2 font-bold">👤 CLIENT</div>
                    <div className="text-lg sm:text-2xl md:text-2xl font-bold text-[#667eea] truncate">{selectedOrder.client}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl border-2 border-purple-200 hover:shadow-lg transition">
                    <div className="text-xs sm:text-sm text-gray-700 mb-2 font-bold">📅 DATE</div>
                    <div className="text-lg sm:text-2xl md:text-2xl font-bold text-purple-600 truncate">{selectedOrder.order_date}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl border-2 border-green-200 hover:shadow-lg transition">
                    <div className="text-xs sm:text-sm text-gray-700 mb-2 font-bold">✅ STATUS</div>
                    <div className="text-lg sm:text-2xl md:text-2xl font-bold text-green-600">{selectedOrder.status || 'Pending'}</div>
                  </div>
                </div>

                {/* Order Summary Stats - Enhanced WOW Design */}
                {orderItems.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-10 rounded-2xl sm:rounded-3xl border-2 border-slate-700 shadow-2xl mb-8 sm:mb-10 relative overflow-hidden">
                    {/* Background accent */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -z-0"></div>
                    <div className="relative z-10">
                      <p className="text-sm sm:text-lg font-bold text-white mb-6 flex items-center gap-3">
                        <span className="text-3xl sm:text-4xl">📊</span> 
                        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Order Summary</span>
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
                        {/* Total Items */}
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 sm:p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-default">
                          <div className="text-xs sm:text-sm text-blue-100 font-bold uppercase tracking-widest mb-2">📦 Total Items</div>
                          <div className="text-4xl sm:text-5xl font-black text-white">{orderStats.totalItems}</div>
                        </div>

                        {/* Located Items */}
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 sm:p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-default">
                          <div className="text-xs sm:text-sm text-green-100 font-bold uppercase tracking-widest mb-2">✓ Located</div>
                          <div className="text-4xl sm:text-5xl font-black text-white">{orderStats.locatedItems}</div>
                        </div>

                        {/* Positive Items (Available for Picking) */}
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 sm:p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-default">
                          <div className="text-xs sm:text-sm text-emerald-100 font-bold uppercase tracking-widest mb-2">✅ Positive Items</div>
                          <div className="text-4xl sm:text-5xl font-black text-white">{orderStats.positiveItems}</div>
                        </div>

                        {/* Unlocated Items */}
                        {orderStats.unlocatedItems > 0 && (
                          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 sm:p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-default">
                            <div className="text-xs sm:text-sm text-red-100 font-bold uppercase tracking-widest mb-2">⚠️ Unlocated</div>
                            <div className="text-4xl sm:text-5xl font-black text-white">{orderStats.unlocatedItems}</div>
                          </div>
                        )}

                        {/* Total Quantity */}
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 sm:p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-default">
                          <div className="text-xs sm:text-sm text-purple-100 font-bold uppercase tracking-widest mb-2">📈 Total Qty</div>
                          <div className="text-4xl sm:text-5xl font-black text-white">{orderStats.totalQuantity}</div>
                        </div>

                        {/* Total Sections */}
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 sm:p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-default">
                          <div className="text-xs sm:text-sm text-indigo-100 font-bold uppercase tracking-widest mb-2">🏢 Sections</div>
                          <div className="text-4xl sm:text-5xl font-black text-white">{orderStats.totalSections}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Unlocated Items Warning */}
                {orderStats.unlocatedItems > 0 && (
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 sm:p-6 rounded-lg sm:rounded-xl border-2 border-red-400 shadow-md mb-8 sm:mb-10">
                    <button
                      onClick={() => setShowUnlocated(!showUnlocated)}
                      className="w-full flex items-center justify-between text-left hover:opacity-80 transition"
                    >
                      <p className="text-xs sm:text-sm font-bold text-red-700 flex items-center gap-2">
                        <span className="text-lg sm:text-2xl">⚠️</span> 
                        {orderStats.unlocatedItems} Item{orderStats.unlocatedItems > 1 ? 's' : ''} Missing Location
                      </p>
                      <span className={`text-xl text-red-600 transition-transform ${showUnlocated ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>

                    {/* Unlocated Items List */}
                    {showUnlocated && (
                      <div className="mt-4 space-y-3 pt-4 border-t-2 border-red-300">
                        {getUnlocatedItems().map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-white rounded-lg p-3 sm:p-4 border-l-4 border-red-500 shadow-sm"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                              <div>
                                <div className="text-xs text-gray-600 font-bold uppercase">📦 Product</div>
                                <div className="text-sm sm:text-base font-bold text-gray-800 mt-1">{item.reference}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600 font-bold uppercase">📝 Description</div>
                                <div className="text-xs sm:text-sm text-gray-700 mt-1 line-clamp-2">{item.description || 'N/A'}</div>
                              </div>
                              <div className="flex gap-3">
                                <div>
                                  <div className="text-xs text-gray-600 font-bold uppercase">Qty</div>
                                  <div className="text-lg sm:text-xl font-bold text-red-600 mt-1">{item.quantity}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-600 font-bold uppercase">Stock</div>
                                  <div className="text-lg sm:text-xl font-bold text-blue-600 mt-1">{item.stock || '0'}</div>
                                </div>
                              </div>
                            </div>
                            {item.barcode && (
                              <div className="mt-2 pt-2 border-t text-xs text-gray-600 font-mono">
                                Barcode: {item.barcode}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Negative Stock Warning */}
                {orderStats.negativeStockItems > 0 && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 sm:p-6 rounded-lg sm:rounded-xl border-2 border-yellow-400 shadow-md mb-8 sm:mb-10">
                    <button
                      onClick={() => setShowNegativeStock(!showNegativeStock)}
                      className="w-full flex items-center justify-between text-left hover:opacity-80 transition"
                    >
                      <p className="text-xs sm:text-sm font-bold text-yellow-800 flex items-center gap-2">
                        <span className="text-lg sm:text-2xl">⚠️</span> 
                        {orderStats.negativeStockItems} Item{orderStats.negativeStockItems > 1 ? 's' : ''} {orderStats.negativeStockItems > 1 ? 'have' : 'has'} Negative Stock
                      </p>
                      <span className={`text-xl text-yellow-600 transition-transform ${showNegativeStock ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>

                    {/* Negative Stock Items List */}
                    {showNegativeStock && (
                      <div className="mt-4 space-y-3 pt-4 border-t-2 border-yellow-300">
                        {getNegativeStockItems().map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-white rounded-lg p-3 sm:p-4 border-l-4 border-yellow-500 shadow-sm"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                              <div>
                                <div className="text-xs text-gray-600 font-bold uppercase">📦 Product</div>
                                <div className="text-sm sm:text-base font-bold text-gray-800 mt-1">{item.reference}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600 font-bold uppercase">📝 Description</div>
                                <div className="text-xs sm:text-sm text-gray-700 mt-1 line-clamp-2">{item.description || 'N/A'}</div>
                              </div>
                              <div className="flex gap-3">
                                <div>
                                  <div className="text-xs text-gray-600 font-bold uppercase">Qty</div>
                                  <div className="text-lg sm:text-xl font-bold text-orange-600 mt-1">{item.quantity}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-600 font-bold uppercase">Stock</div>
                                  <div className="text-lg sm:text-xl font-bold text-red-600 mt-1">{item.stock}</div>
                                </div>
                              </div>
                            </div>
                            {item.warehouse_location && item.warehouse_location !== 'XXXXXX' && (
                              <div className="mt-2 pt-2 border-t text-xs text-gray-600 font-mono">
                                Location: {item.warehouse_location}
                              </div>
                            )}
                            {item.barcode && (
                              <div className="mt-1 text-xs text-gray-600 font-mono">
                                Barcode: {item.barcode}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Zero Stock Items */}
                {orderStats.zeroStockItems > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 sm:p-6 rounded-lg sm:rounded-xl border-2 border-blue-400 shadow-md mb-8 sm:mb-10">
                    <button
                      onClick={() => setShowZeroStock(!showZeroStock)}
                      className="w-full flex items-center justify-between text-left hover:opacity-80 transition"
                    >
                      <p className="text-xs sm:text-sm font-bold text-blue-800 flex items-center gap-2">
                        <span className="text-lg sm:text-2xl">📭</span>
                        {orderStats.zeroStockItems} Item{orderStats.zeroStockItems > 1 ? 's' : ''} {orderStats.zeroStockItems > 1 ? 'have' : 'has'} Zero Stock
                      </p>
                      <span className={`text-xl text-blue-600 transition-transform ${showZeroStock ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>

                    {/* Zero Stock Items List */}
                    {showZeroStock && (
                      <div className="mt-4 space-y-3 pt-4 border-t-2 border-blue-300">
                        {getZeroStockItems().map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-white rounded-lg p-3 sm:p-4 border-l-4 border-blue-500 shadow-sm"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                              <div>
                                <div className="text-xs text-gray-600 font-bold uppercase">📦 Product</div>
                                <div className="text-sm sm:text-base font-bold text-gray-800 mt-1">{item.reference}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600 font-bold uppercase">📝 Description</div>
                                <div className="text-xs sm:text-sm text-gray-700 mt-1 line-clamp-2">{item.description || 'N/A'}</div>
                              </div>
                              <div className="flex gap-3">
                                <div>
                                  <div className="text-xs text-gray-600 font-bold uppercase">Qty</div>
                                  <div className="text-lg sm:text-xl font-bold text-blue-600 mt-1">{item.quantity}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-600 font-bold uppercase">Location</div>
                                  <div className="text-lg sm:text-xl font-bold text-gray-700 mt-1 font-mono">{item.warehouse_location}</div>
                                </div>
                              </div>
                            </div>
                            {item.barcode && (
                              <div className="mt-2 pt-2 border-t text-xs text-gray-600 font-mono">
                                Barcode: {item.barcode}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Generate Collection Order Invoice Button */}
                <button
                  onClick={generateCollectionInvoice}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-lg sm:rounded-xl hover:shadow-2xl hover:scale-105 transition transform duration-300 flex items-center justify-center gap-3 text-sm sm:text-lg md:text-base mb-8 sm:mb-10"
                >
                  <FontAwesomeIcon icon={faFileInvoice} className="text-xl sm:text-2xl" />
                  Generate Collection Order Invoice
                </button>

                {/* Section Tabs */}
                <div className="mb-8 sm:mb-10">
                  <p className="text-xs sm:text-sm font-bold text-gray-700 mb-3 sm:mb-4 flex items-center gap-2">
                    <span className="text-lg sm:text-2xl">🏢</span> Pick by Section:
                  </p>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {sections.length > 0 ? (
                      sections.map(section => (
                        <button
                          key={section}
                          onClick={() => setSelectedSection(section)}
                          className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm md:text-lg transition-all duration-300 transform hover:scale-105 shadow-md
                            ${
                              selectedSection === section
                                ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-xl scale-105'
                                : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 hover:from-gray-200 hover:to-gray-300 border-2 border-gray-300'
                            }
                          `}
                        >
                          📍 Section {section}
                        </button>
                      ))
                    ) : (
                      <p className="text-gray-500 text-xs sm:text-sm md:text-base font-medium">❌ No locations found in this order</p>
                    )}
                  </div>
                </div>

                {/* Picking Items Grid */}
                {selectedSection && (
                  <div>
                    <p className="text-xs sm:text-sm md:text-base font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                      <span className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm">
                        {itemsInSection.length}
                      </span>
                      Items in Section {selectedSection}
                    </p>
                    
                    {loadingItems ? (
                      <div className="text-center py-8 sm:py-12 text-gray-500 text-xs sm:text-sm md:text-base font-medium">⏳ Loading items...</div>
                    ) : itemsInSection.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
                        {itemsInSection.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 sm:border-3 border-[#667eea] rounded-lg sm:rounded-xl p-3 sm:p-5 hover:shadow-2xl transition cursor-pointer hover:scale-105 transform duration-300"
                          >
                            {/* Product Reference */}
                            <div className="mb-3 sm:mb-4">
                              <div className="text-xs text-gray-600 font-bold uppercase tracking-wide">📦 PRODUCT</div>
                              <div className="text-base sm:text-lg md:text-xl font-bold text-[#667eea] break-words mt-1">{item.reference}</div>
                              {item.description && (
                                <div className="text-xs text-gray-700 mt-2 line-clamp-2 font-medium">{item.description}</div>
                              )}
                            </div>

                            {/* Location */}
                            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-white rounded-lg border-2 border-gray-300">
                              <div className="text-xs text-gray-600 font-bold uppercase">📍 LOCATION</div>
                              <div className="text-sm sm:text-base md:text-lg font-mono font-bold text-gray-900 mt-1">{item.warehouse_location}</div>
                            </div>

                            {/* Quantity & Stock */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2 sm:p-3 border-2 border-green-400">
                                <div className="text-xs text-green-700 font-bold uppercase">✓ Order Qty</div>
                                <div className="text-lg sm:text-2xl font-bold text-green-600 mt-1">{item.quantity}</div>
                              </div>
                              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg p-2 sm:p-3 border-2 border-blue-400">
                                <div className="text-xs text-blue-700 font-bold uppercase">📊 Stock</div>
                                <div className="text-lg sm:text-2xl font-bold text-blue-600 mt-1">{item.stock}</div>
                              </div>
                            </div>

                            {/* Barcode */}
                            {item.barcode && (
                              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t-2 border-gray-300 text-xs text-gray-600 font-mono font-semibold truncate">{item.barcode}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border-2 sm:border-3 border-dashed border-gray-300 rounded-lg sm:rounded-xl p-6 sm:p-8 md:p-12 text-center text-gray-500 bg-gray-50 hover:bg-gray-100 transition">
                        <p className="text-sm sm:text-base md:text-lg font-bold">📭 No items in Section {selectedSection}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 sm:py-16 md:py-20 text-gray-500">
                <div className="text-4xl sm:text-5xl md:text-6xl mb-4 sm:mb-6">📋</div>
                <p className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3">Select an order to start picking</p>
                <p className="text-sm sm:text-base md:text-lg text-gray-400 font-medium">Choose from the list on the left to view items</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
