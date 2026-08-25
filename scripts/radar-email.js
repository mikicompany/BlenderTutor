// Emails the latest Radar snapshot to the Mailchimp audience.
//
// Mailchimp campaigns cannot carry attachments, so the PDF is published to the
// site by radar-snapshot.js and this links to it.
//
// The only thing you must supply is the API key. The audience and its sending
// details are read from Mailchimp itself, so there is nothing else to keep in
// sync or rotate.
//
// Required env:
//   MAILCHIMP_API_KEY   e.g. abc123...-us8 (the suffix selects the datacenter)
// Optional overrides (each is discovered automatically when unset):
//   MAILCHIMP_LIST_ID     audience id — only needed if you have several
//   MAILCHIMP_REPLY_TO    reply address — defaults to the audience's own
//   MAILCHIMP_FROM_NAME   sender name — defaults to the audience's own
//   MAILCHIMP_SEGMENT_ID  send to one saved segment instead of everyone
//   SNAPSHOT_URL          defaults to the published latest.pdf
//   DRY_RUN=1             build and print the campaign without sending
//   TEST_EMAIL            send a test to this address only, then delete the
//                         draft. Subscribers receive nothing.
const API_KEY = process.env.MAILCHIMP_API_KEY
const SEGMENT_ID = process.env.MAILCHIMP_SEGMENT_ID
const SITE = 'https://www.blendertutoring.com'
const SNAPSHOT_URL = process.env.SNAPSHOT_URL || `${SITE}/snapshots/latest.pdf`
const DRY_RUN = process.env.DRY_RUN === '1'
const TEST_EMAIL = (process.env.TEST_EMAIL || '').trim()

if (!API_KEY && !DRY_RUN) {
  console.error('Missing required env: MAILCHIMP_API_KEY')
  process.exit(1)
}

const dc = (API_KEY || '').split('-').pop()
// MAILCHIMP_API_BASE exists so the flow can be exercised against a stub.
const base = process.env.MAILCHIMP_API_BASE || `https://${dc}.api.mailchimp.com/3.0`
const auth = 'Basic ' + Buffer.from(`key:${API_KEY}`).toString('base64')

async function mc(path, method = 'GET', body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) {
    // Mailchimp returns a JSON problem document; surface its detail.
    let detail = text
    try { detail = JSON.parse(text).detail || text } catch { /* not JSON */ }
    throw new Error(`Mailchimp ${method} ${path} -> ${res.status}: ${detail}`)
  }
  return text ? JSON.parse(text) : {}
}

// Ask Mailchimp which audience to use and how it sends, rather than keeping
// copies of that in repository secrets where they can drift or go stale.
// The audience id baked into the site's signup form (src/lib/mailchimp.js).
// Auto-discovery must land on this one: the account may hold other audiences
// belonging to entirely different projects, and mailing those would reach
// people who never asked for this.
const SITE_AUDIENCE_ID = 'acff18f22a'

async function resolveAudience() {
  let listId = process.env.MAILCHIMP_LIST_ID
  let list

  if (listId) {
    list = await mc(`/lists/${listId}`)
  } else {
    const { lists = [] } = await mc('/lists?count=25&fields=lists.id,lists.name,lists.campaign_defaults')
    if (lists.length === 0) {
      throw new Error('This Mailchimp account has no audiences. Create one, then re-run.')
    }
    if (lists.length > 1) {
      const names = lists.map(l => `${l.name} (${l.id})`).join(', ')
      throw new Error(`This account has several audiences, so pick one with MAILCHIMP_LIST_ID: ${names}`)
    }
    list = lists[0]
    listId = list.id

    // Fail closed: only mail the audience the website actually feeds.
    if (listId !== SITE_AUDIENCE_ID) {
      throw new Error(
        `Refusing to send. The only audience in this account is "${list.name}" (${listId}), ` +
        `but the site's signup form writes to ${SITE_AUDIENCE_ID}. These look like different ` +
        `mailing lists, and the people in "${list.name}" did not subscribe to The Radar. ` +
        `Check you are using the API key for the account that owns the signup form; if this ` +
        `really is the right audience, set MAILCHIMP_LIST_ID=${listId} to confirm deliberately.`
      )
    }
  }

  const defaults = list.campaign_defaults || {}
  const replyTo = process.env.MAILCHIMP_REPLY_TO || defaults.from_email
  const fromName = process.env.MAILCHIMP_FROM_NAME || defaults.from_name || 'The Radar'

  if (!replyTo) {
    throw new Error(
      'No reply address available. Set a default "from" address on the audience in Mailchimp, or set MAILCHIMP_REPLY_TO.'
    )
  }

  console.log(`audience: ${list.name || listId} (${listId})`)
  console.log(`sending as: ${fromName} <${replyTo}>`)
  return { listId, replyTo, fromName }
}

// GitHub Pages needs a moment to publish the freshly committed PDF; emailing a
// link that 404s would be worse than being a few minutes late.
async function waitForUrl(url, timeoutMs = 12 * 60 * 1000) {
  const deadline = Date.now() + timeoutMs
  let attempt = 0
  while (Date.now() < deadline) {
    attempt++
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' })
      if (res.ok) {
        console.log(`snapshot is live after ${attempt} check(s)`)
        return true
      }
      console.log(`  attempt ${attempt}: HTTP ${res.status}`)
    } catch (e) {
      console.log(`  attempt ${attempt}: ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 20000))
  }
  return false
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const num = n => (Number(n) || 0).toLocaleString('en-US')

// Published next to the PDF by radar-snapshot.js.
async function fetchSnapshotData() {
  const url = SNAPSHOT_URL.replace(/latest\.pdf$/, 'latest.json')
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    // The email is still worth sending with just the link.
    console.warn(`could not load ${url} (${e.message}); sending the short version`)
    return null
  }
}

function scoreChip(score) {
  if (!score) return '<span style="color:#6a6a6a;">—</span>'
  const bg = score >= 90 ? '#14532d' : score >= 75 ? '#1c2f16' : '#3a2a10'
  const fg = score >= 90 ? '#4ade80' : score >= 75 ? '#a3e635' : '#fbbf24'
  return `<span style="display:inline-block;min-width:24px;text-align:center;padding:1px 6px;border-radius:3px;background:${bg};color:${fg};font-weight:700;font-size:12px;">${score}</span>`
}

function section(title, sub, rows) {
  if (!rows.length) return ''
  return `
  <tr><td style="padding:22px 28px 0;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ffffff;font-weight:700;border-left:3px solid #22c55e;padding-left:8px;">
      ${esc(title)} <span style="color:#6a6a6a;letter-spacing:0;text-transform:none;font-weight:400;">${esc(sub)}</span>
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;border-collapse:collapse;">
      ${rows.join('')}
    </table>
  </td></tr>`
}

function gameRows(games) {
  return games.map(g => `
    <tr>
      <td style="padding:6px 0;border-bottom:1px solid #1a1a1a;color:#ffffff;font-size:14px;font-weight:600;">${esc(g.name)}
        <div style="color:#7a7a7a;font-size:11px;font-weight:400;">${esc((g.genres || []).join(', ') || '—')}</div>
      </td>
      <td align="right" style="padding:6px 0;border-bottom:1px solid #1a1a1a;">${scoreChip(g.metacritic)}</td>
    </tr>`)
}

function steamRows(games) {
  return games.map(s => `
    <tr>
      <td style="padding:6px 0;border-bottom:1px solid #1a1a1a;color:#ffffff;font-size:14px;font-weight:600;">${esc(s.name)}
        <div style="color:#7a7a7a;font-size:11px;font-weight:400;">${esc(s.price)} · ${num(s.positive)} positive</div>
      </td>
      <td align="right" style="padding:6px 0;border-bottom:1px solid #1a1a1a;color:#22c55e;font-size:12px;">${num(s.ccu)}<div style="color:#6a6a6a;font-size:10px;">peak</div></td>
    </tr>`)
}

function emailHtml(dateLabel, data) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0a0a0a;border-radius:10px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
        <tr><td style="padding:28px 28px 18px;border-bottom:2px solid #22c55e;">
          <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">THE RADAR</div>
          <div style="font-size:10px;color:#22c55e;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Game news in a glimpse</div>
        </td></tr>
        <tr><td style="padding:24px 28px 0;color:#cfcfcf;font-size:15px;line-height:1.6;">
          <p style="margin:0;">Your snapshot for <strong style="color:#ffffff;">${dateLabel}</strong>.</p>
        </td></tr>

        ${data ? section('New and notable', 'last 30 days', gameRows(data.newAndNotable || [])) : ''}
        ${data ? section('Top Metacritic', 'highest rated now', gameRows(data.metacriticTop || [])) : ''}
        ${data ? section('Trending on Steam', 'past two weeks', steamRows(data.steamTrending || [])) : ''}
        ${data && data.releaseCount ? `
        <tr><td style="padding:18px 28px 0;color:#8a8a8a;font-size:13px;">
          Plus <strong style="color:#ffffff;">${data.releaseCount}</strong> releases dated this month — the full list is in the PDF.
        </td></tr>` : ''}

        <tr><td style="padding:24px 28px;color:#cfcfcf;font-size:15px;line-height:1.6;">
          ${data ? '' : '<p style="margin:0 0 18px;">It covers the newest releases, the highest Metacritic scores right now, what is trending on Steam, and what is still to come this month.</p>'}
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="background:#22c55e;border-radius:6px;">
              <a href="${SNAPSHOT_URL}" style="display:inline-block;padding:12px 26px;color:#0a0a0a;font-weight:700;text-decoration:none;font-size:14px;">Get the full PDF</a>
            </td>
          </tr></table>
          <p style="margin:22px 0 0;font-size:13px;color:#8a8a8a;">Or browse the live dashboard at <a href="${SITE}/radar" style="color:#22c55e;">blendertutoring.com/radar</a>.</p>
        </td></tr>
        <tr><td style="padding:16px 28px 24px;border-top:1px solid #1e1e1e;color:#6a6a6a;font-size:11px;line-height:1.6;">
          Data from RAWG.io and Steam Spy.<br>
          <a href="*|UNSUB|*" style="color:#6a6a6a;">Unsubscribe</a> &nbsp;·&nbsp; *|LIST:ADDRESSLINE|*
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`
}

async function main() {
  const dateLabel = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  const subject = `The Radar — ${dateLabel} snapshot`

  if (DRY_RUN) {
    console.log('DRY RUN — nothing will be sent')
    console.log('subject:', subject)
    console.log('pdf    :', SNAPSHOT_URL)
    console.log('segment:', SEGMENT_ID || '(entire audience)')
    const html = emailHtml(dateLabel, await fetchSnapshotData())
    console.log('html   :', html.length, 'bytes')
    if (process.env.EMAIL_HTML_OUT) {
      const { writeFileSync } = await import('node:fs')
      writeFileSync(process.env.EMAIL_HTML_OUT, html)
      console.log('wrote  :', process.env.EMAIL_HTML_OUT)
    }
    return
  }

  console.log(`waiting for ${SNAPSHOT_URL} ...`)
  // A test run should not sit through the full wait; a not-yet-published link
  // is worth a warning there, but is fatal for a real send.
  const live = await waitForUrl(SNAPSHOT_URL, TEST_EMAIL ? 2 * 60 * 1000 : 12 * 60 * 1000)
  if (!live) {
    if (!TEST_EMAIL) {
      throw new Error('Snapshot never became reachable; not sending an email with a dead link.')
    }
    console.warn('WARNING: snapshot is not reachable yet — the test email will link to a 404.')
  }

  const { listId, replyTo, fromName } = await resolveAudience()

  const recipients = { list_id: listId }
  if (SEGMENT_ID) recipients.segment_opts = { saved_segment_id: Number(SEGMENT_ID) }

  const campaign = await mc('/campaigns', 'POST', {
    type: 'regular',
    recipients,
    settings: {
      subject_line: subject,
      title: `Radar snapshot ${new Date().toISOString().split('T')[0]}`,
      from_name: fromName,
      reply_to: replyTo,
      auto_footer: false,
    },
  })
  console.log('created campaign', campaign.id)

  const snapshot = await fetchSnapshotData()
  await mc(`/campaigns/${campaign.id}/content`, 'PUT', { html: emailHtml(dateLabel, snapshot) })

  if (TEST_EMAIL) {
    await mc(`/campaigns/${campaign.id}/actions/test`, 'POST', {
      test_emails: [TEST_EMAIL],
      send_type: 'html',
    })
    console.log(`test email sent to ${TEST_EMAIL} — no subscribers were contacted`)
    // Tidy up, so test runs do not litter the account with drafts. Left in
    // place if the delete fails, since the test itself already succeeded.
    try {
      await mc(`/campaigns/${campaign.id}`, 'DELETE')
      console.log('removed the draft campaign')
    } catch (e) {
      console.warn(`could not remove draft ${campaign.id}: ${e.message}`)
    }
    return
  }

  await mc(`/campaigns/${campaign.id}/actions/send`, 'POST')
  console.log('sent campaign', campaign.id)
}

main().catch(e => { console.error(e.message); process.exit(1) })
