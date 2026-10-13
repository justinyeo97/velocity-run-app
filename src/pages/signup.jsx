import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthScreen from '../components/auth/AuthScreen'
import { AuthDivider, AuthTextField, GoogleSignInButton } from '../components/auth/AuthControls'

export default function Signup() {
  const { signup, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [googlePending, setGooglePending] = useState(false)

  async function handleGoogleSignup() {
    setError('')
    setGooglePending(true)
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(err.message)
      setGooglePending(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await signup(email, password, username)
      navigate('/login')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AuthScreen
      mode="signup"
      eyebrow="JOIN THE RUNNING COMMUNITY"
      title="Find your pace."
      description="Create an account to share runs and meet your crew."
      storyTitle={<>FIND YOUR<br /><span>RUNNING CREW.</span></>}
      storyDescription="Small steps. Shared miles. A club that keeps you showing up."
      switchPrompt="Already part of the club?"
      switchAction="Log in"
      switchTo="/login"
    >
      <form className="auth-credentials" onSubmit={handleSubmit}>
        <GoogleSignInButton onClick={handleGoogleSignup} pending={googlePending} />
        <AuthDivider>OR CREATE AN ACCOUNT WITH EMAIL</AuthDivider>

        <AuthTextField
          id="signup-username"
          label="Username"
          type="text"
          placeholder="Choose a username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <AuthTextField
          id="signup-email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <AuthTextField
          id="signup-password"
          label="Password"
          type="password"
          placeholder="Create a password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button className="auth-primary-action" type="submit">
          <span>Create account</span><span aria-hidden="true">→</span>
        </button>
        {error && <p className="auth-feedback" role="alert">{error}</p>}
      </form>
    </AuthScreen>
  )
}
