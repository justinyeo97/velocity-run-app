import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/login'
import AuthScreen from '../components/auth/AuthScreen'
import { AuthDivider, AuthTextField, GoogleSignInButton } from '../components/auth/AuthControls'

export default function Login() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(() => new URLSearchParams(window.location.search).get('error_description') || '')
  const [googlePending, setGooglePending] = useState(false)

  async function handleGoogleLogin() {
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
      await login(email, password)
      navigate('/feed')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AuthScreen
      mode="login"
      eyebrow="YOUR CREW IS AHEAD"
      title="Welcome back."
      description="Sign in and pick up where your next run begins."
      storyTitle={<>THE ROAD<br /><span>IS YOURS.</span></>}
      storyDescription="Keep your miles moving with a community that runs at your pace."
      switchPrompt="New to the club?"
      switchAction="Create an account"
      switchTo="/signup"
    >
      <form className="auth-credentials" onSubmit={handleSubmit}>
        <GoogleSignInButton onClick={handleGoogleLogin} pending={googlePending} />
        <AuthDivider>OR SIGN IN WITH EMAIL</AuthDivider>

        <AuthTextField
          id="login-email"
          label="Email address"
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <AuthTextField
          id="login-password"
          label="Password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button className="auth-primary-action" type="submit">
          <span>Log in</span><span aria-hidden="true">→</span>
        </button>
        {error && <p className="auth-feedback" role="alert">{error}</p>}
      </form>
    </AuthScreen>
  )
}
