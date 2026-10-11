import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/login'
import Signup from './pages/signup'
import Login from './pages/login'
import Feed from './pages/feed'
import Friends from './pages/friends'
import Profile from './pages/profile'
import Runs from './pages/runs'
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css'

export const ENDPOINTS = {
  // signup: `${API_URL}/signup`, // POST { email, password, username }
  signup: 'https://soc-med-api-production.up.railway.app/auth/signup',
  // login: `${API_URL}/login`, // POST { email, password } -> token
  login: 'https://soc-med-api-production.up.railway.app/auth/login',
  // posts: `${API_URL}/posts`, // GET public + friends' posts
  posts: 'https://soc-med-api-production.up.railway.app/posts',
  // createPost: `${API_URL}/posts`, // POST { title, content, visibility } -> new post
  createPost: 'https://soc-med-api-production.up.railway.app/posts',
  // users: `${API_URL}/users`, // GET all users
  users: 'https://soc-med-api-production.up.railway.app/users',
  // friends: `${API_URL}/friends`, // GET the current user's friends
  friends: 'https://soc-med-api-production.up.railway.app/friends',
  // follow: `${API_URL}/follow`, // POST { followed_id } & GET all followed users
  follow: 'https://soc-med-api-production.up.railway.app/follow',
  // runs: `${API_URL}/runs`, // GET the current user's runs OR post a new run
  runs: 'https://soc-med-api-production.up.railway.app/runs',
}

function RequireAuth({ children }) {
  const { token, authReady } = useAuth()
  if (!authReady) return <main className="auth-card card">Loading your session…</main>
  return token ? children : <Navigate to="/login" replace />
}

function GuestOnly({ children }) {
  const { token, authReady } = useAuth()
  if (!authReady) return <main className="auth-card card">Loading your session…</main>
  return token ? <Navigate to="/feed" replace /> : children
}

const navItems = [
  { label: 'Feed', path: '/feed', icon: '\u2726' },
  { label: 'Friends', path: '/friends', icon: '\u{1F91D}' },
  { label: 'Profile', path: '/profile', icon: '\u25C9' },
  { label: 'My Runs', path: '/runs', icon: '\u2197' },
]

function Nav() {
  const { token, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  if (!token) return null

  function handleLogout() {
    logout()
    setOpen(false)
    navigate('/login', { replace: true })
  }

  return (
    <>
      <button
        className={`menu-toggle${open ? ' is-open' : ''}`}
        type="button"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        aria-controls="site-sidebar"
        onClick={() => setOpen((current) => !current)}
      >
        <span /><span /><span />
      </button>
      {open && <button className="sidebar-scrim" type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)} />}
      <aside id="site-sidebar" className={`site-sidebar${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <Link className="sidebar-brand" to="/feed" tabIndex={open ? 0 : -1}>
          <span className="brand-mark" aria-hidden="true">{'\u26A1'}</span>
          <span>VELOCITY<span className="brand-subtitle">RUN CLUB</span></span>
        </Link>
        <p className="sidebar-label">YOUR SPACE</p>
        <nav aria-label="Main navigation">
          {navItems.map(({ label, path, icon }) => (
            <Link
              key={path}
              to={path}
              tabIndex={open ? 0 : -1}
              className={`sidebar-link${location.pathname === path ? ' active' : ''}`}
              aria-current={location.pathname === path ? 'page' : undefined}
            >
              <span className="sidebar-icon" aria-hidden="true">{icon}</span>{label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer"><span className="pulse-dot" />EVERY SECOND COUNTS</div>
        <button
          className="sidebar-logout"
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={handleLogout}
        >
          <span className="sidebar-icon" aria-hidden="true">{'\u21AA'}</span>
          Log out
        </button>
      </aside>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="signup" element={<GuestOnly><Signup /></GuestOnly>} />
          <Route path="login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="feed" element={<RequireAuth><Feed /></RequireAuth>} />
          <Route path="friends" element={<RequireAuth><Friends /></RequireAuth>} />
          <Route path="profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="runs" element={<RequireAuth><Runs /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
