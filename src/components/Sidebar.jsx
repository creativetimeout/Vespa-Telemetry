import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Brand from './Brand'
import {
  Upload,
  LayoutDashboard,
  Bike,
  Settings as SettingsIcon,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sun,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDb, useDbQuery } from '@/lib/db/DbProvider'
import { getCollections, createCollection } from '@/lib/db/queries'
import { useTheme } from '@/lib/theme'

const FLAGS = { de: '🇩🇪', en: '🇬🇧' }

function LanguageToggle() {
  const { i18n } = useTranslation()
  const current = i18n.resolvedLanguage
  const next = current === 'de' ? 'en' : 'de'
  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      className="rounded text-lg leading-none hover:opacity-80"
      aria-label="Toggle language"
      title={current?.toUpperCase()}
    >
      {FLAGS[current] ?? current?.toUpperCase()}
    </button>
  )
}

function ThemeToggle() {
  const { t } = useTranslation()
  const { resolved, toggle } = useTheme()
  const isDark = resolved === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      aria-label={t(isDark ? 'nav.lightMode' : 'nav.darkMode')}
      title={t(isDark ? 'nav.lightMode' : 'nav.darkMode')}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

function NavItem({ to, icon: Icon, label, collapsed, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
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

export function SidebarContent({ collapsed = false, onNavigate, header }) {
  const { t } = useTranslation()
  const { ready, bump } = useDb()
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
    <>
      {header}

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
        <NavItem to="/" end icon={LayoutDashboard} label={t('nav.dashboard')} collapsed={collapsed} onNavigate={onNavigate} />
        <NavItem to="/tours" icon={MapIcon} label={t('nav.tours')} collapsed={collapsed} onNavigate={onNavigate} />
        <NavItem to="/settings" icon={SettingsIcon} label={t('nav.settings')} collapsed={collapsed} onNavigate={onNavigate} />
        <NavItem to="/import" icon={Upload} label={t('nav.import')} collapsed={collapsed} onNavigate={onNavigate} />
        <NavItem to="/vespa" icon={Bike} label={t('nav.vespa')} collapsed={collapsed} onNavigate={onNavigate} />

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
                  onClick={onNavigate}
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
          'flex flex-col gap-2 border-t border-slate-200 px-3 py-3 dark:border-slate-800',
          collapsed && 'items-center px-2'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2',
            collapsed ? 'flex-col' : 'justify-end'
          )}
        >
          <ThemeToggle />
          <LanguageToggle />
        </div>
        {!collapsed && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <NavLink
              to="/impressum"
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'hover:text-slate-900 dark:hover:text-slate-100',
                  isActive && 'text-slate-900 dark:text-slate-100'
                )
              }
            >
              {t('nav.impressum')}
            </NavLink>
            <NavLink
              to="/datenschutz"
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'hover:text-slate-900 dark:hover:text-slate-100',
                  isActive && 'text-slate-900 dark:text-slate-100'
                )
              }
            >
              {t('nav.datenschutz')}
            </NavLink>
          </div>
        )}
      </div>
    </>
  )
}

export default function Sidebar() {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  const header = (
    <div className={cn('flex items-center gap-2 px-3 py-3', collapsed && 'justify-center px-2')}>
      {!collapsed && <Brand />}
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
  )

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white md:flex dark:border-slate-800 dark:bg-slate-950',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      <SidebarContent collapsed={collapsed} header={header} />
    </aside>
  )
}
