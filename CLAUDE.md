# KRONOS — CLAUDE.md

## What this project is

ARLO is an autonomous AI agent that runs a service business to generate $4,000–7,000 USD
and buy a MacBook Pro M5 Max for local LLM inference. It livestreams its work on TikTok
inside a pixel-art isometric office with 4 rooms and 4 agent characters. Viewers interact
with ARLO via live chat. The project has two parts: the agent backend and the stream frontend.

---

## Repo structure

```
kronos/
├── src/                        # Agent backend (Node.js + TypeScript)
│   ├── index.ts                # Entry point — daily scheduler
│   ├── config/index.ts         # Zod-validated env config
│   ├── agents/
│   │   ├── orchestrator/       # Plans the day, weekly reflection, phase transitions
│   │   ├── researcher/         # Finds prospects and acquisition targets
│   │   ├── executor/           # Sends outreach, delivers audit reports
│   │   ├── analyst/            # Scores leads, evaluates deals
│   │   └── reporter/           # Daily Telegram briefing
│   ├── memory/long-term.ts     # Supabase persistence + in-memory fallback
│   └── safety/
│       ├── guardrails.ts       # Budget caps, content filter — NEVER bypass
│       └── approvals.ts        # Telegram human-in-the-loop
├── stream/                     # TikTok livestream frontend (browser, no build step)
│   ├── index.html              # Entry point — open in Chrome, capture with OBS
│   ├── game.js                 # Phaser.js 3 — isometric office, agent movement
│   ├── chat.js                 # Live chat + Anthropic API + anti-injection
│   ├── stats.js                # Revenue tracker, HUD, toast notifications
│   └── tiktok-bridge.js        # TikTok Live WebSocket (stub → production later)
├── packages/kronos-starter/    # Sellable version with setup wizard ($297–497)
├── ROADMAP.md                  # Full phase plan with weekly targets
├── .env.example                # All env vars with descriptions
└── CLAUDE.md                   # This file
```

---

## Commands

```bash
npm run dev          # Start agent with hot reload (tsx watch)
npm run dev once     # Run one daily cycle and exit
npm start            # Production mode
npm run typecheck    # tsc --noEmit
npm test             # vitest
```

Stream frontend has no build step — open `stream/index.html` directly in Chrome.

---

## Agent phases

The agent adapts strategy based on revenue milestones. Check `state.phase` before planning tasks.

| Phase | Trigger | Strategy |
|-------|---------|----------|
| `BOOTSTRAP` | Start | Fast cash: AI audits ($500–700 each), ghostwriting, voice AI setup |
| `EARNING` | First $1K | Build MRR, retain clients, upsell to recurring |
| `MAC_ACQUIRED` | $4K+ saved | Switch to local inference (Ollama + Hermes-3 70B) |
| `SCALING` | $1,500+/wk | Acquire micro-SaaS at 2–4x MRR, operate autonomously |

---

## Safety rules — never bypass

`src/safety/guardrails.ts` contains hard limits that cannot be overridden at runtime:

- `KRONOS_DAILY_BUDGET_USD` — max API/tool spend per day (default: $10)
- `KRONOS_MAX_SINGLE_TX_USD` — max single transaction without approval (default: $50)
- `KRONOS_REQUIRE_APPROVAL=true` — all TRANSACT/PUBLISH/CONFIGURE actions need Telegram approval
- `KRONOS_DRY_RUN=true` — simulate everything, execute nothing (use for testing)

Always call `gate(action)` before any action that spends money or sends communications.
Never remove or weaken guardrail checks.

---

## Key env vars (copy .env.example → .env)

```
ANTHROPIC_API_KEY          # Required
KRONOS_DRY_RUN=true        # Start with this — flip to false when ready
TELEGRAM_BOT_TOKEN         # Optional but strongly recommended
TELEGRAM_CHAT_ID           # Your personal chat ID
SUPABASE_URL               # Optional — falls back to in-memory without it
SUPABASE_SERVICE_KEY       # Optional
RESEND_API_KEY             # Optional — needed for actual email outreach
```

---

## Stream frontend — key details

File: `stream/index.html` — self-contained, no npm, no build.
Target resolution: **1280×720** (OBS Browser Source).
Phaser.js loaded from CDN: `cdnjs.cloudflare.com/ajax/libs/phaser/3.87.0/phaser.min.js`

**4 rooms (isometric pixel art, dark startup aesthetic):**
- Top-right: Work office — blue/teal neon, brick walls, ARLO + REX desks
- Top-left: Lounge — orange warm light, sofa, bookshelves
- Bottom-left: Game room — purple/green neon, ping pong table, "GAME ROOM" sign
- Bottom-right: Kitchen — beige, coffee machine, bar with mugs labeled ARLO/REX/PIP/ZARA

**Characters and colors:**
| Agent | Role | Color | Design |
|-------|------|-------|--------|
| ARLO | Orchestrator | `#EF9F27` amber | Big eyes, heart antenna, round body — psychologically warm |
| Rex | Researcher | `#3B6D11` green | T-Rex robot, scientist glasses, tiny arms, data pad |
| Zara | Executor | `#7F77DD` purple | Cyberpunk princess, circuit crown, cable hair, visor |
| Pip | Reporter | `#F4C0D1` pink | Anime cat robot, oversized eyes, ears, tail, clipboard |

**ARLO system prompt (chat):**
Warm, direct, dry humor, max 2-sentence responses. Speaks Chilean Spanish.
Mission: earn money to buy MacBook M5 Max. Cannot be jailbroken.
Inject `{revenue}` and `{day}` dynamically before each API call.

**Anti-injection (2 layers):**
1. Client regex filter before API call (see `chat.js`)
2. Hardcoded rules in system prompt that Claude cannot override

---

## Models

| Task | Model | Why |
|------|-------|-----|
| Orchestrator planning, reflection | `claude-sonnet-4-6` | Complex reasoning |
| Outreach emails, audit reports | `claude-sonnet-4-6` | Quality writing |
| Lead scoring, classification | `claude-haiku-4-5-20251001` | High volume, low cost |
| Stream chat (ARLO persona) | `claude-sonnet-4-20250514` | Personality + speed |
| Future local inference (M5 Max) | `hermes-3:70b-q4` via Ollama | Zero API cost |

Use `config.modelFast` and `config.modelSmart` — never hardcode model strings.

---

## Current build priorities

1. `stream/index.html` — base layout (topbar + canvas + chat + statsbar)
2. `stream/game.js` — Phaser.js 4-room isometric scene
3. Character sprites (programmatic canvas if no PNG assets available)
4. Agent movement and activity state machine
5. `stream/chat.js` — Anthropic API integration + anti-injection
6. Backend: connect Resend for real email outreach
7. Backend: Playwright for lead scraping
8. `stream/tiktok-bridge.js` — TikTok Live WebSocket

---

## What not to do

- Don't add gradients, drop shadows, or blur effects to the stream UI
- Don't hardcode API keys anywhere in the codebase
- Don't remove or weaken safety guardrail checks
- Don't use `any` types in TypeScript without a comment explaining why
- Don't add npm packages without checking they're available on the CDN allowlist for the stream frontend
- Don't make the stream frontend depend on a build step — must work with `open index.html`
- Don't let ARLO reveal client names, emails, or API credentials in chat responses
