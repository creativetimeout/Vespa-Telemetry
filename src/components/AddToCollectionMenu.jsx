import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ListPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDb, useDbQuery } from '@/lib/db/DbProvider'
import {
  getCollections,
  getCollectionsForRoute,
  addRouteToCollection,
  removeRouteFromCollection,
  createCollection,
} from '@/lib/db/queries'

export default function AddToCollectionMenu({ routeId, compact = false }) {
  const { t } = useTranslation()
  const { bump, ready } = useDb()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const containerRef = useRef(null)

  const allQ = useDbQuery(() => (open && ready ? getCollections() : []), [open, ready])
  const memberQ = useDbQuery(
    () => (open && ready ? getCollectionsForRoute(routeId) : []),
    [open, ready, routeId]
  )
  const all = allQ.data ?? []
  const memberIds = new Set((memberQ.data ?? []).map((c) => c.id))

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function toggle(collectionId, currentlyIn) {
    if (currentlyIn) removeRouteFromCollection(collectionId, routeId)
    else addRouteToCollection(collectionId, routeId)
    bump()
  }

  function onCreate(e) {
    e.preventDefault()
    e.stopPropagation()
    const trimmed = name.trim()
    if (!trimmed) return
    const newId = createCollection(trimmed)
    addRouteToCollection(newId, routeId)
    setName('')
    bump()
  }

  return (
    <div ref={containerRef} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
          compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5'
        )}
        title={t('pages.tours.addToTour')}
      >
        <ListPlus className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {!compact && <span>{t('pages.tours.addToTour')}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {all.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-slate-500">{t('pages.tours.empty')}</p>
          ) : (
            <ul className="max-h-60 overflow-y-auto">
              {all.map((c) => {
                const checked = memberIds.has(c.id)
                return (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(c.id, checked)}
                      />
                      <span className="truncate">{c.name}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
          <form
            onSubmit={onCreate}
            className="mt-1 flex gap-1 border-t border-slate-200 pt-2 dark:border-slate-800"
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('pages.tours.newTour')}
              className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            <button
              type="submit"
              className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900"
            >
              {t('pages.tours.create')}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
