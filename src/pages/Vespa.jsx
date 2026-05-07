import { useTranslation } from 'react-i18next'
import { useDb, useDbQuery } from '@/lib/db/DbProvider'
import { getVehicles } from '@/lib/db/queries'
import { formatDateLocal } from '@/lib/format'

function Field({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div className="flex justify-between gap-4 border-b border-slate-200 py-2 last:border-b-0 dark:border-slate-800">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  )
}

export default function Vespa() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage
  const { ready } = useDb()
  const { data: vehicles } = useDbQuery(getVehicles)

  if (!ready) return null

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('pages.vespa.title')}
      </h1>
      {(!vehicles || vehicles.length === 0) ? (
        <p className="text-slate-500">{t('pages.dashboard.empty')}</p>
      ) : (
        <ul className="space-y-4">
          {vehicles.map((v) => (
            <li
              key={v.id}
              className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-col gap-4 sm:flex-row">
                {v.image_data ? (
                  <img
                    src={`data:image/jpeg;base64,${v.image_data}`}
                    alt={v.name}
                    className="h-32 w-32 shrink-0 rounded-md object-cover"
                  />
                ) : null}
                <div className="flex-1">
                  <div className="text-lg font-semibold">{v.name}</div>
                  <dl className="mt-2">
                    <Field label={t('pages.vespa.fields.model')} value={v.model} />
                    <Field label={t('pages.vespa.fields.modelYear')} value={v.model_year} />
                    <Field label={t('pages.vespa.fields.vin')} value={v.vin} />
                    <Field label={t('pages.vespa.fields.serial')} value={v.serial} />
                    <Field
                      label={t('pages.vespa.fields.engineSize')}
                      value={v.engine_size ? `${v.engine_size} cc` : null}
                    />
                    <Field
                      label={t('pages.vespa.fields.totalMileage')}
                      value={
                        Number.isFinite(v.total_mileage)
                          ? `${v.total_mileage.toLocaleString(locale, { maximumFractionDigits: 1 })} km`
                          : null
                      }
                    />
                    <Field
                      label={t('pages.vespa.fields.lastServiceDate')}
                      value={
                        Number.isFinite(v.last_service_date_ms)
                          ? formatDateLocal(v.last_service_date_ms, locale)
                          : null
                      }
                    />
                    <Field
                      label={t('pages.vespa.fields.lastServiceOdometer')}
                      value={
                        Number.isFinite(v.last_service_odometer)
                          ? `${v.last_service_odometer.toLocaleString(locale, { maximumFractionDigits: 1 })} km`
                          : null
                      }
                    />
                    <Field
                      label={t('pages.vespa.fields.batteryVoltage')}
                      value={
                        Number.isFinite(v.battery_voltage)
                          ? `${v.battery_voltage.toLocaleString(locale, { maximumFractionDigits: 1 })} V`
                          : null
                      }
                    />
                  </dl>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
