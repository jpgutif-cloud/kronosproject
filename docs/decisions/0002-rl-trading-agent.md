# ADR 0002 — RL Trading Agent: Paper Quant Lab, not an Autonomous Earner

> Date: 2026-08-27 · Status: ACCEPTED · Depends on `docs/decisions/0001-vision-reconciliation.md`
> Analysis: `docs/audit/rl-trading-agent-analysis.md`

## Context

The owner asked whether a self-learning RL trading agent — trained ~1 year in
simulation, discovering and adapting strategies, aiming to "double capital" — is
buildable and whether it should serve KRONOS's goal of funding a MacBook.

The analysis found: (a) the *technical* assessment is accurate — sim training, backtest
sweeps, continuous learning and regime memory are real; "learn the whole market,"
"invent new math," and "consistently double capital" are not. (b) A *live, autonomous,
capital-growing* trading agent re-imports the retired "AI autonomously earns the money"
framing (ADR-0001) into a higher-variance, regulated domain, and **conflicts three ways
with KRONOS's own safety layer**: `BLOCKED_CONTENT` forbids financial advice / return
guarantees; the human-principal model (ADR-0001 D1) applies to exchange accounts (KYC,
custody, liability); and `gate()` + tiny caps + `dryRun` are incompatible with
autonomous 24/7 trading. Weakening any of these is forbidden by CLAUDE.md and ADR-0001.

## Decision

### D1 — Scope: **simulation-only "Paper Quant Lab," never a live autonomous earner**
KRONOS may build a research module that trains/evaluates trading strategies **entirely
in simulation** (historical backtest + forward paper trading on live data feeds, **no
order execution**). It is a *research + content* capability, **not** part of the funding
plan. The funding engine remains the flywheel + service work (ADR-0001 D2). "Trading
doubles the capital" is **retired as a goal**, exactly as "zero-human autonomy" was.

### D2 — It lives on the stream as REX's transparent experiment
The lab is **stream content** (ADR-0001 D2: "the stream is the product"): public
hypotheses, backtests, walk-forward results, **honest drawdowns and failures**. This
feeds the flywheel (audience → sponsorship/grant) — the legitimate path to the Mac —
without emitting advice or performance claims to anyone.

### D3 — Anti-overfitting is a hard requirement, not a nicety
Any strategy shown or promoted must pass, in this order, or it is not shown as a result:
1. **Walk-forward** evaluation (rolling train/test), never single in-sample fit.
2. **Purged + embargoed** cross-validation to prevent look-ahead/leakage.
3. **Out-of-sample (OOS) holdout** gate the model never trained on.
4. **Regime tagging** (bull/bear/range/high-vol) with per-regime performance reported.
5. Metrics are **risk-adjusted and honest**: Sharpe/Sortino, **max drawdown**, and a
   **deflated Sharpe** (penalizing the number of strategies tried). Never "% gained" or
   "doubled" as the headline.

### D4 — Guardrails are reinforced, not weakened
- **No third-party advice / no guarantees.** The lab never tells a viewer or client
  what to trade and never markets a return. `BLOCKED_CONTENT` and `checkContent()`
  (`/guaranteed.*return|100%.*profit/i`) stay in force and apply to all lab output.
- **No self-custody, no autonomous execution.** The AI holds no exchange account and
  places no live orders. Any account is human-owned (KYC/liability = the human
  principal, ADR-0001 D1).
- **Cost-bounded.** Sim/training are batched research jobs inside the existing
  `dailyBudgetUsd`, not a 24/7 live compute loop.

### D5 — A live pilot is optional, tiny, gated, and *not* the plan
If the owner ever runs real capital, it is a **human-custodied, capped, kill-switched
pilot** behind `gate()` (category `TRANSACT`, within `maxSingleTxUsd`/`dailyBudgetUsd`,
`REQUIRE_APPROVAL` per order), enabled only after the D3 gate, treated as a data point —
**never** as the funding mechanism and **never** streamed/sold with a return number. A
new `ActionCategory` is **not** introduced to make trading "autonomous."

## Consequences

- If/when built, the module belongs under `src/agents/researcher/` (or a new
  `src/research/quant-lab/`) as a **sim-only** harness: data adapters (read-only feeds),
  backtest/paper engine, walk-forward + purged-CV evaluator, regime tagger, honest-metrics
  reporter. **No broker/exchange SDK, no order-execution path** is added by this ADR.
- All lab-generated text routes through `checkContent()` before any stream/report
  surface, same as other agent output.
- ROADMAP: the lab is **content for the flywheel**, not a revenue line. Success metrics
  (revenue/MRR) are unchanged; no trading P&L target is added.
- No guardrail, cap, or approval flow is modified. This ADR *narrows* the trading idea
  to its safe, honest core and firewalls the rest.
