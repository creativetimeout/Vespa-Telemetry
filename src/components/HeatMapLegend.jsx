import { useTranslation } from 'react-i18next'

export default function HeatMapLegend() {
  const { t } = useTranslation()
  return (
    <div className="absolute bottom-3 left-3 z-[1000] rounded-md border border-slate-200 bg-white/90 p-2 text-xs shadow dark:border-slate-800 dark:bg-slate-900/90">
      <div
        className="h-2 w-32 rounded"
        style={{ background: 'linear-gradient(to right, green, yellow, orange, red)' }}
      />
      <div className="mt-1 flex justify-between gap-3 text-slate-600 dark:text-slate-400">
        <span>{t('pages.heatMap.legendFew')}</span>
        <span>{t('pages.heatMap.legendMany')}</span>
      </div>
    </div>
  )
}
