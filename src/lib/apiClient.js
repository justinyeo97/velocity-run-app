const DEFAULT_API_URL = 'https://soc-med-api-production.up.railway.app'

export const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '')

export const ENDPOINTS = {
  signup: `${API_BASE_URL}/auth/signup`,
  login: `${API_BASE_URL}/auth/login`,
  posts: `${API_BASE_URL}/posts`,
  createPost: `${API_BASE_URL}/posts`,
  friends: `${API_BASE_URL}/friends`,
  follow: `${API_BASE_URL}/follow`,
  runs: `${API_BASE_URL}/runs`,
}

export async function apiRequest(url, options = {}, { token, onUnauthorized } = {}) {
  const { headers: customHeaders = {}, ...requestOptions } = options
  const isFormData = typeof FormData !== 'undefined' && requestOptions.body instanceof FormData
  const headers = {
    ...(!isFormData && requestOptions.body != null ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  }

  const response = await fetch(url, { ...requestOptions, headers })
  const responseText = await response.text()
  let body = {}
  if (responseText) {
    try {
      body = JSON.parse(responseText)
    } catch {
      body = { message: responseText }
    }
  }

  if (response.status === 401 && token) onUnauthorized?.()
  if (!response.ok) {
    const errorMessage = body.error?.message || body.error || body.message
    const error = new Error(errorMessage || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }

  return body.data ?? body
}
