import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open) return
    function updatePos() {
      const btn = buttonRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const menuWidth = 256
      const margin = 8
      let left = rect.right - menuWidth
      if (left < margin) left = margin
      const maxLeft = window.innerWidth - menuWidth - margin
      if (left > maxLeft) left = Math.max(margin, maxLeft)
      setPos({ top: rect.bottom + 4, left })
    }
    updatePos()
    window.addEventListener('resize', updatePos)
    window.addEventListener('scroll', updatePos, true)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [open])

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
      const inContainer = containerRef.current && containerRef.current.contains(e.target)
      const inMenu = menuRef.current && menuRef.current.contains(e.target)
      if (!inContainer && !inMenu) {
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
        ref={buttonRef}
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
      {open && createPortal(
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 256, zIndex: 10000 }}
          className="rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
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
        </div>,
        document.body
      )}
    </div>
  )
}
