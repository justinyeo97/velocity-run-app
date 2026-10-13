export function getRunPaceSeconds(run) {
  const distanceM = Number(run.distance_m)
  const elapsedSeconds = Number(run.elapsed_seconds)
  if (!Number.isFinite(distanceM) || distanceM <= 0 || !Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return null
  }
  return elapsedSeconds / (distanceM / 1000)
}

export function formatPace(secondsPerKm) {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return '—'
  const roundedSeconds = Math.round(secondsPerKm)
  const minutes = Math.floor(roundedSeconds / 60)
  const seconds = roundedSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatDuration(totalSeconds) {
  const seconds = Number(totalSeconds)
  if (!Number.isFinite(seconds)) return ''
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = Math.floor(seconds % 60)
  return [hours, minutes, remainder].map((part) => String(part).padStart(2, '0')).join(':')
}
