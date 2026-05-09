import { useTranslation } from 'react-i18next'
import ObfuscatedEmail from '@/components/ObfuscatedEmail'

export default function Impressum() {
  const { t } = useTranslation()
  return (
    <article className="prose prose-slate max-w-none dark:prose-invert">
      <h1 className="text-2xl font-semibold tracking-tight">{t('pages.impressum.title')}</h1>

      <h2 className="mt-6 text-base font-semibold uppercase tracking-wide text-slate-500">
        {t('pages.impressum.providerHeading')}
      </h2>
      <p className="whitespace-pre-line">{t('pages.impressum.providerBlock')}</p>

      <h2 className="mt-6 text-base font-semibold uppercase tracking-wide text-slate-500">
        {t('pages.impressum.contactHeading')}
      </h2>
      <p>
        {t('pages.impressum.emailLabel')}{' '}
        <ObfuscatedEmail
          user={t('pages.impressum.emailUser')}
          domain={t('pages.impressum.emailDomain')}
        />
      </p>

      <h2 className="mt-6 text-base font-semibold uppercase tracking-wide text-slate-500">
        {t('pages.impressum.vatHeading')}
      </h2>
      <p>{t('pages.impressum.vatText')}</p>

      <h2 className="mt-6 text-base font-semibold uppercase tracking-wide text-slate-500">
        {t('pages.impressum.responsibleHeading')}
      </h2>
      <p className="whitespace-pre-line">{t('pages.impressum.responsibleText')}</p>

      <h2 className="mt-6 text-base font-semibold uppercase tracking-wide text-slate-500">
        {t('pages.impressum.disclaimerHeading')}
      </h2>
      <h3 className="mt-3 font-semibold">{t('pages.impressum.contentLiabilityHeading')}</h3>
      <p>{t('pages.impressum.contentLiabilityText')}</p>
      <h3 className="mt-3 font-semibold">{t('pages.impressum.linkLiabilityHeading')}</h3>
      <p>{t('pages.impressum.linkLiabilityText')}</p>
      <h3 className="mt-3 font-semibold">{t('pages.impressum.copyrightHeading')}</h3>
      <p>{t('pages.impressum.copyrightText')}</p>
    </article>
  )
}
