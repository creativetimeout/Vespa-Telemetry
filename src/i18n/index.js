import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './en.json'
import de from './de.json'
import legalEn from './legal.en.json'
import legalDe from './legal.de.json'

// Optional local overrides for personal/hoster details — these files are
// gitignored. The committed legal.<lng>.json contains [PLACEHOLDER] strings;
// drop a legal.<lng>.local.json next to it to override before deploying.
const localOverrides = import.meta.glob('./legal.*.local.json', { eager: true })

function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target
  for (const key of Object.keys(source)) {
    const sv = source[key]
    if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
      target[key] = deepMerge(target[key] && typeof target[key] === 'object' ? { ...target[key] } : {}, sv)
    } else {
      target[key] = sv
    }
  }
  return target
}

function pickOverride(lng) {
  const entry = Object.entries(localOverrides).find(([path]) =>
    path.endsWith(`/legal.${lng}.local.json`)
  )
  return entry ? entry[1].default ?? entry[1] : null
}

const enMerged = deepMerge(deepMerge({ ...en }, legalEn), pickOverride('en'))
const deMerged = deepMerge(deepMerge({ ...de }, legalDe), pickOverride('de'))

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enMerged },
      de: { translation: deMerged },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
