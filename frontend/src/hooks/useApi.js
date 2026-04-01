import { useState, useEffect } from 'react'
import { api } from '../utils/api'

export function useOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getOrders()
      .then(res => setOrders(res.data))
      .catch(err => setError(err))
      .finally(() => setLoading(false))
  }, [])

  return { orders, loading, error }
}

export function useCollectionCircuit(orderNumber) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!orderNumber) return
    
    api.getCollectionCircuit(orderNumber)
      .then(res => setData(res.data))
      .catch(err => setError(err))
      .finally(() => setLoading(false))
  }, [orderNumber])

  return { data, loading, error }
}
