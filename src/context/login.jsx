import { createContext, useContext, useEffect, useState } from 'react'
import { ENDPOINTS } from '../App'
import { requireSupabase, supabase } from '../lib/supabase'

const AuthContext = createContext(null)

function getAuthUser(token) {
  try {
    const encodedPayload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=')
    const claims = JSON.parse(atob(paddedPayload))
    return {
      ...claims.user_metadata,
      email: claims.email ?? claims.user_metadata?.email,
      created_at: claims.created_at ?? claims.user_metadata?.created_at,
      id: claims.sub,
    }
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return undefined
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        localStorage.setItem('token', session.access_token)
        setToken(session.access_token)
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('token')
        setToken(null)
      }

      if (event === 'INITIAL_SESSION') setAuthReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  function logout() {
    localStorage.removeItem('token')
    setToken(null)
    if (supabase) supabase.auth.signOut().catch(() => {})
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

  async function loginWithGoogle() {
    const client = requireSupabase()
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    })
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ token, user: getAuthUser(token || ''), authReady, login, signup, loginWithGoogle, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
