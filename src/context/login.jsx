import { createContext, useContext, useState } from 'react'
import { ENDPOINTS } from '../App'

const AuthContext = createContext(null)

function getAuthUser(token) {
  try {
    const encodedPayload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=')
    const claims = JSON.parse(atob(paddedPayload))
    return { ...claims.user_metadata, id: claims.sub }
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  function logout() {
    localStorage.removeItem('token')
    setToken(null)
  }

  async function apiFetch(url, options = {}) {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
    const headers = {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    }

    const res = await fetch(url, {
      ...options,
      headers,
    })
    const body = await res.json().catch(() => ({}))

    if (res.status === 401 && token) logout()
    if (!res.ok) {
      const err = body.error?.message || body.error || body.message
      const requestError = new Error(err || `Request failed (${res.status})`)
      requestError.status = res.status
      throw requestError
    }
    return body.data ?? body
  }

  async function login(email, password) {
    const data = await apiFetch(ENDPOINTS.login, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    const newToken = data.token || data.access_token || data.session?.access_token
    if (!newToken) throw new Error('No token returned from /login')
    localStorage.setItem('token', newToken)
    setToken(newToken)
  }

  async function signup(email, password, username) {
    return apiFetch(ENDPOINTS.signup, {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    })
  }

  return (
    <AuthContext.Provider value={{ token, user: getAuthUser(token || ''), login, signup, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
