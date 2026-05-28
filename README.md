# KRONOS — Autonomous Business Agent

> An AI agent that researches, reaches clients, delivers services, and scales revenue — while you sleep.

[![CI](https://github.com/your-username/kronos/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/kronos/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node 20+](https://img.shields.io/badge/node-20%2B-brightgreen)](https://nodejs.org)

## What is KRONOS?

KRONOS is a multi-agent system built on Claude that autonomously runs a service business. It researches prospects, writes personalized outreach, delivers AI audits, sets up voice agents for clients, and reports daily progress via Telegram.

**Phase system** — KRONOS adapts its strategy based on revenue milestones:

| Phase | Trigger | Strategy |
|-------|---------|----------|
| `BOOTSTRAP` | Start | Fast cash: audits, ghostwriting. Target: $4–7K for hardware |
| `EARNING` | First $1K | Build MRR via recurring clients |
| `MAC_ACQUIRED` | MacBook M5 Max purchased | Local inference, zero API costs for internal reasoning |
| `SCALING` | $1,500+/wk MRR | Micro-SaaS acquisition, fully autonomous operation |

## Architecture

```
KRONOS
├── Orchestrator        → Plans the day, delegates tasks, weekly reflection
├── Researcher          → Finds prospects, opportunities, market data
├── Analyst             → Scores leads, evaluates deals, ROI analysis
├── Executor            → Sends emails, delivers reports, setups clients
└── Reporter            → Daily Telegram briefing, weekly insights

Safety Layer (always active)
├── Budget guardrails   → Hard daily spend cap
├── Approval system     → Telegram confirmation for high-stakes actions
└── Content filter      → Blocks harmful, spammy, or misleading content
```

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-username/kronos
cd kronos

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env with your API keys

# 4. Run once to test
npm run dev once

# 5. Run in production (starts daily scheduler)
npm start
```

**Minimum requirements:**
- Node.js 20+
- Anthropic API key (Claude Pro or API plan)
- Optional: Supabase project (for persistent memory)
- Optional: Telegram bot (for human-in-the-loop)

## Available Playbooks

Each playbook is a pre-built business strategy the agent can execute:

| Playbook | Revenue target | Time to first $ | Effort |
|----------|---------------|-----------------|--------|
| `audit-sprint` | $3,500–8,000 one-time | 1–2 weeks | Low |
| `voice-ai-clinic` | $149–299/mo recurring | 2–3 weeks | Low |
| `linkedin-ghostwriting` | $700–1,500/mo recurring | 1–2 weeks | Low |
| `b2b-outreach` | $1,500–2,500/mo recurring | 2–3 weeks | Medium |

## Safety

KRONOS is designed with safety as the primary constraint:

- **Budget caps**: configurable daily and per-transaction limits
- **Approval required**: all outreach, purchases, and publications need human sign-off
- **Dry run mode**: `KRONOS_DRY_RUN=true` simulates everything without executing
- **Audit trail**: all actions are logged to Supabase

## Kronos Starter (Commercial Package)

The `packages/kronos-starter` directory contains a simplified, sellable version of KRONOS with a guided setup wizard. It's designed for non-technical entrepreneurs who want a running agent in 10 minutes.

**Sold at:** $297–497 (one-time) via Gumroad

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full development plan.

## Contributing

KRONOS is open source. PRs welcome for new playbooks, tool integrations, and safety improvements.

## License

MIT — use freely, attribute kindly.
