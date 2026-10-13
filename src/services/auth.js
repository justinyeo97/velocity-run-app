import { ENDPOINTS } from '../lib/apiClient'

export function loginRequest(apiFetch, email, password) {
  return apiFetch(ENDPOINTS.login, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function signupRequest(apiFetch, email, password, username) {
  return apiFetch(ENDPOINTS.signup, {
    method: 'POST',
    body: JSON.stringify({ email, password, username }),
  })
}
