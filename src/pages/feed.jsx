import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/login'
import { ENDPOINTS } from '../App'

function getPostAuthorId(post) {
  return post.author_id ?? post.authorId ?? post.user_id ?? post.userId
    ?? post.author?.id ?? post.author?.user_id ?? post.author?.userId
}

const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

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
  }))
}

export default function Feed() {
  const auth = useAuth()
  const { apiFetch } = auth
  const currentUserId = auth.user?.id
  const [posts, setPosts] = useState([])
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
  const [imageFile, setImageFile] = useState(null)
  const [posting, setPosting] = useState(false)
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

  function loadPosts() {
    return apiFetch(ENDPOINTS.posts)
      .then((response) => {
        setPosts(normalizePostsResponse(response))
        setPostsError('')
      })
      .catch((err) => setPostsError(`Could not load posts: ${err.message}`))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPosts()
  }, [])

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

    setPosting(true)
    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('content', content.trim())
      formData.append('visibility', visibility)
      if (imageFile) formData.append('image', imageFile)

      await apiFetch(ENDPOINTS.createPost, {
        method: 'POST',
        body: formData,
      })
      setTitle('')
      setContent('')
      setVisibility('')
      removeImage()
      await loadPosts()
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
          <span className="feed-kicker">A LITTLE HANGOUT FOR YOU & YOUR PALS</span>
          <h1>Club Feed <span aria-hidden="true">{'\u26A1'}</span></h1>
          <p>Updates, milestones, and stories from your running crew.</p>
        </div>
        <span className="feed-mascot" aria-hidden="true">{'\u{1F3C3}'}</span>
      </header>

      <form className="club-composer card" onSubmit={handlePost}>
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
      </form>

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
    </div>
  )
}
