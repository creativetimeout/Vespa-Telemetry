import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDb, useDbQuery } from '@/lib/db/DbProvider'
import { exportBytes, replaceWithBytes, clearAll } from '@/lib/db'
import { getTotals, getVehicles } from '@/lib/db/queries'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { ready, bump } = useDb()
  const totalsQ = useDbQuery(getTotals)
  const vehiclesQ = useDbQuery(getVehicles)
  const fileInput = useRef(null)
  const [busy, setBusy] = useState(false)

  async function onExport() {
    setBusy(true)
    try {
      const bytes = await exportBytes()
      const blob = new Blob([bytes], { type: 'application/x-sqlite3' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vespa-${new Date().toISOString().slice(0, 10)}.sqlite`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  async function onImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      await replaceWithBytes(buf)
      bump()
    } finally {
      setBusy(false)
    }
  }

  async function onClear() {
    if (!confirm(t('pages.settings.confirmClear'))) return
    setBusy(true)
    try {
      await clearAll()
      bump()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('pages.settings.title')}
      </h1>

      <section className="space-y-2">
        <label className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {t('pages.settings.language')}
          </span>
          <select
            value={i18n.resolvedLanguage}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t('pages.settings.database')}
        </h2>
        {ready && (
          <p className="text-sm text-slate-500">
            {t('pages.settings.dbStatus', {
              routes: totalsQ.data?.routes ?? 0,
              vehicles: vehiclesQ.data?.length ?? 0,
            })}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onExport}
            disabled={!ready || busy}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            {t('pages.settings.exportDb')}
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={!ready || busy}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            {t('pages.settings.importDb')}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!ready || busy}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-slate-900 dark:hover:bg-red-950"
          >
            {t('pages.settings.clearDb')}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".sqlite,.db,application/x-sqlite3"
            className="hidden"
            onChange={onImportFile}
          />
        </div>
      </section>
    </div>
  )
}
