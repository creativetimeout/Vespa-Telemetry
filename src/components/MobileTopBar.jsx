import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import Brand from './Brand'

export default function MobileTopBar({ onOpen }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-x-0 top-0 z-[1100] flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-3 md:hidden dark:border-slate-800 dark:bg-slate-950">
      <button
        type="button"
        onClick={onOpen}
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label={t('nav.openMenu')}
      >
        <Menu className="h-5 w-5" />
      </button>
      <Brand />
    </div>
  )
}
