import { useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../context/ApiContext'
import FeedComposer from '../components/feed/FeedComposer'
import FeedPostCard from '../components/feed/FeedPostCard'
import RunLeaderboard from '../components/feed/RunLeaderboard'
import { resolvePostAuthorId } from '../features/feed/feedModel'
import { useFeedConnections } from '../features/feed/useFeedConnections'
import { useFeedPosts } from '../features/feed/useFeedPosts'
import { usePostComposer } from '../features/feed/usePostComposer'
import { useRunLeaderboard } from '../features/feed/useRunLeaderboard'

export default function Feed() {
  const { apiFetch } = useApi()
  const { user } = useAuth()
  const feed = useFeedPosts(apiFetch)
  const crew = useFeedConnections(apiFetch)
  const leaderboard = useRunLeaderboard(apiFetch)

  const afterPublishing = useCallback(async (response) => {
    await feed.refresh()
    const createdPost = response?.post ?? response?.data?.post ?? response
    feed.attachRunToPost(createdPost)
  }, [feed.attachRunToPost, feed.refresh])

  const composer = usePostComposer(apiFetch, afterPublishing)
  const currentUserId = user?.id

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
              open={composer.open}
              onToggle={composer.toggle}
              onSubmit={composer.submit}
              title={composer.title}
              setTitle={composer.setTitle}
              content={composer.content}
              setContent={composer.setContent}
              visibility={composer.visibility}
              setVisibility={composer.setVisibility}
              includeRun={composer.includeRun}
              setIncludeRun={composer.setIncludeRun}
              runForm={composer.runForm}
              setRunForm={composer.setRunForm}
              posting={composer.posting}
              imageInputRef={composer.imageInputRef}
              imagePreviewUrl={composer.imagePreviewUrl}
              imageFile={composer.imageFile}
              onImageChange={composer.selectImage}
              onRemoveImage={composer.removeImage}
            />
          </main>

          <RunLeaderboard
            runs={leaderboard.runs}
            loading={leaderboard.loading}
            error={leaderboard.error}
          />

          <section className="feed-stream" aria-labelledby="feed-stream-title">
            <header className="feed-stream-heading">
              <div>
                <span className="feed-stream-kicker">THE COMMUNITY</span>
                <h2 id="feed-stream-title">Latest from the crew</h2>
              </div>
              <span className="feed-stream-mark" aria-hidden="true">{ '\u26A1' }</span>
            </header>

            {composer.error && <p className="alert alert-danger page-error" role="alert">{composer.error}</p>}
            {crew.error && <p className="alert alert-danger page-error" role="alert">{crew.error}</p>}
            {feed.error && <p className="alert alert-danger page-error" role="alert">{feed.error}</p>}
            {feed.loading && <p className="feed-empty" role="status">Loading posts...</p>}
            {!feed.loading && !feed.error && feed.posts.length === 0 && <p className="feed-empty">No posts yet.</p>}

            <div className="feed-post-list">
              {feed.posts.map((post) => {
                const authorId = resolvePostAuthorId(post)
                const authorKey = authorId == null ? null : String(authorId)
                const ownPost = authorKey != null && currentUserId != null && authorKey === String(currentUserId)
                const friendPost = authorKey != null && crew.friendIds.has(authorKey)
                const authorIsFollowed = authorKey != null && crew.followingIds.has(authorKey)
                const showFollow = crew.friendsReady
                  && crew.followingReady
                  && authorKey != null
                  && !ownPost
                  && authorKey !== String(currentUserId)
                  && !friendPost
                  && !authorIsFollowed

                return (
                  <FeedPostCard
                    key={post.id ?? `${authorKey}-${post.created_at}-${post.title}`}
                    post={post}
                    ownPost={ownPost}
                    friendPost={friendPost}
                    authorIsFollowed={authorIsFollowed}
                    showFollow={showFollow}
                    isFollowing={authorKey != null && crew.pendingIds.has(authorKey)}
                    onFollow={() => crew.follow(authorId)}
                  />
                )
              })}
            </div>

            {!feed.loading && feed.posts.length > 0 && feed.hasMore && (
              <div className="feed-pagination">
                <button
                  className="feed-load-more"
                  type="button"
                  onClick={feed.loadMore}
                  disabled={feed.loadingMore}
                >
                  {feed.loadingMore ? 'Loading posts...' : 'Load 5 more posts'}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
