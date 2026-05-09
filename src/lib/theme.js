import { useEffect, useState } from 'react'

const KEY = 'theme'

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function getStoredTheme() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function resolveTheme(stored) {
  if (stored === 'dark' || stored === 'light') return stored
  return systemPrefersDark() ? 'dark' : 'light'
}

function apply(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function useTheme() {
  const [stored, setStored] = useState(() => getStoredTheme())
  const [resolved, setResolved] = useState(() => resolveTheme(stored))

  useEffect(() => {
    apply(resolved)
  }, [resolved])

  useEffect(() => {
    if (stored) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setResolved(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [stored])

  function setTheme(next) {
    try {
      if (next) localStorage.setItem(KEY, next)
      else localStorage.removeItem(KEY)
    } catch {}
    setStored(next)
    setResolved(resolveTheme(next))
  }

  function toggle() {
    setTheme(resolved === 'dark' ? 'light' : 'dark')
  }

  return { resolved, stored, setTheme, toggle }
}
