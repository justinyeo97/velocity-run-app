import { apiRequest, ENDPOINTS } from '../lib/apiClient'

export function loginRequest(email, password) {
  return apiRequest(ENDPOINTS.login, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function signupRequest(email, password, username) {
  return apiRequest(ENDPOINTS.signup, {
    method: 'POST',
    body: JSON.stringify({ email, password, username }),
  })
}
