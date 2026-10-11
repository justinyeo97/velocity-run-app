import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/login'
import { ENDPOINTS } from '../App'

function getPostAuthorId(post) {
  return post.author_id ?? post.authorId ?? post.user_id ?? post.userId
    ?? post.author?.id ?? post.author?.user_id ?? post.author?.userId
}

const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const POSTS_PAGE_SIZE = 5
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const EMPTY_RUN_FORM = {
  title: '',
  startedAt: '',
  distanceKm: '',
  hours: '0',
  minutes: '0',
  seconds: '0',
  movingSeconds: '',
  elevationGain: '',
  averageHeartRate: '',
  maxHeartRate: '',
  source: 'manual',
}

function normalizePostsResponse(response) {
  const rows = Array.isArray(response)
    ? response
    : response?.posts ?? response?.data?.posts ?? response?.data

  if (!Array.isArray(rows)) {
    throw new Error('The posts API returned an unexpected response.')
  }

  return rows.map((post) => ({
    ...post,
    image_url: post.image_url ?? post.imageUrl ?? null,
    run: normalizeRun(post.run ?? post.run_info ?? post.runInfo ?? post.run_data ?? post.runData ?? (Array.isArray(post.runs) ? post.runs[0] : null)),
  }))
}

function responseHasMorePosts(response, allRows, offset, pageLength) {
  const pagination = response?.pagination ?? response?.meta?.pagination ?? response?.meta ?? {}
  const hasMore = response?.has_more ?? response?.hasMore ?? pagination.has_more ?? pagination.hasMore
  if (typeof hasMore === 'boolean') return hasMore

  const total = Number(response?.total ?? pagination.total ?? response?.count ?? pagination.count)
  if (Number.isFinite(total)) return offset + pageLength < total

  if (allRows.length > pageLength) return offset + pageLength < allRows.length
  return pageLength === POSTS_PAGE_SIZE
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
    ...details,
    distance_m: details.distance_m ?? details.distanceM,
    elapsed_seconds: details.elapsed_seconds ?? details.elapsedSeconds,
    moving_seconds: details.moving_seconds ?? details.movingSeconds,
    elevation_gain_m: details.elevation_gain_m ?? details.elevationGainM,
    average_heart_rate: details.average_heart_rate ?? details.averageHeartRate,
    max_heart_rate: details.max_heart_rate ?? details.maxHeartRate,
    started_at: details.started_at ?? details.startedAt,
  }
}

function normalizeRunsResponse(response) {
  const rows = Array.isArray(response)
    ? response
    : response?.runs ?? response?.data?.runs ?? response?.data

  if (!Array.isArray(rows)) throw new Error('The runs API returned an unexpected response.')

  return rows
    .map(normalizeRun)
    .filter(Boolean)
}

function getRunPaceSeconds(run) {
  const distanceM = Number(run.distance_m)
  const elapsedSeconds = Number(run.elapsed_seconds)
  if (!Number.isFinite(distanceM) || distanceM <= 0 || !Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return null
  }
  return elapsedSeconds / (distanceM / 1000)
}

function formatPace(secondsPerKm) {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return '—'
  const roundedSeconds = Math.round(secondsPerKm)
  const minutes = Math.floor(roundedSeconds / 60)
  const seconds = roundedSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function buildRunPayload(runForm) {
  if (!runForm.startedAt) return { error: 'Add the run date and start time' }

  const startedAt = new Date(runForm.startedAt)
  if (Number.isNaN(startedAt.getTime())) return { error: 'Enter a valid run date and start time' }

  const distanceKm = Number(runForm.distanceKm)
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return { error: 'Enter a run distance greater than 0 km' }
  const distanceM = Math.round(distanceKm * 1000)
  if (distanceM <= 0) return { error: 'Run distance must be at least 1 meter' }

  const durationParts = [runForm.hours, runForm.minutes, runForm.seconds].map((part) => part === '' ? 0 : Number(part))
  if (durationParts.some((part) => !Number.isInteger(part) || part < 0)) {
    return { error: 'Run duration must use whole, non-negative values' }
  }
  const [hours, minutes, seconds] = durationParts
  if (minutes > 59 || seconds > 59) return { error: 'Run duration minutes and seconds must be below 60' }
  const elapsedSeconds = hours * 3600 + minutes * 60 + seconds
  if (elapsedSeconds <= 0) return { error: 'Enter a run duration greater than 0' }

  const optionalNumber = (value) => value === '' ? null : Number(value)
  const movingSeconds = optionalNumber(runForm.movingSeconds)
  const elevationGainM = optionalNumber(runForm.elevationGain)
  const averageHeartRate = optionalNumber(runForm.averageHeartRate)
  const maxHeartRate = optionalNumber(runForm.maxHeartRate)

  if (movingSeconds !== null && (!Number.isInteger(movingSeconds) || movingSeconds < 0 || movingSeconds > elapsedSeconds)) {
    return { error: 'Moving time must be whole seconds and cannot exceed total duration' }
  }
  if (elevationGainM !== null && (!Number.isFinite(elevationGainM) || elevationGainM < 0)) {
    return { error: 'Elevation gain must be a non-negative number' }
  }
  for (const [label, value] of [['Average heart rate', averageHeartRate], ['Maximum heart rate', maxHeartRate]]) {
    if (value !== null && (!Number.isInteger(value) || value < 1 || value > 250)) {
      return { error: `${label} must be a whole number between 1 and 250` }
    }
  }
  if (averageHeartRate !== null && maxHeartRate !== null && maxHeartRate < averageHeartRate) {
    return { error: 'Maximum heart rate cannot be below average heart rate' }
  }
  if (runForm.source.length > 50) return { error: 'Run source must be 50 characters or fewer' }

  return {
    payload: {
      title: runForm.title.trim() || null,
      started_at: startedAt.toISOString(),
      distance_m: distanceM,
      elapsed_seconds: elapsedSeconds,
      moving_seconds: movingSeconds,
      elevation_gain_m: elevationGainM,
      average_heart_rate: averageHeartRate,
      max_heart_rate: maxHeartRate,
      source: runForm.source.trim() || 'manual',
    },
  }
}

function formatDuration(totalSeconds) {
  const seconds = Number(totalSeconds)
  if (!Number.isFinite(seconds)) return ''
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = Math.floor(seconds % 60)
  return [hours, minutes, remainder].map((part) => String(part).padStart(2, '0')).join(':')
}

export default function Feed() {
  const auth = useAuth()
  const { apiFetch } = auth
  const currentUserId = auth.user?.id
  const [posts, setPosts] = useState([])
  const [postOffset, setPostOffset] = useState(0)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [loadingMorePosts, setLoadingMorePosts] = useState(false)
  const [latestRuns, setLatestRuns] = useState([])
  const [runsLoading, setRunsLoading] = useState(true)
  const [runsError, setRunsError] = useState('')
  const [friends, setFriends] = useState([])
  const [friendsLoaded, setFriendsLoaded] = useState(false)
  const [followedIds, setFollowedIds] = useState(() => new Set())
  const [followedLoaded, setFollowedLoaded] = useState(false)
  const [followingIds, setFollowingIds] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [postsError, setPostsError] = useState('')
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState('')
  const [includeRun, setIncludeRun] = useState(false)
  const [runForm, setRunForm] = useState({ ...EMPTY_RUN_FORM })
  const [imageFile, setImageFile] = useState(null)
  const [posting, setPosting] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const imageInputRef = useRef(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl('')
      return undefined
    }

    const previewUrl = URL.createObjectURL(imageFile)
    setImagePreviewUrl(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [imageFile])

  function handleImageChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setError('Choose a JPEG, PNG, WebP, or GIF image.')
      setImageFile(null)
      event.target.value = ''
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError('Choose an image smaller than 8 MB.')
      setImageFile(null)
      event.target.value = ''
      return
    }

    setError('')
    setImageFile(file)
  }

  function removeImage() {
    setImageFile(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  async function loadPosts(append = false) {
    const offset = append ? postOffset : 0
    if (append) setLoadingMorePosts(true)
    else setLoading(true)

    try {
      const query = new URLSearchParams({ limit: String(POSTS_PAGE_SIZE), offset: String(offset) })
      const response = await apiFetch(`${ENDPOINTS.posts}?${query}`, { cache: 'no-store' })
      const allRows = normalizePostsResponse(response)
      const pagePosts = allRows.length > POSTS_PAGE_SIZE
        ? allRows.slice(offset, offset + POSTS_PAGE_SIZE)
        : allRows
      const currentIds = new Set((append ? posts : []).map((post) => post.id).filter((id) => id != null).map(String))
      const hasNewPosts = pagePosts.some((post) => post.id == null || !currentIds.has(String(post.id)))

      setPosts((current) => {
        if (!append) return pagePosts
        const existingIds = new Set(current.map((post) => post.id).filter((id) => id != null).map(String))
        return [...current, ...pagePosts.filter((post) => post.id == null || !existingIds.has(String(post.id)))]
      })
      setPostOffset(offset + pagePosts.length)
      setHasMorePosts(hasNewPosts && responseHasMorePosts(response, allRows, offset, pagePosts.length))
      setPostsError('')
    } catch (err) {
      setPostsError(`Could not load posts: ${err.message}`)
    } finally {
      if (append) setLoadingMorePosts(false)
      else setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [])

  useEffect(() => {
    if (!ENDPOINTS.runs) {
      setRunsLoading(false)
      return undefined
    }

    apiFetch(ENDPOINTS.runs, { cache: 'no-store' })
      .then((response) => {
        const rankedRuns = normalizeRunsResponse(response)
          .filter((run) => getRunPaceSeconds(run) !== null)
          .sort((a, b) => (
            getRunPaceSeconds(a) - getRunPaceSeconds(b)
            || Number(b.distance_m) - Number(a.distance_m)
            || new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
          ))
        setLatestRuns(rankedRuns.slice(0, 5))
        setRunsError('')
      })
      .catch((err) => setRunsError(err.message))
      .finally(() => setRunsLoading(false))
    return undefined
  }, [apiFetch])

  useEffect(() => {
    setFollowedLoaded(false)
    apiFetch(ENDPOINTS.follow, { cache: 'no-store' })
      .then((data) => {
        const followRows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
        setFollowedIds(new Set(
          followRows
            .map((relationship) => relationship.followed_id ?? relationship.users?.id)
            .filter((followedId) => followedId != null)
            .map(String),
        ))
      })
      .catch((err) => {
        setFollowedIds(new Set())
        setError(`Could not load followed users: ${err.message}`)
      })
      .finally(() => setFollowedLoaded(true))
  }, [apiFetch, currentUserId])

  useEffect(() => {
    setFriendsLoaded(false)
    apiFetch(ENDPOINTS.friends)
      .then((data) => setFriends(Array.isArray(data) ? data : data.users || []))
      .catch(() => setFriends([]))
      .finally(() => setFriendsLoaded(true))
  }, [apiFetch])

  const friendIds = new Set(friends.map((friend) => friend.id ?? friend.user_id ?? friend.userId).filter((id) => id != null).map(String))

  async function handleFollow(authorId) {
    const id = String(authorId)
    setFollowingIds((current) => new Set(current).add(id))
    setError('')
    try {
      await apiFetch(ENDPOINTS.follow, {
        method: 'POST',
        body: JSON.stringify({ followed_id: String(authorId) }),
      })
      setFollowedIds((current) => new Set(current).add(id))
    } catch (err) {
      if (err.status === 409 || err.message === 'Already following this user') {
        setFollowedIds((current) => new Set(current).add(id))
      } else {
        setError(err.message)
      }
    } finally {
      setFollowingIds((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
    }
  }

  async function handlePost(e) {
    e.preventDefault()
    setError('')
    if (!title.trim()) return setError('Add a title')
    if (!content.trim()) return setError('Write something first')
    if (!visibility) return setError('Choose Public or Friends only')

    let runPayload
    if (includeRun) {
      const result = buildRunPayload(runForm)
      if (result.error) return setError(result.error)
      runPayload = result.payload
    }

    setPosting(true)
    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('content', content.trim())
      formData.append('visibility', visibility)
      if (imageFile) formData.append('image', imageFile)
      if (runPayload) formData.append('run', JSON.stringify(runPayload))

      const created = await apiFetch(ENDPOINTS.createPost, {
        method: 'POST',
        body: formData,
      })
      setTitle('')
      setContent('')
      setVisibility('')
      setIncludeRun(false)
      setRunForm({ ...EMPTY_RUN_FORM })
      removeImage()
      setComposerOpen(false)
      await loadPosts()
      const createdPost = created?.post ?? created?.data?.post
      if (createdPost?.run) {
        setPosts((current) => current.map((post) => (
          String(post.id) === String(createdPost.id) && !post.run
            ? { ...post, run: normalizeRun(createdPost.run) }
            : post
        )))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="club-feed">
      <header className="feed-heading">
        <div>
          <span className="feed-kicker">YOU ARE ENTERING</span>
          <h1>The Speed Force</h1>
          <p>Updates, milestones, and stories from your fellow speedsters.</p>
        </div>
      </header>
      <div className="feed-layout">
        <main className="feed-main">
      <button
        className="btn club-post-button composer-toggle"
        type="button"
        aria-expanded={composerOpen}
        aria-controls="club-composer-form"
        onClick={() => setComposerOpen((open) => !open)}
      >
        <span aria-hidden="true">{composerOpen ? '\u2212' : '\u002B'}</span>
        {composerOpen ? 'Close form' : 'Create a post'}
      </button>

      {composerOpen && <form id="club-composer-form" className="club-composer card composer-flash-in" onSubmit={handlePost}>
        <div className="composer-heading"><span className="composer-icon" aria-hidden="true">{'\u26A1'}</span><div><h2>Share an update</h2><p>Tell the crew what you have been up to.</p></div></div>
        <p className="composer-field">
          <input
            className="form-control"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </p>
        <p className="composer-field">
          <textarea
            className="form-control"
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            cols={40}
          />
        </p>
        <div className="visibility-options">
          <label className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              name="visibility"
              value="public"
              checked={visibility === 'public'}
              onChange={(e) => setVisibility(e.target.value)}
            />{' '}
            Public
          </label>
          <label className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              name="visibility"
              value="friends"
              checked={visibility === 'friends'}
              onChange={(e) => setVisibility(e.target.value)}
            />{' '}
            Friends only
          </label>
        </div>
        <label className="add-run-toggle">
          <input
            type="checkbox"
            checked={includeRun}
            onChange={(event) => setIncludeRun(event.target.checked)}
            disabled={posting}
          />
          <span className="add-run-toggle-icon" aria-hidden="true">{ '\u26A1' }</span>
          <span className="add-run-toggle-copy">
            <strong>Add a run</strong>
            <small>Attach distance, time, and workout stats to this post</small>
          </span>
        </label>
        {includeRun && (
          <fieldset className="run-fields" disabled={posting}>
            <legend>Run details</legend>
            <label className="run-field run-field-wide">
              <span>Run title <small>Optional</small></span>
              <input
                className="form-control"
                type="text"
                placeholder="Easy morning miles"
                value={runForm.title}
                onChange={(event) => setRunForm((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label className="run-field">
              <span>Started at</span>
              <input
                className="form-control"
                type="datetime-local"
                value={runForm.startedAt}
                onChange={(event) => setRunForm((current) => ({ ...current, startedAt: event.target.value }))}
                required
              />
            </label>
            <label className="run-field">
              <span>Distance <small>km</small></span>
              <input
                className="form-control"
                type="number"
                min="0.001"
                step="0.001"
                placeholder="5.00"
                value={runForm.distanceKm}
                onChange={(event) => setRunForm((current) => ({ ...current, distanceKm: event.target.value }))}
                required
              />
            </label>
            <div className="run-field run-duration-field">
              <span>Elapsed time <small>hh : mm : ss</small></span>
              <div className="run-duration-inputs">
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  step="1"
                  aria-label="Duration hours"
                  placeholder="0"
                  value={runForm.hours}
                  onChange={(event) => setRunForm((current) => ({ ...current, hours: event.target.value }))}
                  required
                />
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                  aria-label="Duration minutes"
                  placeholder="00"
                  value={runForm.minutes}
                  onChange={(event) => setRunForm((current) => ({ ...current, minutes: event.target.value }))}
                  required
                />
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                  aria-label="Duration seconds"
                  placeholder="00"
                  value={runForm.seconds}
                  onChange={(event) => setRunForm((current) => ({ ...current, seconds: event.target.value }))}
                  required
                />
              </div>
            </div>
            <label className="run-field">
              <span>Moving time <small>seconds · optional</small></span>
              <input
                className="form-control"
                type="number"
                min="0"
                step="1"
                placeholder="Optional"
                value={runForm.movingSeconds}
                onChange={(event) => setRunForm((current) => ({ ...current, movingSeconds: event.target.value }))}
              />
            </label>
            <label className="run-field">
              <span>Elevation gain <small>meters · optional</small></span>
              <input
                className="form-control"
                type="number"
                min="0"
                step="any"
                placeholder="Optional"
                value={runForm.elevationGain}
                onChange={(event) => setRunForm((current) => ({ ...current, elevationGain: event.target.value }))}
              />
            </label>
            <label className="run-field">
              <span>Average heart rate <small>bpm · optional</small></span>
              <input
                className="form-control"
                type="number"
                min="1"
                max="250"
                step="1"
                placeholder="Optional"
                value={runForm.averageHeartRate}
                onChange={(event) => setRunForm((current) => ({ ...current, averageHeartRate: event.target.value }))}
              />
            </label>
            <label className="run-field">
              <span>Maximum heart rate <small>bpm · optional</small></span>
              <input
                className="form-control"
                type="number"
                min="1"
                max="250"
                step="1"
                placeholder="Optional"
                value={runForm.maxHeartRate}
                onChange={(event) => setRunForm((current) => ({ ...current, maxHeartRate: event.target.value }))}
              />
            </label>
          </fieldset>
        )}
        <div className="post-image-field">
          <input
            ref={imageInputRef}
            id="post-image"
            className="post-image-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            aria-label="Attach an image to your post"
            onChange={handleImageChange}
            disabled={posting}
          />
          <label className="post-image-button" htmlFor="post-image">
            <span aria-hidden="true">{'\u{1F4F7}'}</span> Add image
          </label>
          <span className="post-image-hint">JPEG, PNG, WebP, or GIF · up to 8 MB</span>
        </div>
        {imagePreviewUrl && (
          <div className="post-image-preview">
            <img src={imagePreviewUrl} alt={`Preview of ${imageFile?.name || 'selected image'}`} />
            <button className="remove-image-button" type="button" onClick={removeImage} disabled={posting}>
              Remove image
            </button>
          </div>
        )}
        <button className="btn btn-primary club-post-button" type="submit" disabled={posting}>
          {posting ? 'Posting...' : 'Post'}
        </button>
      </form>}

      {error && <p className="alert alert-danger page-error" role="alert">{error}</p>}
      {postsError && <p className="alert alert-danger page-error" role="alert">{postsError}</p>}
      <div className="feed-section-title"><span aria-hidden="true">{'\u26A1'}</span><h2>Latest from the crew</h2><span aria-hidden="true">{'\u26A1'}</span></div>

      {loading && <p className="feed-empty">Loading posts...</p>}
      {!loading && !postsError && posts.length === 0 && <p className="feed-empty">No posts yet.</p>}
          {posts.map((post) => {
        const authorId = getPostAuthorId(post)
        const friendPost = authorId != null && friendIds.has(String(authorId))
        const ownPost = authorId != null && currentUserId != null && String(authorId) === String(currentUserId)
        const authorIsFollowed = authorId != null && followedIds.has(String(authorId))
        const authorAlreadyFollowed = authorIsFollowed || friendPost
        const isFollowing = authorId != null && followingIds.has(String(authorId))

        return (
          <article className="club-post card" key={post.id}>
            <div className="post-title-row"><span className="post-avatar" aria-hidden="true">{'\u{1F3C3}'}</span><h3>{post.title}</h3>

              <span className="post-sparkle" aria-hidden="true">{'\u2726'}</span></div>
            <p className="post-content">{post.content}</p>
            {post.run && (
              <section className="post-run-card" aria-label="Run details">
                <div className="post-run-heading">
                  <span className="post-run-bolt" aria-hidden="true">{ '\u26A1' }</span>
                  <div>
                    <span className="post-run-kicker">RUN LOG</span>
                    <h4>{post.run.title || 'Run recorded'}</h4>
                  </div>
                </div>
                <div className="post-run-stats">
                  <span className="post-run-stat">
                    <svg className="post-run-stat-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11Z" />
                      <circle cx="12" cy="10" r="2.3" />
                    </svg>
                    <span className="post-run-stat-copy"><strong>{(Number(post.run.distance_m) / 1000).toFixed(2)}</strong><small>km</small></span>
                  </span>
                  <span className="post-run-stat">
                    <svg className="post-run-stat-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="13" r="8" />
                      <path d="M12 9v4l2.7 1.8M9 2h6M12 2v3" />
                    </svg>
                    <span className="post-run-stat-copy"><strong>{formatDuration(post.run.elapsed_seconds)}</strong><small>duration</small></span>
                  </span>
                  {Number(post.run.elevation_gain_m) > 0 && <span className="post-run-stat"><span className="post-run-stat-copy"><strong>{post.run.elevation_gain_m}</strong><small>m elevation</small></span></span>}
                  {post.run.average_heart_rate != null && (
                    <span className="post-run-stat">
                      <svg className="post-run-stat-icon post-run-heart-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.3 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                        <path d="M4 12h4l2-3 3.2 6 2-3H20" />
                      </svg>
                      <span className="post-run-stat-copy"><strong>{post.run.average_heart_rate}</strong><small>avg bpm</small></span>
                    </span>
                  )}
                  {post.run.max_heart_rate != null && <span className="post-run-stat"><span className="post-run-stat-copy"><strong>{post.run.max_heart_rate}</strong><small>max bpm</small></span></span>}
                  {post.run.moving_seconds != null && <span className="post-run-stat"><span className="post-run-stat-copy"><strong>{formatDuration(post.run.moving_seconds)}</strong><small>moving time</small></span></span>}
                </div>
                {post.run.started_at && <time className="post-run-date" dateTime={post.run.started_at}>{new Date(post.run.started_at).toLocaleString()}</time>}
              </section>
            )}
            {post.image_url && (
              <img className="post-image" src={post.image_url} alt={post.title ? `Image attached to ${post.title}` : 'Image attached to post'} loading="lazy" />
            )}
            <small className="post-meta">
              <span className="post-author">{post.author}</span>
              {followedLoaded && friendsLoaded && authorId != null && !ownPost && String(authorId) !== String(currentUserId) && !authorAlreadyFollowed && <button className="follow-author-button btn" type="button" onClick={() => handleFollow(authorId)} disabled={isFollowing}>{isFollowing ? 'Following...' : 'Follow'}</button>}
              {ownPost && <span className="own-post-badge">You</span>}
              {friendPost && <span className="friend-source-badge">Friend</span>}
              {authorIsFollowed && !friendPost && <span className="followed-author-badge">Following</span>}
              {post.created_at && <span className="post-time">{new Date(post.created_at).toLocaleString()}</span>}
            </small>
          </article>
        )
          })}
          {!loading && posts.length > 0 && hasMorePosts && (
            <div className="feed-pagination">
              <button
                className="feed-load-more"
                type="button"
                onClick={() => loadPosts(true)}
                disabled={loadingMorePosts}
              >
                {loadingMorePosts ? 'Loading posts...' : 'Load 5 more posts'}
              </button>
            </div>
          )}
        </main>

        <aside className="feed-sidebar" aria-label="Run leaderboard">
          <section className="top-runs-card">
            <div className="top-runs-heading">
              <span className="top-runs-bolt" aria-hidden="true">{ '\u26A1' }</span>
              <div>
                <span className="post-run-kicker">CREW STATS</span>
                <h2>Fastest runs</h2>
              </div>
            </div>
            <p className="top-runs-caption">Ranked by average pace using elapsed time.</p>

            {runsLoading && <p className="top-runs-state">Loading runs...</p>}
            {!runsLoading && runsError && <p className="top-runs-state top-runs-error" role="alert">Could not load runs: {runsError}</p>}
            {!runsLoading && !runsError && latestRuns.length === 0 && (
              <p className="top-runs-state">No runs to show yet. Share a run in a feed post to get started.</p>
            )}
            {!runsLoading && !runsError && latestRuns.length > 0 && (
              <ol className="top-runs-list">
                {latestRuns.map((run, index) => (
                  <li className="top-run-row" key={run.id ?? `${run.user_id}-${run.started_at}-${index}`}>
                    <span className="top-run-rank">{String(index + 1).padStart(2, '0')}</span>
                    <div className="top-run-details">
                      <strong>{run.username || run.author || run.user?.username || 'Runner'}</strong>
                      <span>{run.title || 'Run'} · {run.started_at ? new Date(run.started_at).toLocaleDateString() : 'Date unavailable'}</span>
                    </div>
                    <div className="top-run-metrics">
                      <strong>{formatPace(getRunPaceSeconds(run))} <small>/km</small></strong>
                      <span>{(Number(run.distance_m) / 1000).toFixed(2)} km · {formatDuration(run.elapsed_seconds)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
