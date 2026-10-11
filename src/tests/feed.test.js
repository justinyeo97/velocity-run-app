import { fireEvent, render, screen, within } from '@testing-library/react'
import { useAuth } from '../context/login'
import { ENDPOINTS } from '../App'
import Feed from '../pages/feed'

jest.mock('../context/login', () => ({
  useAuth: jest.fn(),
}))

jest.mock('../App', () => ({
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

async function openComposer() {
  fireEvent.click(screen.getByRole('button', { name: 'Create a post' }))
  expect(await screen.findByRole('heading', { name: 'Share an update' })).toBeInTheDocument()
}

beforeEach(() => {
  createdPosts = []
  createPostError = ''
  runsResponse = []
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
      }
      createdPosts = [newPost, ...createdPosts]
      return newPost
    }

    if (url === ENDPOINTS.posts || url.startsWith(`${ENDPOINTS.posts}?`)) return createdPosts
    if (url === ENDPOINTS.runs) return runsResponse
    if (url === ENDPOINTS.follow || url === ENDPOINTS.friends) return []
    throw new Error(`Unexpected API request: ${url}`)
  })

  useAuth.mockReturnValue({
    apiFetch: mockApiFetch,
    user: { id: 'user-1' },
  })

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
