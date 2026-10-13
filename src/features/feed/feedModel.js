import { getRunPaceSeconds } from '../../components/feed/runFormatters'

export const FEED_PAGE_SIZE = 5
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024
export const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export const EMPTY_RUN_DRAFT = {
  title: '',
  startedAt: '',
  distanceKm: '',
  hours: '0',
  minutes: '0',
  seconds: '0',
  movingSeconds: '',
  elevationGain: '',
  averageHeartRate: '',
  maxHeartRate: '',
  source: 'manual',
}

function collectionFrom(response, keys) {
  if (Array.isArray(response)) return response
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key]
  }
  if (Array.isArray(response?.data)) return response.data
  for (const key of keys) {
    if (Array.isArray(response?.data?.[key])) return response.data[key]
  }
  return null
}

export function normalizeRun(value) {
  let run = value
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
    max_heart_rate: details.max_heart_rate ?? details.maxHeartRate,
    started_at: details.started_at ?? details.startedAt,
  }
}

export function normalizePosts(response) {
  const rows = collectionFrom(response, ['posts'])
  if (!rows) throw new Error('The posts API returned an unexpected response.')

  return rows.map((post) => ({
    ...post,
    image_url: post.image_url ?? post.imageUrl ?? null,
    run: normalizeRun(
      post.run
      ?? post.run_info
      ?? post.runInfo
      ?? post.run_data
      ?? post.runData
      ?? (Array.isArray(post.runs) ? post.runs[0] : null),
    ),
  }))
}

export function normalizeRuns(response) {
  const rows = collectionFrom(response, ['runs'])
  if (!rows) throw new Error('The runs API returned an unexpected response.')
  return rows.map(normalizeRun).filter(Boolean)
}

export function normalizeFriends(response) {
  return collectionFrom(response, ['friends', 'users']) ?? []
}

export function normalizeFollowing(response) {
  return collectionFrom(response, ['following', 'relationships']) ?? []
}

export function hasAnotherPostPage(response, totalRows, pageCount, offset) {
  const pagination = response?.pagination ?? response?.meta?.pagination ?? response?.meta ?? {}
  const serverAnswer = response?.has_more
    ?? response?.hasMore
    ?? pagination.has_more
    ?? pagination.hasMore
  if (typeof serverAnswer === 'boolean') return serverAnswer

  const total = Number(response?.total ?? pagination.total ?? response?.count ?? pagination.count)
  if (Number.isFinite(total)) return offset + pageCount < total

  if (totalRows > FEED_PAGE_SIZE) return offset + pageCount < totalRows
  return pageCount === FEED_PAGE_SIZE
}

export function resolvePostAuthorId(post) {
  const profiles = [post.author, post.user].filter((value) => value && typeof value === 'object')
  const candidates = [
    post.author_id,
    post.user_id,
    post.authorId,
    post.userId,
    ...profiles.flatMap((profile) => [profile.id, profile.user_id, profile.userId]),
  ]
  return candidates.find((candidate) => candidate !== null && candidate !== undefined)
}

export function buildRunPayload(draft) {
  if (!draft.startedAt) return { error: 'Add the run date and start time' }

  const startedAt = new Date(draft.startedAt)
  if (Number.isNaN(startedAt.getTime())) return { error: 'Enter a valid run date and start time' }

  const distanceKm = Number(draft.distanceKm)
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return { error: 'Enter a run distance greater than 0 km' }
  const distanceM = Math.round(distanceKm * 1000)
  if (distanceM <= 0) return { error: 'Run distance must be at least 1 meter' }

  const elapsedParts = [draft.hours, draft.minutes, draft.seconds].map((part) => part === '' ? 0 : Number(part))
  if (elapsedParts.some((part) => !Number.isInteger(part) || part < 0)) {
    return { error: 'Run duration must use whole, non-negative values' }
  }

  const [hours, minutes, seconds] = elapsedParts
  if (minutes > 59 || seconds > 59) return { error: 'Run duration minutes and seconds must be below 60' }

  const elapsedSeconds = hours * 3600 + minutes * 60 + seconds
  if (elapsedSeconds <= 0) return { error: 'Enter a run duration greater than 0' }

  const optionalNumber = (value) => value === '' ? null : Number(value)
  const movingSeconds = optionalNumber(draft.movingSeconds)
  const elevationGainM = optionalNumber(draft.elevationGain)
  const averageHeartRate = optionalNumber(draft.averageHeartRate)
  const maxHeartRate = optionalNumber(draft.maxHeartRate)

  if (movingSeconds !== null && (!Number.isInteger(movingSeconds) || movingSeconds < 0 || movingSeconds > elapsedSeconds)) {
    return { error: 'Moving time must be whole seconds and cannot exceed total duration' }
  }
  if (elevationGainM !== null && (!Number.isFinite(elevationGainM) || elevationGainM < 0)) {
    return { error: 'Elevation gain must be a non-negative number' }
  }

  for (const [label, value] of [['Average heart rate', averageHeartRate], ['Maximum heart rate', maxHeartRate]]) {
    if (value !== null && (!Number.isInteger(value) || value < 1 || value > 250)) {
      return { error: `${label} must be a whole number between 1 and 250` }
    }
  }
  if (averageHeartRate !== null && maxHeartRate !== null && maxHeartRate < averageHeartRate) {
    return { error: 'Maximum heart rate cannot be below average heart rate' }
  }
  if (draft.source.length > 50) return { error: 'Run source must be 50 characters or fewer' }

  return {
    payload: {
      title: draft.title.trim() || null,
      started_at: startedAt.toISOString(),
      distance_m: distanceM,
      elapsed_seconds: elapsedSeconds,
      moving_seconds: movingSeconds,
      elevation_gain_m: elevationGainM,
      average_heart_rate: averageHeartRate,
      max_heart_rate: maxHeartRate,
      source: draft.source.trim() || 'manual',
    },
  }
}

export function rankFastestRuns(response, limit = 5) {
  return normalizeRuns(response)
    .filter((run) => getRunPaceSeconds(run) !== null)
    .sort((first, second) => {
      const paceDifference = getRunPaceSeconds(first) - getRunPaceSeconds(second)
      if (paceDifference !== 0) return paceDifference

      const distanceDifference = Number(second.distance_m) - Number(first.distance_m)
      if (distanceDifference !== 0) return distanceDifference

      const firstDate = Date.parse(first.started_at) || 0
      const secondDate = Date.parse(second.started_at) || 0
      return secondDate - firstDate
    })
    .slice(0, limit)
}
