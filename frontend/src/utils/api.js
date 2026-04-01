import axios from 'axios'

const API_BASE = '/api'

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const api = {
  // Orders
  getOrders: () => apiClient.get('/orders'),
  getOrder: (orderNumber) => apiClient.get(`/orders/${orderNumber}`),
  getCollectionCircuit: (orderNumber) => apiClient.get(`/collection-circuit/${orderNumber}`),

  // Products
  getProducts: () => apiClient.get('/products'),
  searchProducts: (query) => apiClient.get(`/products/search?q=${query}`),

  // Warehouse
  getWarehouse: () => apiClient.get('/warehouse'),
  getSection: (section) => apiClient.get(`/warehouse/section/${section}`),

  // Stock
  getStockAlerts: () => apiClient.get('/stock/alerts'),
  getLowStock: () => apiClient.get('/stock/low'),

  // Reports
  getReports: () => apiClient.get('/reports'),
  exportCSV: () => apiClient.get('/reports/export/csv', { responseType: 'blob' }),
}

export default apiClient
