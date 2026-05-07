import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Upload,
  LayoutDashboard,
  Bike,
  Settings as SettingsIcon,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDb, useDbQuery } from '@/lib/db/DbProvider'
import { getCollections, createCollection } from '@/lib/db/queries'

function LanguageToggle({ collapsed }) {
  const { i18n } = useTranslation()
  const current = i18n.resolvedLanguage
  const next = current === 'de' ? 'en' : 'de'
  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      className="text-xs font-medium uppercase tracking-wide text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
      aria-label="Toggle language"
      title={current?.toUpperCase()}
    >
      {collapsed ? (current?.[0] ?? '').toUpperCase() : current?.toUpperCase()}
    </button>
  )
}

function NavItem({ to, icon: Icon, label, collapsed, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
          collapsed && 'justify-center px-2'
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

export default function Sidebar() {
  const { t } = useTranslation()
  const { ready, bump } = useDb()
  const [collapsed, setCollapsed] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const collectionsQ = useDbQuery(() => (ready ? getCollections() : []), [ready])
  const collections = collectionsQ.data ?? []

  function onCreate(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    createCollection(trimmed)
    setName('')
    setCreating(false)
    bump()
  }

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      <div className={cn('flex items-center gap-2 px-3 py-3', collapsed && 'justify-center px-2')}>
        {!collapsed && (
          <Link to="/" className="font-semibold tracking-tight">
            {t('app.title')}
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            'rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100',
            !collapsed && 'ml-auto'
          )}
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
        <NavItem to="/" end icon={LayoutDashboard} label={t('nav.dashboard')} collapsed={collapsed} />
        <NavItem to="/vespa" icon={Bike} label={t('nav.vespa')} collapsed={collapsed} />
        <NavItem to="/tours" icon={MapIcon} label={t('nav.tours')} collapsed={collapsed} />
        <NavItem to="/settings" icon={SettingsIcon} label={t('nav.settings')} collapsed={collapsed} />
        <NavItem to="/import" icon={Upload} label={t('nav.import')} collapsed={collapsed} />

        {!collapsed && (
          <div className="mt-4 flex items-center justify-between px-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('nav.tours')}
            </span>
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-label={t('pages.tours.newTour')}
              title={t('pages.tours.newTour')}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {!collapsed && creating && (
          <form onSubmit={onCreate} className="mt-1 flex gap-1 px-3">
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('pages.tours.namePlaceholder')}
              className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <button
              type="submit"
              className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900"
            >
              {t('pages.tours.create')}
            </button>
          </form>
        )}

        {!collapsed && (
          <ul className="mt-1 flex flex-col gap-0.5">
            {collections.map((c) => (
              <li key={c.id}>
                <NavLink
                  to={`/tour/${c.id}`}
                  title={c.name}
                  className={({ isActive }) =>
                    cn(
                      'block truncate rounded-md px-3 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                    )
                  }
                >
                  {c.name}
                  <span className="ml-2 text-xs text-slate-400 tabular-nums">{c.route_count}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div
        className={cn(
          'flex items-center border-t border-slate-200 px-3 py-3 dark:border-slate-800',
          collapsed ? 'justify-center px-2' : 'justify-end'
        )}
      >
        <LanguageToggle collapsed={collapsed} />
      </div>
    </aside>
  )
}
