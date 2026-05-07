// km/L → L/100km. Returns null if input is non-positive (so callers can render "—").
export function kmplToLper100km(kmpl) {
  if (!Number.isFinite(kmpl) || kmpl <= 0) return null
  return 100 / kmpl
}

export function formatKm(km, locale) {
  if (!Number.isFinite(km)) return '—'
  return `${km.toLocaleString(locale, { maximumFractionDigits: 1 })} km`
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function formatLper100km(kmpl, locale) {
  const v = kmplToLper100km(kmpl)
  if (v == null) return '—'
  return `${v.toLocaleString(locale, { maximumFractionDigits: 2 })} L/100km`
}

export function formatDateLocal(ms, locale) {
  if (!Number.isFinite(ms)) return '—'
  return new Date(ms).toLocaleDateString(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}
