import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../context/ApiContext'
import { ENDPOINTS } from '../lib/apiClient'
import Feed from '../pages/feed'

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}))

jest.mock('../context/ApiContext', () => ({
  useApi: jest.fn(),
}))

jest.mock('../lib/apiClient', () => ({
  ENDPOINTS: {
    posts: '/api/posts',
    createPost: '/api/posts',
    follow: '/api/follow',
    friends: '/api/friends',
    runs: '/api/runs',
  },
}))

const mockApiFetch = jest.fn()
let createdPosts = []
let createPostError = ''
let runsResponse = []
let paginatedPosts = null
let friendsResponse = []
let followingResponse = []

async function openComposer() {
  fireEvent.click(screen.getByRole('button', { name: 'Create a post' }))
  expect(await screen.findByRole('heading', { name: 'Share an update' })).toBeInTheDocument()
}

beforeEach(() => {
  createdPosts = []
  createPostError = ''
  runsResponse = []
  paginatedPosts = null
  friendsResponse = []
  followingResponse = []
  mockApiFetch.mockReset().mockImplementation(async (url, options = {}) => {
    if (url === ENDPOINTS.createPost && options.method === 'POST') {
      if (createPostError) throw new Error(createPostError)

      const body = options.body
      const newPost = {
        id: 'post-1',
        title: body.get('title'),
        content: body.get('content'),
        author: 'Test Runner',
        author_id: 'user-1',
        run: body.get('run') ? JSON.parse(body.get('run')) : null,
      }
      createdPosts = [newPost, ...createdPosts]
      return newPost
    }

    if (url === ENDPOINTS.posts || url.startsWith(`${ENDPOINTS.posts}?`)) {
      if (paginatedPosts) {
        const query = new URL(url, 'http://localhost').searchParams
        const offset = Number(query.get('offset') || 0)
        const limit = Number(query.get('limit') || 5)
        return { posts: paginatedPosts.slice(offset, offset + limit), total: paginatedPosts.length }
      }
      return createdPosts
    }
    if (url === ENDPOINTS.runs) return runsResponse
    if (url === ENDPOINTS.follow) return followingResponse
    if (url === ENDPOINTS.friends) return friendsResponse
    throw new Error(`Unexpected API request: ${url}`)
  })

  useAuth.mockReturnValue({
    user: { id: 'user-1' },
  })
  useApi.mockReturnValue({ apiFetch: mockApiFetch })

  global.URL.createObjectURL = jest.fn(() => 'blob:post-preview')
  global.URL.revokeObjectURL = jest.fn()
})

test('creates a post with text, visibility, and an attached image', async () => {
  render(<Feed />)
  await screen.findByText('No posts yet.')
  expect(screen.queryByPlaceholderText('Title')).not.toBeInTheDocument()
  await openComposer()

  fireEvent.change(screen.getByPlaceholderText('Title'), {
    target: { value: 'Morning tempo run' },
  })
  fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), {
    target: { value: 'Five quick miles before work.' },
  })
  fireEvent.click(screen.getByLabelText('Public'))

  const image = new File(['run photo'], 'run.png', { type: 'image/png' })
  fireEvent.change(screen.getByLabelText(/attach an image/i), {
    target: { files: [image] },
  })

  fireEvent.click(screen.getByRole('button', { name: 'Post' }))

  expect(await screen.findByRole('heading', { name: 'Morning tempo run' })).toBeInTheDocument()
  expect(screen.getByText('Five quick miles before work.')).toBeInTheDocument()

  const createRequest = mockApiFetch.mock.calls.find(
    ([url, options]) => url === ENDPOINTS.createPost && options?.method === 'POST',
  )
  expect(createRequest).toBeDefined()
  const payload = createRequest[1].body
  expect(payload).toBeInstanceOf(FormData)
  expect(payload.get('title')).toBe('Morning tempo run')
  expect(payload.get('content')).toBe('Five quick miles before work.')
  expect(payload.get('visibility')).toBe('public')
  expect(payload.get('image').name).toBe('run.png')
  expect(screen.queryByPlaceholderText('Title')).not.toBeInTheDocument()
})

test('requires a title before sending a create-post request', async () => {
  render(<Feed />)
  await screen.findByText('No posts yet.')
  await openComposer()

  fireEvent.click(screen.getByRole('button', { name: 'Post' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Add a title')
  expect(mockApiFetch).not.toHaveBeenCalledWith(
    ENDPOINTS.createPost,
    expect.objectContaining({ method: 'POST' }),
  )
})

test('shows an API error when the post cannot be created', async () => {
  createPostError = 'Post could not be saved'
  render(<Feed />)
  await screen.findByText('No posts yet.')
  await openComposer()

  fireEvent.change(screen.getByPlaceholderText('Title'), {
    target: { value: 'Evening recovery run' },
  })
  fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), {
    target: { value: 'Easy pace today.' },
  })
  fireEvent.click(screen.getByLabelText('Friends only'))
  fireEvent.click(screen.getByRole('button', { name: 'Post' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Post could not be saved')
  expect(screen.getByPlaceholderText('Title')).toBeInTheDocument()
})

test('includes validated run details in the post payload', async () => {
  render(<Feed />)
  await screen.findByText('No posts yet.')
  await openComposer()

  fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'Sunrise miles' } })
  fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), { target: { value: 'A steady morning run.' } })
  fireEvent.click(screen.getByLabelText('Public'))
  fireEvent.click(screen.getByLabelText(/add a run/i))
  fireEvent.change(screen.getByLabelText('Started at'), { target: { value: '2026-10-12T06:30' } })
  fireEvent.change(screen.getByPlaceholderText('5.00'), { target: { value: '5' } })
  fireEvent.change(screen.getByLabelText('Duration minutes'), { target: { value: '28' } })
  fireEvent.change(screen.getByLabelText('Duration seconds'), { target: { value: '30' } })
  fireEvent.click(screen.getByRole('button', { name: 'Post' }))

  expect(await screen.findByRole('heading', { name: 'Sunrise miles' })).toBeInTheDocument()
  const createRequest = mockApiFetch.mock.calls.find(
    ([url, options]) => url === ENDPOINTS.createPost && options?.method === 'POST',
  )
  const run = JSON.parse(createRequest[1].body.get('run'))
  expect(run).toMatchObject({
    distance_m: 5000,
    elapsed_seconds: 1710,
  })
  expect(run.started_at).toBe(new Date('2026-10-12T06:30').toISOString())
})

test('loads the next page of posts on demand', async () => {
  paginatedPosts = Array.from({ length: 7 }, (_, index) => ({
    id: `post-${index + 1}`,
    title: `Run update ${index + 1}`,
    content: 'A good run.',
    author: 'Test Runner',
    author_id: 'user-1',
  }))

  render(<Feed />)
  expect(await screen.findByRole('heading', { name: 'Run update 1' })).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { name: /Run update/ })).toHaveLength(5)
  fireEvent.click(screen.getByRole('button', { name: 'Load 5 more posts' }))

  expect(await screen.findByRole('heading', { name: 'Run update 7' })).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { name: /Run update/ })).toHaveLength(7)
})

test('follows a runner from their feed post', async () => {
  createdPosts = [{
    id: 'post-2',
    title: 'Track session',
    content: 'Intervals with the crew.',
    author: 'Another Runner',
    author_id: 'user-2',
  }]

  render(<Feed />)
  expect(await screen.findByRole('heading', { name: 'Track session' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Follow' }))

  await waitFor(() => {
    expect(mockApiFetch).toHaveBeenCalledWith(
      ENDPOINTS.follow,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ followed_id: 'user-2' }) }),
    )
  })
})

test('ranks valid runs by fastest elapsed-time pace', async () => {
  runsResponse = [
    {
      id: 'slow-run',
      username: 'Steady Runner',
      distance_m: 10000,
      elapsed_seconds: 3600,
      started_at: '2026-05-12T08:00:00.000Z',
    },
    {
      id: 'fast-run',
      username: 'Quick Runner',
      distance_m: 5000,
      elapsed_seconds: 1200,
      started_at: '2026-05-10T08:00:00.000Z',
    },
    {
      id: 'invalid-run',
      username: 'Missing Stats',
      distance_m: 8000,
      elapsed_seconds: null,
      started_at: '2026-05-14T08:00:00.000Z',
    },
  ]

  render(<Feed />)

  expect(await screen.findByText('Quick Runner')).toBeInTheDocument()
  const rankedRuns = screen.getAllByRole('listitem')
  expect(rankedRuns).toHaveLength(2)
  expect(within(rankedRuns[0]).getByText('Quick Runner')).toBeInTheDocument()
  expect(rankedRuns[0]).toHaveTextContent('4:00 /km')
  expect(within(rankedRuns[1]).getByText('Steady Runner')).toBeInTheDocument()
  expect(rankedRuns[1]).toHaveTextContent('6:00 /km')
  expect(screen.queryByText('Missing Stats')).not.toBeInTheDocument()
})
