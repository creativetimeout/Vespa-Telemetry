import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useDb, useDbQuery } from '@/lib/db/DbProvider'
import { getDays, getTotals } from '@/lib/db/queries'
import { formatKm, formatDuration, formatLper100km, formatDateLocal } from '@/lib/format'

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const { ready } = useDb()
  const totalsQ = useDbQuery(getTotals)
  const daysQ = useDbQuery(getDays)
  const locale = i18n.resolvedLanguage

  if (!ready) return null

  const totals = totalsQ.data
  const days = daysQ.data ?? []
  const isEmpty = !totals || totals.routes === 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('pages.dashboard.title')}
      </h1>

      {isEmpty ? (
        <p className="text-slate-500">{t('pages.dashboard.empty')}</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label={t('pages.dashboard.routes')} value={totals.routes} />
            <Stat label={t('pages.dashboard.distance')} value={formatKm(totals.distance_km, locale)} />
            <Stat label={t('pages.dashboard.duration')} value={formatDuration(totals.duration_s)} />
            <Stat
              label={t('pages.dashboard.consumption')}
              value={formatLper100km(
                totals.distance_km > 0 && totals.liters_consumed > 0
                  ? totals.distance_km / totals.liters_consumed
                  : NaN,
                locale
              )}
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t('pages.dashboard.recentDays')}
            </h2>
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {days.map((d) => (
                <li key={`${d.day}-${d.vehicle_id}`}>
                  <Link
                    to={`/day/${d.day}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <span className="font-medium">{formatDateLocal(d.first_start_ms, locale)}</span>
                    <span className="text-sm text-slate-500 tabular-nums">
                      {d.routes} · {formatKm(d.distance_km, locale)} · {formatDuration(d.duration_s)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
