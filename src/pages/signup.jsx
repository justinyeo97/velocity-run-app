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
    <form className="auth-card card" onSubmit={handleSubmit}>
      <div className="auth-mascot" aria-hidden="true">{'\u26A1'}</div>
      <span className="auth-kicker">JOIN THE RUNNING CLUB</span>
      <h1>Sign up</h1>
      <p className="auth-intro">Connect with runners and share your progress.</p>
      <button className="btn btn-outline-secondary w-100 mb-3" type="button" onClick={handleGoogleSignup} disabled={googlePending}>
        {googlePending ? 'Connecting to Google...' : 'Continue with Google'}
      </button>
      <p className="auth-intro">Or sign up with email</p>
      <p><input className="form-control" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} /></p>
      <p><input className="form-control" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required /></p>
      <p><input className="form-control" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required /></p>
      <button className="btn btn-primary auth-submit" type="submit">Sign up</button>
      {error && <p className="alert alert-danger auth-error" role="alert">{error}</p>}
      <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
    </form>
  )
}
