# blendertutoring.com

Vite + React site, built to `docs/` and served by GitHub Pages.

## Scheduled jobs

| Workflow | When | What it does |
|---|---|---|
| `deploy.yml` | push to `main` | publishes `docs/` to GitHub Pages |
| `radar-discord.yml` | daily, 14:00 UTC | posts a Radar digest to Discord |
| `radar-snapshot.yml` | 1st and 15th, 14:00 UTC | builds a PDF snapshot of The Radar, publishes it, and emails subscribers |

### Repository secrets

Under Settings → Secrets and variables → Actions:

| Secret | Required? | Notes |
|---|---|---|
| `VITE_RAWG_API_KEY` | yes | already used by the Discord job |
| `MAILCHIMP_API_KEY` | yes, to email | Mailchimp → Account & billing → Extras → API keys. The `-usX` suffix selects the datacenter, so paste it whole |
| `MAILCHIMP_LIST_ID` | no | discovered automatically. Only needed if the account has more than one audience |
| `MAILCHIMP_REPLY_TO` | no | defaults to the audience's own "from" address |
| `MAILCHIMP_FROM_NAME` | no | defaults to the audience's own sender name |
| `MAILCHIMP_SEGMENT_ID` | no | send to one saved segment (e.g. only `the-radar` subscribers) instead of everyone |

The audience, its reply address, and its sender name are read from Mailchimp at
send time, so there is nothing to keep in sync — **one API key is enough.**

Until that key exists the PDF is still built and published; only the email step
fails.

### Running the snapshot by hand

```bash
node scripts/radar-snapshot.js --fixture   # sample data, no API key needed
node scripts/radar-snapshot.js             # live data
DRY_RUN=1 node scripts/radar-email.js      # build the campaign without sending
TEST_EMAIL=you@example.com node scripts/radar-email.js   # mail only that address
```

Use the workflow's **Run workflow** button for a manual run. It takes two
inputs:

- **test_email** — mails only that address, then deletes the draft. Subscribers
  receive nothing. Use this to check the email before a real send.
- **send_email** — sends to every subscriber. Leave it unticked unless you
  mean it.

Leaving both empty builds and publishes the PDF without sending anything.

---

Below: the stock Vite template notes.

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
