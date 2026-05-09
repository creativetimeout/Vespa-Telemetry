import { useState } from 'react'

export default function ObfuscatedEmail({ user, domain, className }) {
  const [revealed, setRevealed] = useState(false)
  const address = `${user}@${domain}`

  function reveal() {
    setRevealed(true)
  }

  function onClick(e) {
    e.preventDefault()
    reveal()
    window.location.href = `mailto:${address}`
  }

  if (revealed) {
    return (
      <a href={`mailto:${address}`} className={className}>
        {address}
      </a>
    )
  }

  const reversedUser = [...user].reverse().join('')
  const reversedDomain = [...domain].reverse().join('')

  return (
    <span
      role="button"
      tabIndex={0}
      onMouseEnter={reveal}
      onFocus={reveal}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(e)
        }
      }}
      className={className}
      style={{ cursor: 'pointer', display: 'inline-flex', flexDirection: 'row-reverse' }}
      aria-label="email address (revealed on interaction)"
    >
      <span style={{ unicodeBidi: 'bidi-override', direction: 'rtl' }}>
        {reversedDomain}
      </span>
      <span aria-hidden="true" style={{ display: 'none' }}>
        nospam-please-do-not-scrape
      </span>
      <span aria-hidden="true">{' @ '}</span>
      <span style={{ unicodeBidi: 'bidi-override', direction: 'rtl' }}>
        {reversedUser}
      </span>
    </span>
  )
}
