import { useEffect, useState } from 'react'
import { useAuth } from '../context/login'
import { ENDPOINTS } from '../App'

export default function Friends() {
  const { apiFetch } = useAuth()
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch(ENDPOINTS.friends)
      .then((data) => setUsers(Array.isArray(data) ? data : data.users || []))
      .catch((err) => setError(err.message))
  }, [apiFetch])

  return (
    <div className="club-friends">
      <header className="feed-heading">
        <div>
          <span className="feed-kicker">YOUR RUNNING COMMUNITY</span>
          <h1>My Crew <span aria-hidden="true">{'\u26A1'}</span></h1>
          <p>Your friends, training partners, and fellow runners.</p>
        </div>
        <span className="feed-mascot" aria-hidden="true">{'\u{1F3C3}'}</span>
      </header>
      {error && <p className="alert alert-danger page-error" role="alert">{error}</p>}
      <ul className="friends-grid list-unstyled">
        {users.map((user) => (
          <li className="friend-card card" key={user.id}>
            <span className="friend-avatar" aria-hidden="true">{'\u{1F3C3}'}</span>
            <span className="friend-name">{user.username || user.email}</span>
            <span className="friend-sparkle" aria-hidden="true">{'\u2726'}</span>
          </li>
        ))}
      </ul>
    </div>
  ) 
}
