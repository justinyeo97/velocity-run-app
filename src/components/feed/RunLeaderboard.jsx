import { formatDuration, formatPace, getRunPaceSeconds } from './runFormatters'

export default function RunLeaderboard({ runs, loading, error }) {
  return (
    <aside className="feed-sidebar" aria-label="Run leaderboard">
      <section className="top-runs-card">
        <div className="top-runs-heading">
          <span className="top-runs-bolt" aria-hidden="true">{ '\u26A1' }</span>
          <div>
            <span className="post-run-kicker">CREW STATS</span>
            <h2>Fastest runs</h2>
          </div>
          <span className="leaderboard-unit">PACE / KM</span>
        </div>
        <p className="top-runs-caption">Ranked by average pace using elapsed time.</p>

        {loading && <p className="top-runs-state">Loading runs...</p>}
        {!loading && error && <p className="top-runs-state top-runs-error" role="alert">Could not load runs: {error}</p>}
        {!loading && !error && runs.length === 0 && (
          <p className="top-runs-state">No runs to show yet. Share a run in a feed post to get started.</p>
        )}
        {!loading && !error && runs.length > 0 && (
          <ol className="top-runs-list">
            {runs.map((run, index) => (
              <li className="top-run-row" key={run.id ?? `${run.user_id}-${run.started_at}-${index}`}>
                <span className="top-run-rank">{String(index + 1).padStart(2, '0')}</span>
                <div className="top-run-details">
                  <strong>{run.username || run.author || run.user?.username || 'Runner'}</strong>
                  <span>{run.title || 'Run'} · {run.started_at ? new Date(run.started_at).toLocaleDateString() : 'Date unavailable'}</span>
                </div>
                <div className="top-run-metrics">
                  <strong>{formatPace(getRunPaceSeconds(run))} <small>/km</small></strong>
                  <span>{(Number(run.distance_m) / 1000).toFixed(2)} km · {formatDuration(run.elapsed_seconds)}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  )
}
