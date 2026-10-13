import { useCallback, useEffect, useReducer } from 'react'
import { followUser, getFollowing, getFriends } from '../../services/friends'
import { normalizeFollowing, normalizeFriends } from './feedModel'

const EMPTY_CONNECTIONS = {
  friends: [],
  friendIds: new Set(),
  followingIds: new Set(),
  pendingIds: new Set(),
  ready: false,
  error: '',
}

function memberId(member) {
  const candidates = [
    member?.id,
    member?.user_id,
    member?.userId,
    member?.friend_id,
    member?.friendId,
    member?.user?.id,
    member?.users?.id,
    member?.friend?.id,
  ]
  return candidates.find((candidate) => candidate !== null && candidate !== undefined)
}

function uniqueIds(values) {
  return new Set(values.filter((id) => id != null).map(String))
}

function connectionState(state, action) {
  switch (action.type) {
    case 'snapshot-loading':
      return { ...state, ready: false, error: '' }
    case 'snapshot':
      return {
        ...state,
        friends: action.friends,
        friendIds: action.friendIds,
        followingIds: action.followingIds,
        ready: true,
        error: action.error,
      }
    case 'follow-started':
      return { ...state, error: '', pendingIds: new Set(state.pendingIds).add(action.id) }
    case 'follow-finished': {
      const pendingIds = new Set(state.pendingIds)
      pendingIds.delete(action.id)
      return { ...state, pendingIds, followingIds: new Set(state.followingIds).add(action.id) }
    }
    case 'follow-failed': {
      const pendingIds = new Set(state.pendingIds)
      pendingIds.delete(action.id)
      return { ...state, pendingIds, error: action.message }
    }
    default:
      return state
  }
}

export function useFeedConnections(apiFetch) {
  const [state, dispatch] = useReducer(connectionState, EMPTY_CONNECTIONS)

  useEffect(() => {
    let current = true
    dispatch({ type: 'snapshot-loading' })

    async function loadConnections() {
      const [friendsResult, followingResult] = await Promise.allSettled([
        getFriends(apiFetch, { cache: 'no-store' }),
        getFollowing(apiFetch, { cache: 'no-store' }),
      ])
      if (!current) return

      const friends = friendsResult.status === 'fulfilled'
        ? normalizeFriends(friendsResult.value)
        : []
      const following = followingResult.status === 'fulfilled'
        ? normalizeFollowing(followingResult.value)
        : []
      const error = followingResult.status === 'rejected'
        ? `Could not load followed users: ${followingResult.reason.message}`
        : ''

      dispatch({
        type: 'snapshot',
        friends,
        friendIds: uniqueIds(friends.map(memberId)),
        followingIds: uniqueIds(following.map((row) => (
          row.followed_id ?? row.followedId ?? row.users?.id ?? row.user?.id
        ))),
        error,
      })
    }

    loadConnections()
    return () => { current = false }
  }, [apiFetch])

  const follow = useCallback(async (userId) => {
    if (userId == null) return
    const id = String(userId)
    dispatch({ type: 'follow-started', id })

    try {
      await followUser(apiFetch, id)
      dispatch({ type: 'follow-finished', id })
    } catch (requestError) {
      const alreadyFollowing = requestError.status === 409
        || requestError.message === 'Already following this user'
      dispatch(alreadyFollowing
        ? { type: 'follow-finished', id }
        : { type: 'follow-failed', id, message: requestError.message })
    }
  }, [apiFetch])

  return {
    ...state,
    friendsReady: state.ready,
    followingReady: state.ready,
    follow,
  }
}
