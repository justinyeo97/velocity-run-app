import { ENDPOINTS } from '../lib/apiClient'

export function getFriends(apiFetch, options) {
  return apiFetch(ENDPOINTS.friends, options)
}

export function getFollowing(apiFetch, options) {
  return apiFetch(ENDPOINTS.follow, options)
}

export function followUser(apiFetch, followedId) {
  return apiFetch(ENDPOINTS.follow, {
    method: 'POST',
    body: JSON.stringify({ followed_id: String(followedId) }),
  })
}
