<div align="center">

<img src="apps/web/public/logo.png" alt="Operiq logo" width="96">

# Operiq

### Smart operations, from your chat

**[▶ Watch the demo video](https://drive.google.com/file/d/1_DeCDh6bpsXJi34R0zoPCawRezveqGMM/view?usp=drive_link)** <!-- TODO: replace with the new recording -->

A personal full-stack project: an AI agent you set up on the website and then instruct on Telegram.
It analyzes your sheets, builds reports with charts, schedules meetings and updates your team on Slack,
with every step recorded.

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?logo=redis&logoColor=white)
![Tests](https://img.shields.io/badge/tests-68%20passing-22C55E)

</div>

<p align="center">
  <img src="docs/screenshots/landing.png" alt="Operiq landing page" width="900">
</p>

| Create your agent | Dashboard |
|---|---|
| <img src="docs/screenshots/agent.png" alt="Agent setup with avatar, name, personality and live preview"> | <img src="docs/screenshots/dashboard.png" alt="Dashboard with integrations, saved sheets and recent tasks"> |

## 📑 Contents

- [Features](#-features)
- [Quick start](#-quick-start)
- [Architecture](#-architecture)
- [Setup](#-setup)
- [Environment variables](#-environment-variables)
- [Commands](#-commands)
- [Tests](#-tests)
- [Deployment](#-deployment)
- [Known limitations](#-known-limitations)
- [Demo script](#-demo-script)

## ✨ Features

| | |
|---|---|
| 🧑‍💼 **Onboarding** | Landing page → sign up → create your agent (avatar, name, personality) → welcome screen to connect apps |
| 💬 **Agent persona** | Replies use the agent's name and tone, in the user's language (e.g. Hinglish) |
| 📊 **Data analysis** | CSV/XLSX uploads and Google Sheets: totals, averages, growth, profit/loss and group totals, **computed in code** |
| 📄 **Reports** | A summary card image in the chat plus an A4 PDF with a chart, delivered with an expiring signed link |
| 📁 **Saved sheets** | Save a sheet as `sales` and say *"my sales sheet"*; a default sheet is used when none is named |
| 📅 **Calendar** | Events with a Google Meet link and invites (defaults: 1 hour, local timezone) |
| 🟪 **Slack** | Posts and report files go only to approved channels, shown as *"John · for Garv"* |
| 🛡️ **Safety** | Confirmation before external actions, no duplicate actions on retry, and a check that catches replies claiming actions that never happened |
| 🔑 **Accounts** | Change password, plus "forgot password" delivered to the user's linked Telegram chat |

## 🚀 Quick start

```bash
pnpm install
cp .env.example .env          # fill in your keys (see Setup)
docker compose up -d          # Postgres + Redis
pnpm db:migrate               # create the tables
pnpm dev                      # web :3000 · api :4000 · worker
```

Open http://localhost:3000 → sign up → create your agent → connect your apps.

## 🏗️ Architecture

```mermaid
flowchart LR
  TG[Telegram user] <--> API
  subgraph API[apps/api · Fastify]
    BOT[Bot handler<br/>MessagingAdapter]
    HTTP[Auth · OAuth · dashboard API<br/>signed downloads]
  end
  WEB[apps/web · Next.js dashboard] -- /api/* proxy --> HTTP
  BOT -- task row + job --> Q[(Redis · BullMQ)]
  Q --> W[apps/worker · agent loop]
  W <--> LLM[LLM · OpenAI-compatible API]
  W --> T[Tools: read_sheet · analyze_data ·<br/>create_calendar_event · send_slack_message ·<br/>generate_report · list_files]
  T --> EXT[Google Sheets / Calendar · Slack]
  API & W --> DB[(PostgreSQL · Prisma)]
  W -- reply via MessagingAdapter --> TG
```

**How a message flows**

1. The bot receives a message (duplicate `update_id`s are ignored), creates a `tasks` row with status `queued`, enqueues a job and acknowledges immediately.
2. The worker moves the task to `running` and runs the agent: at most 8 model turns at temperature 0.1. Up to 6 recent exchanges from the same chat (last 30 minutes) are included, so details given across several messages add up.
3. Every tool call is validated with Zod and recorded as a `task_steps` row (input, output or error, timestamps, external IDs). Invalid arguments are returned to the model so it can correct itself.
4. External actions (Slack posts, calendar invites to other people) pause the task in `awaiting_confirmation` and the bot asks with ✅ / ❌ buttons. On approval the agent resumes from its saved state.
5. The task ends as `completed` or `failed`. The bot sends the reply, code-written receipts (report link, event and Meet links, `💬 Posted to Slack`), then the summary card and PDF.

**Key rules**

- 🧮 **The model never does math.** `apps/worker/src/analysis.ts` computes every number. The model only gets compact summaries (columns, row count, stats, 5 sample rows), never whole files.
- 🔗 **Links and receipts come from code**, never written by the model.
- 🔍 **Claims are checked.** If the final reply claims a Slack post or calendar event that no tool call backs up, the model is sent back once. If it still claims it, the reply ends with a warning such as `⚠️ Nothing was posted to Slack in this task.`
- ✅ **Slack allowlist.** `send_slack_message` refuses channels the user hasn't approved, records a `rejected` step and tells the user.
- 🔁 **No duplicate actions.** Each tool call has an idempotency key `(task_id, step_index, tool)`. A completed step is never re-run, and the agent state is saved after every step, so retries resume exactly where they stopped.
- ⏳ **Retries.** BullMQ retries transient errors (network, 429, 5xx) with exponential backoff. The Slack client waits out `ratelimited` responses using `Retry-After`. Validation and permission errors are not retried.
- 🔐 **Security.**
  - Passwords are hashed with argon2; sessions use httpOnly cookies (stored as hashes).
  - OAuth tokens are encrypted with AES-256-GCM, and OAuth callbacks only accept a state created for the logged-in user.
  - Download links are HMAC-signed and expire (24h by default); anything else gets 403.
  - Password reset links are single-use, expire after 15 minutes, are stored only as hashes, and log out all sessions.
  - Every database query is scoped to the user. Tokens, cookies and query strings are never logged.

**Project layout**

```
apps/api          Fastify: auth, password reset, OAuth callbacks, dashboard API, signed downloads, Telegram bot handler
apps/worker       BullMQ worker: agent loop, tools, claim check, analysis, chart, card and PDF reports
apps/web          Next.js + Tailwind: landing, login, onboarding, welcome, dashboard, agent, tasks, account
packages/shared   env, Prisma schema, migrations and client, crypto, signed URLs, task states, queue, messaging adapters
docs/screenshots  Images used in this README
```

## 🛠️ Setup

**Requirements:** Node 20+, pnpm 10, Docker. Run the [Quick start](#-quick-start) commands, then set up the integrations below.
`docker-compose.yml` runs only Postgres and Redis; the apps run with `pnpm dev`.
Google and Slack need `APP_URL` to be the address you open the dashboard on, and Slack requires HTTPS, so use a tunnel locally.

<details>
<summary><b>💬 Telegram</b></summary>

1. Message [@BotFather](https://t.me/BotFather) and run `/newbot`.
2. Copy the token into `TELEGRAM_BOT_TOKEN`, and the bot's username (without `@`) into `TELEGRAM_BOT_USERNAME`.
3. Optional: set a picture with `/setuserpic`.

The bot uses long polling, so no webhook is needed. If `t.me` links are blocked on a network, users can search for the bot in Telegram and send the `/start <code>` shown in the dashboard.
</details>

<details>
<summary><b>📊 Google Sheets & Calendar</b></summary>

1. In Google Cloud Console, create a project and enable the **Google Sheets API** and the **Google Calendar API**.
2. Configure the OAuth consent screen and add test users.
3. Create an OAuth client of type *Web application* with redirect URI `<APP_URL>/api/oauth/google/callback`.
4. Copy the client ID and secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

Scopes requested: `spreadsheets.readonly`, `calendar.events`.
</details>

<details>
<summary><b>🟪 Slack</b></summary>

1. Create an app at https://api.slack.com/apps.
2. Under *OAuth & Permissions*, add the redirect URL `<APP_URL>/api/oauth/slack/callback` and these **Bot Token Scopes**:

   | Scope | Why |
   |---|---|
   | `chat:write`, `chat:write.public` | Post to approved public channels |
   | `channels:read` | List channels for the approval list |
   | `channels:join`, `files:write` | Share report files |
   | `chat:write.customize` | Show posts as "Agent · for FirstName" with the agent's emoji |

3. Copy the client ID and secret from *Basic Information* into `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET`.
4. Under *Basic Information → Display Information*, set the app name and icon; file posts show these.
5. To allow other workspaces: *Manage Distribution → Activate Public Distribution*.
</details>

<details>
<summary><b>🧠 LLM</b></summary>

Any OpenAI-compatible endpoint:

| Provider | `OPENAI_BASE_URL` | `LLM_MODEL` |
|---|---|---|
| Ollama Cloud (default) | `https://ollama.com/v1` | `gpt-oss:120b` |
| OpenAI | `https://api.openai.com/v1` | e.g. `gpt-4o` |
| Local Ollama | `http://localhost:11434/v1` | e.g. `qwen3:8b` |

Put the provider's key in `OPENAI_API_KEY`.
</details>

<details>
<summary><b>🌐 Tunnel (HTTPS for local development)</b></summary>

```bash
cloudflared tunnel --url http://localhost:3000   # no account needed
# or: ngrok http 3000
```

Set `APP_URL` to the tunnel URL and update the Google and Slack redirect URLs. Free tunnel URLs change on every restart.
</details>

## 🔧 Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (the docker compose default works locally) |
| `REDIS_URL` | Redis connection string |
| `APP_URL` | Public dashboard URL; used for OAuth redirects, download and reset links |
| `API_URL` | Where the dashboard proxies `/api/*` (default `http://localhost:4000`; read when the dashboard is built) |
| `API_PORT` | API port (default 4000) |
| `ENCRYPTION_KEY` | 32 bytes, base64 (`openssl rand -base64 32`). Encrypts OAuth tokens. **Never change it after users connect apps.** |
| `SIGNING_SECRET` | HMAC secret for download links and OAuth state |
| `OPENAI_BASE_URL` | LLM endpoint (OpenAI-compatible) |
| `OPENAI_API_KEY` | LLM API key |
| `LLM_MODEL` | Model name, e.g. `gpt-oss:120b` |
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
| `TELEGRAM_BOT_USERNAME` | Bot username, used for the account-link URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | Slack app credentials |
| `STORAGE_DIR` | Directory for uploads and reports (default `./storage`) |
| `DOWNLOAD_LINK_TTL_HOURS` | Download link lifetime (default 24) |
| `TIMEZONE` | IANA timezone for calendar events and the agent's sense of "today" (e.g. `Asia/Kolkata`) |

## ⌨️ Commands

| Command | |
|---|---|
| `docker compose up -d` | Start Postgres + Redis |
| `pnpm dev` | Run web, api and worker with live reload |
| `pnpm test` | Unit tests (Vitest); no database or network needed |
| `pnpm typecheck` | TypeScript check of all packages |
| `pnpm db:migrate` | Create and apply migrations (**development only**) |
| `pnpm --filter @app/shared exec prisma migrate deploy` | Apply existing migrations (**production**; reads `DATABASE_URL` from the environment) |

## 🧪 Tests

68 unit tests run with `pnpm test`, without a database, Redis or network (external services are mocked):

| Area | Covered |
|---|---|
| Permissions | Slack allowlist matching and refusal, refused steps recorded, validation errors returned to the model |
| Duplicate prevention | A completed step is never repeated on retry; a different step index is a new action |
| Reliability | Transient vs permanent errors, confirmation pause and resume, 8-turn limit, claim check |
| Task states | Allowed and rejected transitions, atomic updates, approving a pending action |
| Security | Signed URLs (valid, expired, tampered), OAuth state bound to the logged-in user, AES-GCM tokens, password reset (same reply for unknown emails, hashed single-use tokens, expiry, sessions cleared), change password |
| Calculations | Number parsing, totals, averages, growth, profit/loss, group totals and shares |
| Agent context | Multi-message history, saved-sheet resolution, agent persona in the prompt, Slack attribution |

## ☁️ Deployment

Operiq is a demo project that runs locally (see [Quick start](#-quick-start)). This section documents how it would be hosted.

The app is five parts: **web** (Next.js), **api** (Fastify + Telegram bot), **worker**, **PostgreSQL** and **Redis**.
Platforms that run Node directly (e.g. Render, Railway) need no Docker.

<details>
<summary><b>Step-by-step</b></summary>

1. **Database:** create a managed PostgreSQL database (e.g. Neon, Supabase, Render) and set
   `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require` on the api and worker.
   Run `pnpm --filter @app/shared exec prisma migrate deploy` once, and after each release that adds a migration.
   If the provider offers a pooled URL, run migrations with the direct URL; for the app, a pooled URL needs `&pgbouncer=true`.
   Turn on automatic backups.
2. **Redis:** a managed Redis (e.g. Upstash, Render Key Value). Set `REDIS_URL`.
3. **Secrets:** set every variable from the table above on the host, with `NODE_ENV=production` (secure cookies).
   Generate `ENCRYPTION_KEY` and `SIGNING_SECRET` once, keep them stable and back them up.
4. **Services:**
   - web: build `pnpm install && pnpm --filter @app/web build`, start `pnpm --filter @app/web start`. Set `API_URL` to the api's address before building.
   - api: `pnpm --filter @app/api start`. **Run exactly one instance**, since Telegram long polling allows only one.
   - worker: `pnpm --filter @app/worker start` (it can scale).
5. **Files:** give `STORAGE_DIR` a persistent disk shared by the api and worker.
6. **Domain:** set `APP_URL` to the public dashboard URL and update the Google and Slack redirect URLs to match.
</details>

## ⚠️ Known limitations

- **Messaging channel:** Telegram is implemented; WhatsApp is a planned channel. Agent and worker code only use the `MessagingAdapter` interface, so WhatsApp can be added as another adapter.
- **Calendar:** events can be created but not edited; the agent says so instead of creating a duplicate.
- **Google Sheets:** read-only (no writing to sheets).
- **File storage:** local disk with signed links instead of object storage; old files are never cleaned up.
- **Audit log:** `task_steps` records every tool call, but there is no separate `audit_logs` table for logins and connection changes.
- **Password reset:** self-service only for users who have linked Telegram; there is no email-based reset.
- **No login rate limiting** yet.
- **Slack:** file posts show the Slack app's name and icon (Slack doesn't allow custom senders on files), so attribution goes in the text. Users in one workspace share one bot.
- **External approvals:** the Google app stays in test mode (listed test users only) until verified by Google; other Slack workspaces need public distribution turned on.
- **Model reliability:** smaller models sometimes skip tool calls. Receipts and the claim check make this visible, and a stronger model reduces it.
- **Scaling:** the api must run as a single instance (Telegram long polling).

## 🎬 Demo script

1. **Landing page** → *Get started* → sign up with name, email and password.
2. **Create your agent:** pick an avatar, name it (e.g. "John"), choose a personality. The preview updates live.
3. **Welcome screen:** *Link Telegram* → open the bot → **Start** → "✅ Linked!". (Network blocks `t.me`? Search the bot in Telegram and send the `/start <code>` shown.)
4. **Connect Google and Slack.** On the dashboard, approve `#sales` and save a Google Sheet as `sales`.
5. **File → report:** send the bot a CSV/XLSX (e.g. `Week, Region, Revenue, Cost, Orders`). It replies with a summary, a `📄 Report:` link, a **summary card image** and the **PDF**. Change the link's `sig` and you get 403.
6. **Sheet, in Hinglish:** *"John, meri sales sheet analyze karo aur graphs ke saath report banao"*. The reply comes back in Hinglish with a report.
7. **Calendar:** *"Schedule a 30 min review tomorrow at 4pm with alice@example.com"* → ✅ Confirm → event and Meet links.
8. **Slack, approved:** *"Send the report to #sales"* → ✅ Confirm → `💬 Posted to Slack #sales with …pdf`. In Slack the post is attributed to "John · for <name>".
9. **Slack, refused:** *"Post hello to #general"* (not approved) → refused; nothing is posted.
10. **Audit log:** *Tasks* → open a task → step timeline with inputs, outputs, errors, durations and external IDs.
11. **Retry safety:** start a Slack post, restart `pnpm dev` before confirming, then confirm → exactly one message.
12. **Tests:** `pnpm test` → 68 passing.
