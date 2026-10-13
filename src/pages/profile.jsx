import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/login'
import { supabase } from '../lib/supabase'
import { getFriends, getFollowing } from '../services/friends'
import { getPosts } from '../services/posts'
import { getRuns } from '../services/runs'

function getRows(response, key) {
  if (Array.isArray(response)) return response
  const alternateKey = key === 'friends' ? 'users' : key === 'following' ? 'follows' : null
  const rows = response?.[key] ?? response?.[alternateKey]
    ?? response?.data?.[key] ?? response?.data?.[alternateKey] ?? response?.data
  return Array.isArray(rows) ? rows : []
}

function getRecordUserId(record) {
  return record.user_id ?? record.userId ?? record.author_id ?? record.authorId
    ?? record.user?.id ?? record.author?.id ?? record.users?.id
}

function normalizeRun(run) {
  if (typeof run === 'string') {
    try {
      run = JSON.parse(run)
    } catch {
      return null
    }
  }
  if (!run || typeof run !== 'object') return null
  const details = run.run && typeof run.run === 'object' ? run.run : run
  return {
    ...run,
    ...details,
    distance_m: details.distance_m ?? details.distanceM,
    elapsed_seconds: details.elapsed_seconds ?? details.elapsedSeconds,
    started_at: details.started_at ?? details.startedAt ?? details.created_at,
  }
}

function normalizeDate(date) {
  const timestamp = new Date(date || '').getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function formatDate(date) {
  return normalizeDate(date) ? new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : 'Not available'
}

function formatDuration(totalSeconds) {
  const seconds = Number(totalSeconds)
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = Math.floor(seconds % 60)
  return [hours, minutes, remainder].map((part) => String(part).padStart(2, '0')).join(':')
}

function formatPace(totalSeconds, totalDistanceM) {
  if (!totalDistanceM || !totalSeconds) return '—'
  const secondsPerKm = Math.round(totalSeconds / (totalDistanceM / 1000))
  return `${Math.floor(secondsPerKm / 60)}:${String(secondsPerKm % 60).padStart(2, '0')} /km`
}

function getPostDate(post) {
  return post.created_at ?? post.createdAt ?? post.updated_at ?? post.updatedAt
}

export default function Profile() {
  const { apiFetch, user, token } = useAuth()
  const [profile, setProfile] = useState(null)
  const [runs, setRuns] = useState([])
  const [posts, setPosts] = useState([])
  const [friendCount, setFriendCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadNotice, setLoadNotice] = useState('')
  const [avatarFailed, setAvatarFailed] = useState(false)

  useEffect(() => {
    let active = true
    const authUserRequest = supabase && token
      ? supabase.auth.getUser(token).then(({ data, error }) => {
        if (error) throw error
        return data.user
      })
      : Promise.resolve(null)

    Promise.all([
      Promise.allSettled([
        getPosts(apiFetch, null, { cache: 'no-store' }),
        getRuns(apiFetch, { cache: 'no-store' }),
        getFriends(apiFetch, { cache: 'no-store' }),
        getFollowing(apiFetch, { cache: 'no-store' }),
      ]),
      authUserRequest.catch(() => null),
    ])
      .then(([results, authUser]) => {
        if (!active) return

        const failedRequests = results.filter((result) => result.status === 'rejected').length
        const valueAt = (index) => results[index].status === 'fulfilled' ? results[index].value : []
        const ownRuns = getRows(valueAt(1), 'runs')
          .map(normalizeRun)
          .filter((run) => run && String(getRecordUserId(run) ?? '') === String(user?.id ?? ''))
          .sort((a, b) => normalizeDate(b.started_at) - normalizeDate(a.started_at))
        const ownPosts = getRows(valueAt(0), 'posts')
          .filter((post) => String(getRecordUserId(post) ?? '') === String(user?.id ?? ''))
          .sort((a, b) => normalizeDate(getPostDate(b)) - normalizeDate(getPostDate(a)))
        const friends = getRows(valueAt(2), 'friends')
        const following = getRows(valueAt(3), 'following')
        const followedIds = new Set(following
          .map((relationship) => relationship.followed_id ?? relationship.followedId ?? relationship.users?.id)
          .filter((id) => id != null)
          .map(String))

        setProfile({
          ...(user || {}),
          ...(authUser?.user_metadata || {}),
          ...(authUser ? {
            id: authUser.id,
            email: authUser.email,
            created_at: authUser.created_at,
          } : {}),
        })
        setRuns(ownRuns)
        setPosts(ownPosts)
        setFriendCount(friends.length)
        setFollowingCount(followedIds.size || following.length)
        setLoadNotice(failedRequests ? 'Some profile details could not be loaded.' : '')
        setLoading(false)
      })

    return () => { active = false }
  }, [apiFetch, token, user?.id])

  const totalDistanceM = runs.reduce((total, run) => {
    const distance = Number(run.distance_m)
    return total + (Number.isFinite(distance) && distance > 0 ? distance : 0)
  }, 0)
  const totalElapsedSeconds = runs.reduce((total, run) => {
    const duration = Number(run.elapsed_seconds)
    return total + (Number.isFinite(duration) && duration > 0 ? duration : 0)
  }, 0)

  const displayName = profile?.username || profile?.full_name || profile?.fullName
    || profile?.name || profile?.email?.split('@')[0] || 'Runner'
  const avatarUrl = profile?.avatar_url || profile?.avatarUrl || profile?.profile_image_url || profile?.image_url
    || profile?.picture || profile?.avatar
  const email = profile?.email || 'Email not available'
  const role = profile?.role || 'Runner'
  const bio = profile?.bio || profile?.about
  const memberSince = profile?.created_at || profile?.createdAt
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  if (loading) {
    return <main className="club-profile"><p className="profile-state" role="status">Loading your profile...</p></main>
  }

  return (
    <main className="club-profile">
      <div className="profile-content">
        <span className="page-eyebrow">THE RUNNER</span>
        <h1 className="profile-page-title">Your Profile</h1>

        {loadNotice && <p className="profile-notice" role="status">{loadNotice}</p>}

        <section className="profile-hero" aria-label="Account overview">
          {avatarUrl && !avatarFailed
            ? <img className="profile-avatar" src={avatarUrl} alt={`${displayName}'s profile`} onError={() => setAvatarFailed(true)} />
            : <span className="profile-avatar profile-avatar-logo" role="img" aria-label="Velocity Run Club logo">{ '\u26A1' }</span>}
          <div className="profile-identity">
            <span className="profile-role">{role}</span>
            <h2>{displayName}</h2>
            <p>{email}</p>
            {bio && <p className="profile-bio">{bio}</p>}
          </div>
          <div className="profile-member-since">
            <span className="post-run-kicker">MEMBER SINCE</span>
            <strong>{formatDate(memberSince)}</strong>
          </div>
        </section>

        <section className="profile-stat-grid" aria-label="Your running summary">
          <article className="profile-stat-card"><span>RUNS</span><strong>{runs.length}</strong><small>recorded</small></article>
          <article className="profile-stat-card"><span>DISTANCE</span><strong>{(totalDistanceM / 1000).toFixed(1)}</strong><small>kilometers</small></article>
          <article className="profile-stat-card"><span>TIME ON FEET</span><strong>{formatDuration(totalElapsedSeconds)}</strong><small>total elapsed</small></article>
          <article className="profile-stat-card"><span>POSTS</span><strong>{posts.length}</strong><small>shared with the crew</small></article>
          <article className="profile-stat-card"><span>FRIENDS</span><strong>{friendCount}</strong><small>{followingCount} following</small></article>
          <article className="profile-stat-card"><span>AVERAGE PACE</span><strong>{formatPace(totalElapsedSeconds, totalDistanceM)}</strong><small>elapsed time per km</small></article>
        </section>

        <div className="profile-activity-grid">
          <section className="profile-activity-card" aria-labelledby="profile-recent-runs">
            <div className="profile-section-heading">
              <div><span className="post-run-kicker">ON THE MOVE</span><h2 id="profile-recent-runs">Recent runs</h2></div>
              <Link to="/runs">All runs</Link>
            </div>
            {runs.length === 0
              ? <p className="profile-empty">Your run history will appear here when you log a run.</p>
              : <ul className="profile-activity-list">
                {runs.slice(0, 4).map((run, index) => (
                  <li key={run.id ?? `${run.started_at}-${index}`}>
                    <span className="profile-activity-icon" aria-hidden="true">{ '\u26A1' }</span>
                    <div><strong>{run.title || 'Run recorded'}</strong><small>{formatDate(run.started_at)}</small></div>
                    <span className="profile-activity-value">{Number(run.distance_m) > 0 ? `${(Number(run.distance_m) / 1000).toFixed(2)} km` : '—'}</span>
                  </li>
                ))}
              </ul>}
          </section>

          <section className="profile-activity-card" aria-labelledby="profile-recent-posts">
            <div className="profile-section-heading">
              <div><span className="post-run-kicker">FROM YOUR FEED</span><h2 id="profile-recent-posts">Recent posts</h2></div>
              <Link to="/feed">View feed</Link>
            </div>
            {posts.length === 0
              ? <p className="profile-empty">Your posts to the crew will appear here.</p>
              : <ul className="profile-activity-list">
                {posts.slice(0, 4).map((post, index) => (
                  <li key={post.id ?? `${getPostDate(post)}-${index}`}>
                    <span className="profile-activity-icon" aria-hidden="true">{ '\u2726' }</span>
                    <div><strong>{post.title || 'Untitled post'}</strong><small>{formatDate(getPostDate(post))}</small></div>
                    <span className="profile-visibility">{post.visibility || ''}</span>
                  </li>
                ))}
              </ul>}
          </section>
        </div>
      </div>
    </main>
  )
}
