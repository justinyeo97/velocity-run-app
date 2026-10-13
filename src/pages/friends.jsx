import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/login'
import { getFriends as fetchFriends } from '../services/friends'

function getFriends(data) {
  const friends = Array.isArray(data)
    ? data
    : data?.friends ?? data?.users ?? data?.data?.friends ?? data?.data?.users ?? data?.data
  return Array.isArray(friends) ? friends : []
}

function getFriendName(friend) {
  return friend.username || friend.full_name || friend.fullName || friend.name
    || friend.email?.split('@')[0] || 'Runner'
}

export default function Friends() {
  const { apiFetch } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchFriends(apiFetch, { cache: 'no-store' })
      .then((data) => {
        if (active) setUsers(getFriends(data))
      })
      .catch((err) => {
        if (active) setError(err.message || 'Your crew could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [apiFetch])

  return (
    <main className="club-friends">
      <div className="friends-page-content">
        <header className="friends-page-heading">
          <span className="page-eyebrow">YOUR RUNNING COMMUNITY</span>
          <h1>My Crew</h1>
          <p>Training partners, familiar faces, and the people who keep you moving.</p>
          <span className="friends-heading-bolt" aria-hidden="true">{ '\u26A1' }</span>
        </header>

        {error && <p className="alert alert-danger page-error" role="alert">{error}</p>}

        {loading
          ? <p className="friends-state" role="status">Loading your crew...</p>
          : users.length === 0 && !error
            ? <section className="friends-empty-state" aria-labelledby="friends-empty-title">
              <span className="friends-empty-mark" aria-hidden="true">{ '\u26A1' }</span>
              <span className="post-run-kicker">YOUR CREW IS JUST GETTING STARTED</span>
              <h2 id="friends-empty-title">You will never run alone</h2>
              <p>Your running community will show up here as you connect with friends.</p>
              <Link className="friends-feed-link" to="/feed">Head to the club feed <span aria-hidden="true">{ '\u2192' }</span></Link>
            </section>
            : <>
              <div className="friends-list-heading">
                <h2>Your Fellow Speedsters</h2>
                <span>{users.length} {users.length === 1 ? 'friend' : 'friends'}</span>
              </div>
              <ul className="friends-grid list-unstyled">
                {users.map((friend, index) => {
                  const name = getFriendName(friend)
                  const avatar = friend.avatar_url || friend.avatarUrl || friend.profile_image_url || friend.image_url || friend.picture
                  const id = friend.id ?? friend.user_id ?? friend.userId ?? friend.friend_id ?? friend.friendId ?? `${name}-${index}`
                  return (
                    <li className="friend-card" key={id}>
                      {avatar
                        ? <img className="friend-avatar" src={avatar} alt={`${name}'s profile`} />
                        : <span className="friend-avatar friend-avatar-fallback" aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>}
                      <span className="friend-name">{name}</span>
                      <span className="friend-card-bolt" aria-hidden="true">{ '\u26A1' }</span>
                    </li>
                  )
                })}
              </ul>
            </>}
      </div>
    </main>
  )
}
