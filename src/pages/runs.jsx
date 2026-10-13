import { useEffect, useState } from 'react'
import { useAuth } from '../context/login'
import { getRuns } from '../services/runs'

function normalizeRun(run) {
  if (typeof run === 'string') {
    try {
      run = JSON.parse(run)
    } catch {
      return null
    }
  }

  if (!run || typeof run !== 'object') return null
  const details = run.run && typeof run.run === 'object' ? run.run : run

  return {
    ...details,
    distance_m: details.distance_m ?? details.distanceM,
    elapsed_seconds: details.elapsed_seconds ?? details.elapsedSeconds,
    moving_seconds: details.moving_seconds ?? details.movingSeconds,
    elevation_gain_m: details.elevation_gain_m ?? details.elevationGainM,
    average_heart_rate: details.average_heart_rate ?? details.averageHeartRate,
    started_at: details.started_at ?? details.startedAt ?? details.created_at,
  }
}

function normalizeRunsResponse(response) {
  const rows = Array.isArray(response)
    ? response
    : response?.runs ?? response?.data?.runs ?? response?.data

  if (!Array.isArray(rows)) throw new Error('The runs API returned an unexpected response.')
  return rows.map(normalizeRun).filter(Boolean)
}

function getRunOwnerId(run) {
  return run.user_id ?? run.userId ?? run.author_id ?? run.authorId
    ?? run.user?.id ?? run.author?.id ?? run.users?.id
}

function formatDuration(totalSeconds) {
  if (totalSeconds == null || totalSeconds === '') return 'N/A'
  const seconds = Number(totalSeconds)
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = Math.floor(seconds % 60)
  return [hours, minutes, remainder].map((part) => String(part).padStart(2, '0')).join(':')
}

function formatRunDate(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Date unavailable'
  return new Date(value).toLocaleString()
}

export default function Runs() {
  const { apiFetch, user } = useAuth()
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getRuns(apiFetch, { cache: 'no-store' })
      .then((response) => {
        const userRuns = normalizeRunsResponse(response).filter((run) => {
          const ownerId = getRunOwnerId(run)
          return ownerId == null || user?.id == null || String(ownerId) === String(user.id)
        })
        userRuns.sort((a, b) => {
          const aDate = new Date(a.started_at).getTime()
          const bDate = new Date(b.started_at).getTime()
          return (Number.isNaN(bDate) ? -Infinity : bDate) - (Number.isNaN(aDate) ? -Infinity : aDate)
        })

        if (active) {
          setRuns(userRuns)
          setError('')
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Could not load your runs.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [apiFetch, user?.id])

  if (!loading && !error && runs.length === 0) {
    return (
      <main className="coming-soon">
        <span className="page-eyebrow">ON THE MOVE</span>
        <h1>My Runs</h1>
        <p>Every mile adds up. Your run history is coming soon.</p>
        <span className="coming-soon-bolt" aria-hidden="true">{ '\u26A1' }</span>
      </main>
    )
  }

  return (
    <main className="club-runs">
      <header className="runs-page-heading">
        <span className="page-eyebrow">ON THE MOVE</span>
        <h1>My Runs</h1>
        <p>Every mile adds up. Here is your running history, newest first.</p>
      </header>

      {loading && <p className="runs-page-state" role="status">Loading your runs...</p>}
      {error && <p className="runs-page-state runs-page-error" role="alert">Could not load your runs: {error}</p>}

      {!loading && !error && (
        <section className="runs-history" aria-label="Your run history">
          {runs.map((run, index) => (
            <article className="club-post runs-history-item" key={run.id ?? `${run.started_at}-${index}`}>
              <div className="post-run-heading">
                <span className="post-run-bolt" aria-hidden="true">{ '\u26A1' }</span>
                <div>
                  <span className="post-run-kicker">RUN LOG</span>
                  <h2>{run.title || 'Run recorded'}</h2>
                </div>
              </div>
              <div className="post-run-stats">
                <span className="post-run-stat">
                  <span className="post-run-stat-copy">
                    <strong>{run.distance_m != null && Number.isFinite(Number(run.distance_m)) ? (Number(run.distance_m) / 1000).toFixed(2) : 'N/A'}</strong>
                    <small>km</small>
                  </span>
                </span>
                <span className="post-run-stat">
                  <span className="post-run-stat-copy">
                    <strong>{formatDuration(run.elapsed_seconds)}</strong>
                    <small>duration</small>
                  </span>
                </span>
                {run.moving_seconds != null && (
                  <span className="post-run-stat">
                    <span className="post-run-stat-copy">
                      <strong>{formatDuration(run.moving_seconds)}</strong>
                      <small>moving time</small>
                    </span>
                  </span>
                )}
                {Number(run.elevation_gain_m) > 0 && (
                  <span className="post-run-stat">
                    <span className="post-run-stat-copy">
                      <strong>{run.elevation_gain_m}</strong>
                      <small>m elevation</small>
                    </span>
                  </span>
                )}
                {run.average_heart_rate != null && (
                  <span className="post-run-stat">
                    <span className="post-run-stat-copy">
                      <strong>{run.average_heart_rate}</strong>
                      <small>avg bpm</small>
                    </span>
                  </span>
                )}
              </div>
              <time className="post-run-date" dateTime={run.started_at || undefined}>
                {formatRunDate(run.started_at)}
              </time>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}
