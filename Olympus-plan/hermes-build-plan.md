# Hermes — Full Build Plan

Reference docs: `C:\Users\Vinícius\Documents\VSCode\olympus-plan\` (HERMES.md, ROADMAP.md, SUITE-ARCHITECTURE.md, HANDOFF.md)

**Current state**: M0 scaffold complete (fce4381). Port 8110. Graphite steel `#1F262E` + quicksilver cyan `#3EB8CC`. All routes exist; domain pages are EmptyPage placeholders. Aetheris has a chat shell (not wired). Auth, i18n, theme, supabase infra in place. PWA, 3D relay, `lib/sync/`, `lib/ai/` deferred.

---

## M1 — Engine (two parallel tracks)

### Track A: Production Edge Function

- [ ] **Generalize Pluto's `report-mailer`** into `chronos-audit/supabase/functions/outbox-consumer/`:
  - Polls `hermes-outbox` user_data for `pending` messages
  - Routes by `channel` (email → Resend; telegram → Telegram Bot API; whatsapp → Meta Cloud API)
  - Writes back `sent|failed` status + error detail + attempt counter
  - Reads `source` field for per-app routing logic
- [ ] **Schedule via `pg_cron`** (1–5 min interval) — migration in `supabase/migrations/`
- [ ] **Supabase secrets**: set `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, `WHATSAPP_TOKEN` (as needed)
- [ ] **Pluto migration**: switch Pluto's "Send now"/"Schedule monthly" from the interim `report-mailer` to the generalized outbox-consumer
- [ ] **Graceful fallback**: if a channel's secret is not set, mark message as `failed` with a clear "not configured" error (not a crash)

### Track B: n8n Design/Demo

- [ ] **Local Docker n8n** (`docker run -it -p 5678:5678 n8nio/n8n`)
- [ ] **Build flows** matching the production logic:
  - `heartbeat`: timestamp `hermes-flows` every minute
  - `outbox-consumer`: poll `hermes-outbox`, send via Resend, write back status
  - `monthly-report` (cron): trigger payload generation
- [ ] **Export flows** as JSON → `hermes/flows/*.json` and commit to repo
- [ ] **Demo recording** for portfolio proof

---

## M2 — App Core (Dashboard, Outbox, Channels, Runs)

### Domain model (`lib/`)

- [ ] **`lib/outbox/types.ts`** — Message type, status enum (pending/sent/failed), source/channel/template types
- [ ] **`lib/outbox/service.ts`** — CRUD + read from `hermes-outbox` user_data (pure functions)
- [ ] **`lib/outbox/store.tsx`** — React context with sync (pull on auth, debounced push)
- [ ] **`lib/flows/types.ts`** + **`service.ts`** — Run history, flow catalog metadata, cached in `hermes-flows`
- [ ] **`lib/channels/types.ts`** — Channel config state (configured/not-configured, test-send status)

### Pages

#### Dashboard (`/dashboard`)

- [ ] Delivery counters: sent/failed today + this week
- [ ] Channel health chips (email ✓/✗, telegram ✓/✗, whatsapp ✓/✗)
- [ ] Engine status ("n8n last seen: X min ago" via heartbeat timestamp in `hermes-flows`)
- [ ] Recent runs list (last 5–10)
- [ ] Pending outbox count badge

#### Outbox (`/outbox`)

- [ ] Message queue table: status (pending/sent/failed), source app chip (colored per suite identity), template, subject, timestamps, error detail
- [ ] Retry action (re-mark pending)
- [ ] Cancel action
- [ ] Filter by status/source/channel
- [ ] Read-only fallback for guest mode (show empty state with CTA to sign in)

#### Channels (`/channels`)

- [ ] Per-channel card: configured/not-configured status
- [ ] Docs snippet: where each secret goes (Supabase secrets → Edge Function)
- [ ] Test-send button per channel (writes a `custom` outbox message to the user's own email/telegram)
- [ ] Channel status: email (Resend), telegram (bot token check), whatsapp (Meta test mode)

#### Runs (`/runs`)

- [ ] Execution history table: timestamp, flow name, status (success/failed), duration, message count
- [ ] "Engine offline" banner when n8n not running locally (design view unavailable — production Edge Function keeps working)
- [ ] Cached fallback: read from `hermes-flows` when engine is unreachable

#### Aetheris wiring (M2 scope)

- [ ] Copy `lib/ai/` from Kairos (providers, actions, context, settings)
- [ ] Write `context.ts` for Hermes domain (outbox stats, run history, channel health)
- [ ] Action vocabulary: `retry_message`, `cancel_message`, `send_test`
- [ ] Wire the chat shell to the AI adapter (following §3a converged pattern)
- [ ] Add History tab from day one (don't repeat Pluto's gap)
- [ ] Add locale instruction to system prompt
- [ ] Use `ActionPill.tsx` chip component (not prose bullet list)
- [ ] Centralize color-wash helper in `lib/color.ts` (`alpha()`)
- [ ] Add Overview tab content (outbox pending count, channel health, last run)

---

## M3 — Flow Visualization

- [ ] Parse committed n8n JSON (`hermes/flows/*.json`) into suite-style SVG nodes
- [ ] Custom renderer: absolute-positioned nodes + `-rule` gradient edges (NOT an n8n iframe)
- [ ] Each flow card shows: trigger type, node chain (count + names), last run status
- [ ] Click → run history filtered to that flow
- [ ] "Engine offline" banner = "n8n not running locally for design" (NOT a production outage — Edge Function is independent)
- [ ] i18n copy for flow domain terms

---

## M4 — Second Channel

### Telegram (ship)

- [ ] Edge Function: add Telegram bot delivery via `telegraf` or raw Bot API
- [ ] Channel config in Hermes app: bot token input + "Test send" button
- [ ] n8n flow JSON updated with Telegram node (for demo artifact)
- [ ] Channel health check: verify bot token responds to `getMe`

### WhatsApp (stretch, Meta Cloud API test mode)

- [ ] Edge Function: add WhatsApp delivery (up to 5 verified recipients — user's own phone)
- [ ] Channel config + test send
- [ ] n8n flow JSON updated with WhatsApp node
- [ ] Document limitations (test mode, not production)

---

## M5 — Ship

### Landing enhancements

- [ ] **3D kinetic relay anchor**: replace static `HermesMark` with Three.js scene (`@react-three/fiber` + `drei`)
  - Diamond node core with material animation
  - Swept wing feathers that pulse with signal ticks
  - Add to `vite.config.ts` vendor chunk for three.js

### PWA

- [ ] Configure `vite-plugin-pwa` (copy Chronos config)
- [ ] Generate icons from HermesMark (via `scripts/generate-icons.mjs`)
- [ ] Set theme-color to graphite steel `#1F262E`
- [ ] Service worker: `generateSW` strategy

### Deploy

- [ ] Vercel project: `hermes-suite`
- [ ] Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- [ ] `vercel --prod`
- [ ] Check chunk-size output (watch for bundle regressions — three.js should be a separate chunk)

### Suite integration

- [ ] Add `hermes-suite.vercel.app` to `ALLOWED_ORIGIN` in `ai-proxy` secrets
- [ ] Add Hermes link to Chronos landing suite section
- [ ] Add Hermes link to Kairos landing suite section
- [ ] Add Hermes link to Pluto landing suite section
- [ ] Update `olympus-plan/ROADMAP.md` milestone status
- [ ] Update `olympus-plan/README.md` table with Hermes row

### Pluto migration

- [ ] Verify Pluto's scheduled reports flow through the generalized Edge Function end-to-end
- [ ] Remove Pluto's interim `report-mailer` Edge Function (after confirming the generalized one works)

---

## Cross-cutting (ongoing)

- [ ] **i18n**: Add domain vocabulary to `dictionaries.ts` (outbox, flows, runs, channels terms) in both PT and EN as each milestone lands
- [ ] **TypeScript**: `tsc --noEmit -p tsconfig.app.json` — 0 errors at every milestone
- [ ] **Tests**: Vitest suite for each new `lib/<domain>/service.ts` module
- [ ] **Build verification**: `pnpm build` after each phase — check chunk-size output
- [ ] **Mobile**: verify every page at 375px viewport; the hamburger drawer exists from M0 but new page content must not break mobile layout
- [ ] **Sync engine** (`lib/sync/`): copy from Kairos once M2 creates domain data to sync
- [ ] **Live browser pass**: desktop 1920×1080 + mobile 375px before declaring each milestone done

---

## Verification commands (run at every milestone)

```bash
pnpm test -- --run
pnpm typecheck
pnpm build
```
