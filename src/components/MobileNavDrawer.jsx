import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarContent } from './Sidebar'
import Brand from './Brand'

export default function MobileNavDrawer({ open, onClose }) {
  const { t } = useTranslation()
  const location = useLocation()

  useEffect(() => {
    if (open) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

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

  const header = (
    <div className="flex items-center gap-2 px-3 py-3">
      <Brand />
      <button
        type="button"
        onClick={onClose}
        className="ml-auto rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label={t('nav.closeMenu')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <div
      className={cn(
        'fixed inset-0 z-[1200] md:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/40 transition-opacity',
          open ? 'opacity-100' : 'opacity-0'
        )}
      />
      <aside
        className={cn(
          'absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
      >
        <SidebarContent onNavigate={onClose} header={header} />
      </aside>
    </div>
  )
}
