import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import AboutDialog from './AboutDialog'

export default function Brand({ className }) {
  const { t } = useTranslation()
  const [aboutOpen, setAboutOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setAboutOpen(true)}
        aria-label={t('pages.about.title')}
        className={cn(
          'min-w-0 truncate bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-lg font-bold tracking-tight text-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          className
        )}
      >
        {t('app.title')}
      </button>
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  )
}
