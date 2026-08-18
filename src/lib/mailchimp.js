// Single source of truth for newsletter signups.
//
// Mailchimp's embedded-form endpoint includes the account subdomain — the
// bare server host (us8.list-manage.com) is not a valid endpoint, so the URL
// must be used whole rather than reassembled from parts.
const FORM_URL =
  'https://blendertutoring.us8.list-manage.com/subscribe/post-json' +
  '?u=448c4c0d61ffab1851464e145&id=fcb87c912d&f_id=00e218e1f0'

const DEFAULT_TIMEOUT = 8000

/**
 * Subscribe an address via Mailchimp's JSONP endpoint, which is the only way
 * to post to Mailchimp from the browser without a backend.
 *
 * Resolves to { ok, message } and never rejects, so callers can render the
 * outcome directly.
 */
export function subscribeToNewsletter(email, options = {}) {
  const { tags, timeoutMs = DEFAULT_TIMEOUT } = options

  return new Promise((resolve) => {
    // A unique callback per attempt: a fixed global name leaves a late
    // response from an earlier attempt able to resolve a later one.
    const callbackName = `__mcCallback_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
    const scriptId = `${callbackName}_script`
    let settled = false

    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      delete window[callbackName]
      document.getElementById(scriptId)?.remove()
      resolve(result)
    }

    const timer = setTimeout(
      () => finish({ ok: false, message: 'Request timed out. Please try again.' }),
      timeoutMs
    )

    window[callbackName] = (data) => {
      const message = (data?.msg || '').replace(/<[^>]+>/g, '').trim()
      // Mailchimp returns an error for an address that is already on the
      // list. From the subscriber's point of view that is a success.
      const alreadyOnList = /already subscribed/i.test(message)
      if (data?.result === 'success' || alreadyOnList) {
        resolveSuccess(finish, alreadyOnList, message)
      } else {
        finish({ ok: false, message: message || 'Something went wrong. Please try again.' })
      }
    }

    let url = `${FORM_URL}&EMAIL=${encodeURIComponent(email)}&c=${callbackName}`
    if (tags) url += `&tags=${encodeURIComponent(tags)}`

    const script = document.createElement('script')
    script.id = scriptId
    script.src = url
    // Without this a blocked or failed request just hangs until the timeout.
    script.onerror = () =>
      finish({ ok: false, message: 'Could not reach the mailing list. Please try again.' })
    document.body.appendChild(script)
  })
}

function resolveSuccess(finish, alreadyOnList, message) {
  finish({
    ok: true,
    alreadyOnList,
    message: alreadyOnList ? "You're already on the list." : message,
  })
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())
}
