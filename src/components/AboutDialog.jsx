import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

export default function AboutDialog({ open, onClose }) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[2147483000] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('nav.closeMenu')}
          className="absolute right-3 top-3 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <img
            src="/Vespa-Telemetry.png"
            alt=""
            className="h-28 w-28 rounded-2xl shadow-md"
          />
          <h2
            id="about-title"
            className="mt-4 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent"
          >
            {t('app.title')}
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm text-slate-600 dark:text-slate-400">
            {t('pages.about.description')}
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
