// API Base URL - prefer Vite env `VITE_API_URL` when available (works in container)
export const API_BASE_URL = (import.meta.env && import.meta.env.VITE_API_URL) || '/api'

// Create axios instance with base URL
import axios from 'axios'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,  // 60 seconds for all requests (login takes ~20s)
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true // Important for CORS
})

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (!error.response) {
      console.error('❌ Cannot connect to backend at', API_BASE_URL)
      console.error('Backend URL:', API_BASE_URL)
      console.error('Make sure backend is running: python run_app.py')
      console.error('Full error:', error)
    } else if (error.response.status === 0 || error.code === 'ECONNABORTED') {
      console.error('❌ CORS Error or Connection Timeout')
      console.error('Backend must be running on', API_BASE_URL)
    } else {
      console.error(`❌ API Error ${error.response.status}:`, error.response.data)
    }
    return Promise.reject(error)
  }
)

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  config => {
    console.log(`📤 API Request: ${config.method.toUpperCase()} ${config.url}`)
    return config
  },
  error => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)
