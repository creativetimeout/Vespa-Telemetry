import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useDb } from '@/lib/db/DbProvider'
import { importFile } from '@/lib/import'
import { cn } from '@/lib/utils'

export default function Import() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { ready, bump } = useDb()
  const fileInput = useRef(null)
  const [stage, setStage] = useState(null)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const busy = stage !== null && stage !== 'done'

  async function handleFile(file) {
    if (!file || !ready || busy) return
    setError(null)
    setSummary(null)
    setStage('reading')
    try {
      const result = await importFile(file, { onStage: setStage })
      setSummary(result)
      bump()
      setStage('done')
    } catch (err) {
      console.error(err)
      setError(err?.message ?? String(err))
      setStage(null)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('pages.import.title')}
      </h1>

      <div
        role="button"
        tabIndex={0}
        onClick={() => !busy && fileInput.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !busy) fileInput.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors',
          dragOver
            ? 'border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-900'
            : 'border-slate-300 dark:border-slate-700',
          busy && 'pointer-events-none opacity-60'
        )}
      >
        <p className="text-slate-500">{t('pages.import.drop')}</p>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            handleFile(f)
          }}
        />
      </div>

      {stage && stage !== 'done' && (
        <p className="text-sm text-slate-500" aria-live="polite">
          {t(`pages.import.stage.${stage}`)}
        </p>
      )}

      {summary && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <p className="font-medium">{t('pages.import.stage.done')}</p>
          <p>
            {t('pages.import.summary', {
              added: summary.added,
              skipped: summary.skipped,
            })}
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-2 text-emerald-900 underline hover:no-underline dark:text-emerald-100"
          >
            {t('nav.dashboard')} →
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          {t('pages.import.error', { message: error })}
        </div>
      )}
    </div>
  )
}
