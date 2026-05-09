import { useTranslation } from 'react-i18next'
import ObfuscatedEmail from '@/components/ObfuscatedEmail'

function Section({ heading, children }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold uppercase tracking-wide text-slate-500">
        {heading}
      </h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  )
}

export default function Datenschutz() {
  const { t } = useTranslation()
  const email = (
    <ObfuscatedEmail
      user={t('pages.impressum.emailUser')}
      domain={t('pages.impressum.emailDomain')}
    />
  )

  return (
    <article className="prose prose-slate max-w-none dark:prose-invert">
      <h1 className="text-2xl font-semibold tracking-tight">{t('pages.datenschutz.title')}</h1>
      <p className="mt-2 text-sm text-slate-500">{t('pages.datenschutz.lastUpdated')}</p>

      <Section heading={t('pages.datenschutz.controller.heading')}>
        <p className="whitespace-pre-line">{t('pages.datenschutz.controller.body')}</p>
        <p>
          {t('pages.impressum.emailLabel')} {email}
        </p>
      </Section>

      <Section heading={t('pages.datenschutz.principle.heading')}>
        <p>{t('pages.datenschutz.principle.body')}</p>
      </Section>

      <Section heading={t('pages.datenschutz.localStorage.heading')}>
        <p className="whitespace-pre-line">{t('pages.datenschutz.localStorage.body')}</p>
      </Section>

      <Section heading={t('pages.datenschutz.serverLogs.heading')}>
        <p className="whitespace-pre-line">{t('pages.datenschutz.serverLogs.body')}</p>
      </Section>

      <Section heading={t('pages.datenschutz.processor.heading')}>
        <p className="whitespace-pre-line">{t('pages.datenschutz.processor.body')}</p>
      </Section>

      <Section heading={t('pages.datenschutz.maps.heading')}>
        <p className="whitespace-pre-line">{t('pages.datenschutz.maps.body')}</p>
        <p>
          <a
            href="https://wiki.osmfoundation.org/wiki/Privacy_Policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            wiki.osmfoundation.org/wiki/Privacy_Policy
          </a>
        </p>
      </Section>

      <Section heading={t('pages.datenschutz.noTracking.heading')}>
        <p>{t('pages.datenschutz.noTracking.body')}</p>
      </Section>

      <Section heading={t('pages.datenschutz.noUpload.heading')}>
        <p>{t('pages.datenschutz.noUpload.body')}</p>
      </Section>

      <Section heading={t('pages.datenschutz.rights.heading')}>
        <p className="whitespace-pre-line">{t('pages.datenschutz.rights.body')}</p>
        <p>
          {t('pages.impressum.emailLabel')} {email}
        </p>
      </Section>

      <Section heading={t('pages.datenschutz.complaint.heading')}>
        <p className="whitespace-pre-line">{t('pages.datenschutz.complaint.body')}</p>
      </Section>
    </article>
  )
}
