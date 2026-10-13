import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/login'
import { createPost, getPosts } from '../services/posts'
import { getRuns } from '../services/runs'
import { followUser, getFollowing, getFriends } from '../services/friends'
import FeedComposer from '../components/feed/FeedComposer'
import FeedPostCard from '../components/feed/FeedPostCard'
import RunLeaderboard from '../components/feed/RunLeaderboard'
import { getRunPaceSeconds } from '../components/feed/runFormatters'

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
      const response = await getPosts(apiFetch, query, { cache: 'no-store' })
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
    getRuns(apiFetch, { cache: 'no-store' })
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
    getFollowing(apiFetch, { cache: 'no-store' })
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
    getFriends(apiFetch)
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
      await followUser(apiFetch, authorId)
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

      const created = await createPost(apiFetch, formData)
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
      <div className="feed-page-container">
        <header className="feed-heading">
          <div>
            <span className="feed-kicker">YOUR RUNNING COMMUNITY</span>
            <h1>The Speed Force</h1>
            <p>Training notes, shared miles, and good things from the crew.</p>
          </div>
        </header>

        <div className="feed-layout">
          <main className="feed-main">
            <FeedComposer
              open={composerOpen}
              onToggle={() => setComposerOpen((open) => !open)}
              onSubmit={handlePost}
              title={title}
              setTitle={setTitle}
              content={content}
              setContent={setContent}
              visibility={visibility}
              setVisibility={setVisibility}
              includeRun={includeRun}
              setIncludeRun={setIncludeRun}
              runForm={runForm}
              setRunForm={setRunForm}
              posting={posting}
              imageInputRef={imageInputRef}
              imagePreviewUrl={imagePreviewUrl}
              imageFile={imageFile}
              onImageChange={handleImageChange}
              onRemoveImage={removeImage}
            />
          </main>

          <RunLeaderboard runs={latestRuns} loading={runsLoading} error={runsError} />

          <section className="feed-stream" aria-labelledby="feed-stream-title">
            <header className="feed-stream-heading">
              <div>
                <span className="feed-stream-kicker">THE COMMUNITY</span>
                <h2 id="feed-stream-title">Latest from the crew</h2>
              </div>
              <span className="feed-stream-mark" aria-hidden="true">{ '\u26A1' }</span>
            </header>

            {error && <p className="alert alert-danger page-error" role="alert">{error}</p>}
            {postsError && <p className="alert alert-danger page-error" role="alert">{postsError}</p>}
            {loading && <p className="feed-empty" role="status">Loading posts...</p>}
            {!loading && !postsError && posts.length === 0 && <p className="feed-empty">No posts yet.</p>}

            <div className="feed-post-list">
              {posts.map((post) => {
                const authorId = getPostAuthorId(post)
                const friendPost = authorId != null && friendIds.has(String(authorId))
                const ownPost = authorId != null && currentUserId != null && String(authorId) === String(currentUserId)
                const authorIsFollowed = authorId != null && followedIds.has(String(authorId))
                const authorAlreadyFollowed = authorIsFollowed || friendPost
                const isFollowing = authorId != null && followingIds.has(String(authorId))
                const showFollow = followedLoaded
                  && friendsLoaded
                  && authorId != null
                  && !ownPost
                  && String(authorId) !== String(currentUserId)
                  && !authorAlreadyFollowed

                return (
                  <FeedPostCard
                    key={post.id}
                    post={post}
                    ownPost={ownPost}
                    friendPost={friendPost}
                    authorIsFollowed={authorIsFollowed}
                    showFollow={showFollow}
                    isFollowing={isFollowing}
                    onFollow={() => handleFollow(authorId)}
                  />
                )
              })}
            </div>

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
          </section>
        </div>
      </div>
    </div>
  )
}
