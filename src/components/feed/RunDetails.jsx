import { formatDuration } from './runFormatters'

function RunMetric({ icon, value, label }) {
  return (
    <span className="post-run-stat">
      {icon && <svg className="post-run-stat-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">{icon}</svg>}
      <span className="post-run-stat-copy"><strong>{value}</strong><small>{label}</small></span>
    </span>
  )
}

export default function RunDetails({ run }) {
  return (
    <section className="post-run-card" aria-label="Run details">
      <div className="post-run-heading">
        <span className="post-run-bolt" aria-hidden="true">{ '\u26A1' }</span>
        <div>
          <span className="post-run-kicker">RUN LOG</span>
          <h4>{run.title || 'Run recorded'}</h4>
        </div>
        <span className="run-card-tag">ACTIVITY</span>
      </div>
      <div className="post-run-stats">
        <RunMetric
          icon={<><path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.3" /></>}
          value={(Number(run.distance_m) / 1000).toFixed(2)}
          label="km"
        />
        <RunMetric
          icon={<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.7 1.8M9 2h6M12 2v3" /></>}
          value={formatDuration(run.elapsed_seconds)}
          label="duration"
        />
        {Number(run.elevation_gain_m) > 0 && <RunMetric value={run.elevation_gain_m} label="m elevation" />}
        {run.average_heart_rate != null && (
          <RunMetric
            icon={<><path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.3 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /><path d="M4 12h4l2-3 3.2 6 2-3H20" /></>}
            value={run.average_heart_rate}
            label="avg bpm"
          />
        )}
        {run.max_heart_rate != null && <RunMetric value={run.max_heart_rate} label="max bpm" />}
        {run.moving_seconds != null && <RunMetric value={formatDuration(run.moving_seconds)} label="moving time" />}
      </div>
      {run.started_at && <time className="post-run-date" dateTime={run.started_at}>{new Date(run.started_at).toLocaleString()}</time>}
    </section>
  )
}
