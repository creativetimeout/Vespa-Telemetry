import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { openDb } from './index'

const DbContext = createContext({ ready: false, error: null, version: 0, bump: () => {} })

export function DbProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  // `version` lets consumers re-run queries after writes. Bump it after imports / clears.
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    openDb()
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) setError(err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const bump = useCallback(() => setVersion((v) => v + 1), [])

  return (
    <DbContext.Provider value={{ ready, error, version, bump }}>
      {children}
    </DbContext.Provider>
  )
}

export function useDb() {
  return useContext(DbContext)
}

// Run a sync query function (from queries.js) and re-run it whenever the
// DB version bumps. Returns { data, error } and is safe before DB is ready.
export function useDbQuery(queryFn, deps = []) {
  const { ready, version } = useDb()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (!ready) return
    try {
      setData(queryFn())
      setError(null)
    } catch (err) {
      console.error(err)
      setError(err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, version, ...deps])
  return { data, error }
}
