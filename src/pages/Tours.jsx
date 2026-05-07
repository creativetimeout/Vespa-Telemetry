import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDb, useDbQuery } from '@/lib/db/DbProvider'
import { getCollections, createCollection } from '@/lib/db/queries'
import { formatKm, formatDuration } from '@/lib/format'

export default function Tours() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage
  const { ready, bump } = useDb()
  const collectionsQ = useDbQuery(getCollections)
  const collections = collectionsQ.data ?? []

  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [showForm, setShowForm] = useState(false)

  function onCreate(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    createCollection(trimmed, notes.trim() || null)
    setName('')
    setNotes('')
    setShowForm(false)
    bump()
  }

  if (!ready) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('pages.tours.title')}</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {t('pages.tours.newTour')}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={onCreate}
          className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('pages.tours.namePlaceholder')}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('pages.tours.notesPlaceholder')}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
            >
              {t('pages.tours.create')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
            >
              {t('pages.tours.cancel')}
            </button>
          </div>
        </form>
      )}

      {collections.length === 0 ? (
        <p className="text-slate-500">{t('pages.tours.empty')}</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {collections.map((c) => (
            <li key={c.id}>
              <Link
                to={`/tour/${c.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-sm text-slate-500 tabular-nums">
                  {c.route_count} · {formatKm(c.total_distance_km, locale)} ·{' '}
                  {formatDuration(c.total_duration_s)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
