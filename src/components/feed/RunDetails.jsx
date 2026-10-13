import { formatDuration, formatPace, getRunPaceSeconds } from './runFormatters'

function RunMetric({ icon, value, label }) {
  return (
    <span className="post-run-stat">
      {icon && <svg className="post-run-stat-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">{icon}</svg>}
      <span className="post-run-stat-copy"><strong>{value}</strong><small>{label}</small></span>
    </span>
  )
}

export default function RunDetails({ run }) {
  const distanceKm = Number(run.distance_m) / 1000
  const extraMetrics = [
    Number(run.elevation_gain_m) > 0 && { value: `${run.elevation_gain_m} m`, label: 'elevation' },
    run.average_heart_rate != null && { value: `${run.average_heart_rate} bpm`, label: 'average heart rate' },
    run.max_heart_rate != null && { value: `${run.max_heart_rate} bpm`, label: 'maximum heart rate' },
    run.moving_seconds != null && { value: formatDuration(run.moving_seconds), label: 'moving time' },
  ].filter(Boolean)

  return (
    <section className="post-run-card" aria-label="Run details">
      <div className="post-run-heading">
        <span className="post-run-bolt" aria-hidden="true">{ '\u26A1' }</span>
        <div>
          <span className="post-run-kicker">RUN RECORDED</span>
          <h4>{run.title || 'Run recorded'}</h4>
        </div>
        <span className="run-card-tag">ACTIVITY</span>
      </div>
      <div className="post-run-stats post-run-primary-stats" role="group" aria-label="Key run stats">
        <RunMetric
          icon={<><path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.3" /></>}
          value={Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm.toFixed(2) : '—'}
          label="km distance"
        />
        <RunMetric
          icon={<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.7 1.8M9 2h6M12 2v3" /></>}
          value={formatDuration(run.elapsed_seconds)}
          label="duration"
        />
        <RunMetric
          icon={<><path d="M4 18a8 8 0 1 1 16 0" /><path d="m12 14 4-4M7 18h.01M17 18h.01" /></>}
          value={formatPace(getRunPaceSeconds(run))}
          label="min/km pace"
        />
      </div>
      {extraMetrics.length > 0 && (
        <dl className="post-run-extra-stats" aria-label="Additional run stats">
          {extraMetrics.map(({ value, label }) => (
            <div className="post-run-extra-stat" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {run.started_at && <time className="post-run-date" dateTime={run.started_at}>{new Date(run.started_at).toLocaleString()}</time>}
    </section>
  )
}
