import { ENDPOINTS } from '../lib/apiClient'

export function getPosts(apiFetch, query, options) {
  const search = query ? `?${query}` : ''
  return apiFetch(`${ENDPOINTS.posts}${search}`, options)
}

export function createPost(apiFetch, formData) {
  return apiFetch(ENDPOINTS.posts, { method: 'POST', body: formData })
}
