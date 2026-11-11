// Single source of truth for newsletter signups — MailerLite.
//
// The site is static (no backend), so signups go to MailerLite's embedded-form
// endpoint straight from the browser. That endpoint sends
// `access-control-allow-origin: *`, so a normal fetch() works cross-origin with
// no backend and no API key in the page — the form and its subscriber group are
// configured in MailerLite, not here. Replaced the old Mailchimp JSONP setup.
const ACCOUNT_ID = '1653163'
const FORM_ID = '203856672702071993'
const ENDPOINT = `https://assets.mailerlite.com/jsonp/${ACCOUNT_ID}/forms/${FORM_ID}/subscribe`

const DEFAULT_TIMEOUT = 8000

/**
 * Subscribe an address to the newsletter.
 *
 * Resolves to { ok, message } and never rejects, so callers can render the
 * outcome directly. The MailerLite group is single opt-in, so a successful
 * response means the address is on the list immediately. `options` is accepted
 * for call-site compatibility (e.g. a source tag) but the group is fixed by the
 * form, so extra options are currently ignored.
 */
export function subscribeToNewsletter(email, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT } = options

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  // MailerLite's form endpoint expects form-encoded `fields[email]`. A
  // form-urlencoded body is a CORS "simple request", so there is no preflight.
  const body = new URLSearchParams()
  body.set('fields[email]', String(email).trim())
  body.set('ml-submit', '1')
  body.set('anticsrf', 'true')

  return fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: controller.signal,
  })
    .then((res) => res.json().catch(() => ({})))
    .then((data) => {
      if (data && data.success) {
        return { ok: true, message: "You're in! Thanks for subscribing." }
      }
      // MailerLite returns { success:false, errors:{ fields:{ email:[...] } } }.
      const fieldErr = data?.errors?.fields?.email?.[0]
      return {
        ok: false,
        message: fieldErr || 'Something went wrong. Please try again.',
      }
    })
    .catch(() => ({
      ok: false,
      message: 'Could not reach the mailing list. Please try again.',
    }))
    .finally(() => clearTimeout(timer))
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())
}
