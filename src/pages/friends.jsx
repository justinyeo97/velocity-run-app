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
            : users.length > 0 && <>
              <div className="friends-list-heading">
                <div>
                  <span className="friends-list-kicker">YOUR RUNNING CIRCLE</span>
                  <h2>{users.length === 1 ? 'Your first running partner' : users.length === 2 ? 'Your running partners' : 'Your running crew'}</h2>
                </div>
                <span className="friends-count-pill">{users.length} {users.length === 1 ? 'friend' : 'friends'}</span>
              </div>
              <div className={`friends-crew-layout friends-crew-layout--${users.length === 1 ? 'solo' : users.length === 2 ? 'duo' : 'group'}`}>
                <ul className={`friends-grid friends-grid--${users.length === 1 ? 'solo' : users.length === 2 ? 'duo' : 'group'} list-unstyled`}>
                  {users.map((friend, index) => {
                    const name = getFriendName(friend)
                    const avatar = friend.avatar_url || friend.avatarUrl || friend.profile_image_url || friend.image_url || friend.picture
                    const id = friend.id ?? friend.user_id ?? friend.userId ?? friend.friend_id ?? friend.friendId ?? `${name}-${index}`
                    return (
                      <li className="friend-card" key={id}>
                        <div className="friend-card-topline">
                          <span>CREW MEMBER</span>
                          <span>{String(index + 1).padStart(2, '0')}</span>
                        </div>
                        <div className="friend-card-person">
                          {avatar
                            ? <img className="friend-avatar" src={avatar} alt={`${name}'s profile`} />
                            : <span className="friend-avatar friend-avatar-fallback" aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>}
                          <span className="friend-card-identity">
                            <span className="friend-card-caption">RUNNING PARTNER</span>
                            <span className="friend-name">{name}</span>
                          </span>
                        </div>
                        <div className="friend-card-footer">
                          <span>In your running circle</span>
                          <span className="friend-card-bolt" aria-hidden="true">{ '\u26A1' }</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                {users.length <= 2 && (
                  <aside className="friends-crew-note" aria-label="Your running community">
                    <span className="crew-note-label">KEEP THE CREW CLOSE</span>
                    <div className="crew-note-count">
                      <strong>{String(users.length).padStart(2, '0')}</strong>
                      <span>{users.length === 1 ? 'RUNNING PARTNER' : 'RUNNING PARTNERS'}</span>
                    </div>
                    <h2>{users.length === 1 ? 'Every great crew starts with one.' : 'Good miles are better shared.'}</h2>
                    <p>Share your next update with your running circle and keep the conversation moving.</p>
                    <Link className="friends-feed-link" to="/feed">Visit the club feed <span aria-hidden="true">{ '\u2192' }</span></Link>
                    <span className="crew-note-bolt" aria-hidden="true">{ '\u26A1' }</span>
                  </aside>
                )}
              </div>
            </>}
      </div>
    </main>
  )
}
