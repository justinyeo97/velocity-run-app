import { useCallback, useEffect, useRef, useState } from 'react'
import { getPosts } from '../../services/posts'
import {
  FEED_PAGE_SIZE,
  hasAnotherPostPage,
  normalizePosts,
  normalizeRun,
} from './feedModel'

function findUnseenPosts(page, currentPosts) {
  const knownIds = new Set(currentPosts.map((post) => post.id).filter((id) => id != null).map(String))
  return page.filter((post) => post.id == null || !knownIds.has(String(post.id)))
}

export function useFeedPosts(apiFetch) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(true)
  const nextOffset = useRef(0)
  const requestVersion = useRef(0)
  const appendInProgress = useRef(false)

  const requestPage = useCallback(async (offset) => {
    const query = new URLSearchParams({ limit: String(FEED_PAGE_SIZE), offset: String(offset) })
    const response = await getPosts(apiFetch, query, { cache: 'no-store' })
    const allPosts = normalizePosts(response)
    const page = allPosts.length > FEED_PAGE_SIZE
      ? allPosts.slice(offset, offset + FEED_PAGE_SIZE)
      : allPosts

    return {
      posts: page,
      hasMore: hasAnotherPostPage(response, allPosts.length, page.length, offset),
    }
  }, [apiFetch])

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current
    appendInProgress.current = false
    setLoading(true)
    setLoadingMore(false)
    setError('')
    nextOffset.current = 0

    try {
      const result = await requestPage(0)
      if (version !== requestVersion.current) return
      setPosts(result.posts)
      nextOffset.current = result.posts.length
      setHasMore(result.hasMore)
    } catch (requestError) {
      if (version === requestVersion.current) setError(`Could not load posts: ${requestError.message}`)
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }, [requestPage])

  useEffect(() => {
    refresh()
    return () => { requestVersion.current += 1 }
  }, [refresh])

  const loadMore = useCallback(async () => {
    if (!hasMore || appendInProgress.current) return
    appendInProgress.current = true
    const version = requestVersion.current
    const offset = nextOffset.current
    setLoadingMore(true)
    setError('')

    try {
      const result = await requestPage(offset)
      if (version !== requestVersion.current) return

      const newPosts = findUnseenPosts(result.posts, posts)
      setPosts((current) => newPosts.length ? [...current, ...findUnseenPosts(newPosts, current)] : current)

      nextOffset.current = offset + result.posts.length
      setHasMore(result.hasMore && result.posts.length > 0 && newPosts.length > 0)
    } catch (requestError) {
      if (version === requestVersion.current) setError(`Could not load posts: ${requestError.message}`)
    } finally {
      appendInProgress.current = false
      if (version === requestVersion.current) setLoadingMore(false)
    }
  }, [hasMore, posts, requestPage])

  const attachRunToPost = useCallback((post) => {
    const run = normalizeRun(post?.run)
    if (!run || post?.id == null) return

    setPosts((current) => current.map((item) => (
      String(item.id) === String(post.id) && !item.run ? { ...item, run } : item
    )))
  }, [])

  return { posts, loading, loadingMore, error, hasMore, refresh, loadMore, attachRunToPost }
}
