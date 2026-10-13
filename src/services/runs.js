import { ENDPOINTS } from '../lib/apiClient'

export function getRuns(apiFetch, options) {
  return apiFetch(ENDPOINTS.runs, options)
}
