// Emails the latest Radar snapshot to the Mailchimp audience.
//
// Mailchimp campaigns cannot carry attachments, so the PDF is published to the
// site by radar-snapshot.js and this links to it.
//
// Required env:
//   MAILCHIMP_API_KEY   e.g. abc123...-us8 (the suffix selects the datacenter)
//   MAILCHIMP_LIST_ID   audience id
//   MAILCHIMP_REPLY_TO  reply address (Mailchimp rejects campaigns without one)
// Optional:
//   MAILCHIMP_SEGMENT_ID  send to one saved segment instead of the whole audience
//   MAILCHIMP_FROM_NAME   defaults to "The Radar"
//   SNAPSHOT_URL          defaults to the published latest.pdf
//   DRY_RUN=1             build and print the campaign without sending
const API_KEY = process.env.MAILCHIMP_API_KEY
const LIST_ID = process.env.MAILCHIMP_LIST_ID
const REPLY_TO = process.env.MAILCHIMP_REPLY_TO
const SEGMENT_ID = process.env.MAILCHIMP_SEGMENT_ID
const FROM_NAME = process.env.MAILCHIMP_FROM_NAME || 'The Radar'
const SITE = 'https://www.blendertutoring.com'
const SNAPSHOT_URL = process.env.SNAPSHOT_URL || `${SITE}/snapshots/latest.pdf`
const DRY_RUN = process.env.DRY_RUN === '1'

const missing = ['MAILCHIMP_API_KEY', 'MAILCHIMP_LIST_ID', 'MAILCHIMP_REPLY_TO']
  .filter(k => !process.env[k])
if (missing.length && !DRY_RUN) {
  console.error(`Missing required env: ${missing.join(', ')}`)
  process.exit(1)
}

const dc = (API_KEY || '').split('-').pop()
const base = `https://${dc}.api.mailchimp.com/3.0`
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

function emailHtml(dateLabel) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0a0a0a;border-radius:10px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
        <tr><td style="padding:28px 28px 18px;border-bottom:2px solid #22c55e;">
          <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">THE RADAR</div>
          <div style="font-size:10px;color:#22c55e;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Game news in a glimpse</div>
        </td></tr>
        <tr><td style="padding:26px 28px;color:#cfcfcf;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 14px;">Your snapshot for <strong style="color:#ffffff;">${dateLabel}</strong> is ready.</p>
          <p style="margin:0 0 22px;">It covers the newest and most notable releases, the highest Metacritic scores right now, what is trending on Steam, and what is still to come this month.</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="background:#22c55e;border-radius:6px;">
              <a href="${SNAPSHOT_URL}" style="display:inline-block;padding:12px 26px;color:#0a0a0a;font-weight:700;text-decoration:none;font-size:14px;">Download the PDF</a>
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
    const html = emailHtml(dateLabel)
    console.log('html   :', html.length, 'bytes')
    if (process.env.EMAIL_HTML_OUT) {
      const { writeFileSync } = await import('node:fs')
      writeFileSync(process.env.EMAIL_HTML_OUT, html)
      console.log('wrote  :', process.env.EMAIL_HTML_OUT)
    }
    return
  }

  console.log(`waiting for ${SNAPSHOT_URL} ...`)
  if (!(await waitForUrl(SNAPSHOT_URL))) {
    throw new Error('Snapshot never became reachable; not sending an email with a dead link.')
  }

  const recipients = { list_id: LIST_ID }
  if (SEGMENT_ID) recipients.segment_opts = { saved_segment_id: Number(SEGMENT_ID) }

  const campaign = await mc('/campaigns', 'POST', {
    type: 'regular',
    recipients,
    settings: {
      subject_line: subject,
      title: `Radar snapshot ${new Date().toISOString().split('T')[0]}`,
      from_name: FROM_NAME,
      reply_to: REPLY_TO,
      auto_footer: false,
    },
  })
  console.log('created campaign', campaign.id)

  await mc(`/campaigns/${campaign.id}/content`, 'PUT', { html: emailHtml(dateLabel) })
  await mc(`/campaigns/${campaign.id}/actions/send`, 'POST')
  console.log('sent campaign', campaign.id)
}

main().catch(e => { console.error(e.message); process.exit(1) })
