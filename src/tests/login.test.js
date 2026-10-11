import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAuth } from '../context/login'
import Login from '../pages/login'

jest.mock('../context/login', () => ({
  useAuth: jest.fn(),
}))

const mockLogin = jest.fn()
const mockLoginWithGoogle = jest.fn()

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockLogin.mockReset().mockResolvedValue(undefined)
  mockLoginWithGoogle.mockReset().mockResolvedValue(undefined)
  useAuth.mockReturnValue({
    login: mockLogin,
    loginWithGoogle: mockLoginWithGoogle,
  })
})

test('submits email and password through the auth context', async () => {
  renderLogin()

  fireEvent.change(screen.getByPlaceholderText(/email/i), {
    target: { value: 'test@example.com' },
  })
  fireEvent.change(screen.getByPlaceholderText(/password/i), {
    target: { value: 'password123' },
  })
  fireEvent.click(screen.getByRole('button', { name: /log in/i }))

  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
  })
})

test('starts Google sign-in through the auth context', async () => {
  renderLogin()

  fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

  await waitFor(() => {
    expect(mockLoginWithGoogle).toHaveBeenCalledTimes(1)
  })
})
