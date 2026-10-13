import RunDetails from './RunDetails'

function postDate(post) {
  const value = post.created_at ?? post.createdAt
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return { value, label: date.toLocaleString() }
}

export default function FeedPostCard({
  post,
  ownPost,
  friendPost,
  authorIsFollowed,
  showFollow,
  isFollowing,
  onFollow,
}) {
  const authorName = post.author || post.username || post.user?.username || 'Runner'
  const avatarUrl = post.author_avatar_url || post.avatar_url || post.user?.avatar_url || post.user?.picture
  const initials = authorName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const createdDate = postDate(post)
  const cardVariant = [
    'club-post',
    'card',
    post.run && 'club-post--run',
    post.image_url && 'club-post--image',
  ].filter(Boolean).join(' ')

  return (
    <article className={cardVariant}>
      <header className="post-card-header">
        {avatarUrl
          ? <img className="post-avatar" src={avatarUrl} alt="" loading="lazy" />
          : <span className="post-avatar" aria-hidden="true">{initials || '\u26A1'}</span>}
        <div className="post-author-identity">
          <strong className="post-author">{authorName}</strong>
          {createdDate && <time className="post-time" dateTime={createdDate.value}>{createdDate.label}</time>}
        </div>
        <div className="post-card-status">
          {ownPost && <span className="own-post-badge">You</span>}
          {friendPost && <span className="friend-source-badge">Friend</span>}
          {authorIsFollowed && !friendPost && <span className="followed-author-badge">Following</span>}
          {post.visibility && <span className="post-visibility-badge">{post.visibility === 'friends' ? 'Friends only' : 'Public'}</span>}
          {showFollow && (
            <button className="follow-author-button btn" type="button" onClick={onFollow} disabled={isFollowing}>
              {isFollowing ? 'Following...' : 'Follow'}
            </button>
          )}
        </div>
      </header>

      <div className="post-card-body">
        <h3>{post.title}</h3>
        <p className="post-content">{post.content}</p>
        {post.run && <RunDetails run={post.run} />}
        {post.image_url && (
          <img className="post-image" src={post.image_url} alt={post.title ? `Image attached to ${post.title}` : 'Image attached to post'} loading="lazy" />
        )}
      </div>
    </article>
  )
}
