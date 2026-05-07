import { useEffect, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Upload, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

function LanguageToggle() {
  const { i18n } = useTranslation()
  const current = i18n.resolvedLanguage
  const next = current === 'de' ? 'en' : 'de'
  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      className="text-sm font-medium uppercase tracking-wide text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
      aria-label="Toggle language"
    >
      {current?.toUpperCase()}
    </button>
  )
}

const navItemClass = ({ isActive }) =>
  cn(
    'text-sm font-medium transition-colors',
    isActive
      ? 'text-slate-900 dark:text-slate-100'
      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100',
  )

export default function Header() {
  const { t } = useTranslation()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  const navLinks = (
    <>
      <NavLink to="/" end className={navItemClass}>
        {t('nav.dashboard')}
      </NavLink>
      <NavLink to="/vespa" className={navItemClass}>
        {t('nav.vespa')}
      </NavLink>
      <NavLink to="/settings" className={navItemClass}>
        {t('nav.settings')}
      </NavLink>
    </>
  )

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="-ml-2 rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Link to="/" className="font-semibold tracking-tight">
          {t('app.title')}
        </Link>
        <nav className="hidden items-center gap-4 md:flex">{navLinks}</nav>
        <div className="ml-auto flex items-center gap-3">
          <LanguageToggle />
          <Link
            to="/import"
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">{t('actions.import')}</span>
          </Link>
        </div>
      </div>
      {open && (
        <div className="border-t border-slate-200 md:hidden dark:border-slate-800">
          <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3">
            {navLinks}
          </nav>
        </div>
      )}
    </header>
  )
}
