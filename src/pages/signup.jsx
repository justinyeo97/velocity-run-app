import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/login'

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
    <main className="auth-page">
      <Link className="auth-brand" to="/signup" aria-label="Velocity Run Club home">
        <span className="brand-mark" aria-hidden="true">{ '\u26A1' }</span>
        <span>VELOCITY<span className="brand-subtitle">RUN CLUB</span></span>
      </Link>

      <form className="auth-card card" onSubmit={handleSubmit}>
        <div className="auth-heading">
          <span className="auth-kicker">BECOME SPEED</span>
          <h1>Sign up</h1>
          <p className="auth-intro">Connect with runners and share your progress.</p>
        </div>

        <button className="google-login-button" type="button" onClick={handleGoogleSignup} disabled={googlePending}>
          <span className="google-login-mark" aria-hidden="true">G</span>
          {googlePending ? 'Connecting to Google...' : 'Continue with Google'}
        </button>

        <div className="auth-divider"><span>OR SIGN UP WITH EMAIL</span></div>

        <label className="auth-field" htmlFor="signup-username">Username</label>
        <input
          id="signup-username"
          className="form-control auth-input"
          type="text"
          placeholder="Username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label className="auth-field" htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          className="form-control auth-input"
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="auth-field" htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          className="form-control auth-input"
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="btn auth-submit" type="submit">Sign up</button>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
      <p className="auth-tagline"><span className="pulse-dot" />EVERY SECOND COUNTS</p>
    </main>
  )
}
