import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/login'

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
    <main className="auth-page">
      <Link className="auth-brand" to="/login" aria-label="Velocity Run Club home">
        <span className="brand-mark" aria-hidden="true">{ '\u26A1' }</span>
        <span>VELOCITY<span className="brand-subtitle">RUN CLUB</span></span>
      </Link>

      <form className="auth-card card" onSubmit={handleSubmit}>
        <div className="auth-heading">
          <span className="auth-kicker">WELCOME BACK, RUNNER</span>
          <h1>Log in</h1>
          <p className="auth-intro">Your crew is ready when you are.</p>
        </div>

        <button className="google-login-button" type="button" onClick={handleGoogleLogin} disabled={googlePending}>
          <span className="google-login-mark" aria-hidden="true">G</span>
          {googlePending ? 'Connecting to Google...' : 'Continue with Google'}
        </button>

        <div className="auth-divider"><span>OR CONTINUE WITH EMAIL</span></div>

        <label className="auth-field" htmlFor="login-email">Email</label>
        <input
          id="login-email"
          className="form-control auth-input"
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="auth-field" htmlFor="login-password">Password</label>
        <input
          id="login-password"
          className="form-control auth-input"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="btn auth-submit" type="submit">Log in</button>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <p className="auth-switch">No account yet? <Link to="/signup">Sign up</Link></p>
      </form>
      <p className="auth-tagline"><span className="pulse-dot" />EVERY SECOND COUNTS</p>
    </main>
  )
}
