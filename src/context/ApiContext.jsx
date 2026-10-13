import { createContext, useCallback, useContext } from 'react'
import { apiRequest } from '../lib/apiClient'
import { useAuth } from './AuthContext'

const ApiContext = createContext(null)

export function ApiProvider({ children }) {
  const { token, logout } = useAuth()
  const apiFetch = useCallback((url, options = {}) => (
    apiRequest(url, options, { token, onUnauthorized: logout })
  ), [logout, token])

  return <ApiContext.Provider value={{ apiFetch }}>{children}</ApiContext.Provider>
}

export function useApi() {
  const context = useContext(ApiContext)
  if (!context) throw new Error('useApi must be used within an ApiProvider')
  return context
}
