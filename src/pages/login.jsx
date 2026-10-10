import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/login'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

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
    <form className="auth-card card" onSubmit={handleSubmit}>
      <div className="auth-mascot" aria-hidden="true">{'\u26A1'}</div>
      <span className="auth-kicker">WELCOME BACK, RUNNER</span>
      <h1>Log in</h1>
      <p className="auth-intro">Your crew is ready when you are.</p>
      <p><input className="form-control" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required /></p>
      <p><input className="form-control" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required /></p>
      <button className="btn btn-primary auth-submit" type="submit">Log in</button>
      {error && <p className="alert alert-danger auth-error" role="alert">{error}</p>}
      <p className="auth-switch">No account yet? <Link to="/signup">Sign up</Link></p>
    </form>
  )
}
