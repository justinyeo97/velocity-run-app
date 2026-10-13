import { useEffect, useState } from 'react'
import { getRuns } from '../../services/runs'
import { rankFastestRuns } from './feedModel'

export function useRunLeaderboard(apiFetch) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)

    getRuns(apiFetch, { cache: 'no-store' })
      .then((response) => {
        if (active) {
          setRuns(rankFastestRuns(response))
          setError('')
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [apiFetch])

  return { runs, loading, error }
}
