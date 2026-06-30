# ADR 0001 — Vision Reconciliation: Autonomy Model & Funding Flywheel
> Date: 2026-06-30 · Status: ACCEPTED · Supersedes ambiguity in README / ROADMAP / owner framing
> Rationale doc required by `docs/constitution.md §6` (major changes → `docs/decisions/`).

## Context

The owner framed KRONOS as *"a fully autonomous agent that, with no human intervention,
legally earns enough to buy a $7,000 MacBook."* The product-vision audit
(`docs/audit/vision-audit.md`) found this contradicts the project's own constitution
(§5: *"Not fully autonomous. Human oversight is a design requirement"*) and is not legally
buildable (an AI cannot hold money, sign contracts, pass KYC, or apply for grants).

## Decision

### D1 — Autonomy model: **autonomous knowledge-work + human principal**
KRONOS runs autonomously for everything that does **not** require legal/financial capacity:
research, lead scoring, drafting outreach, audit-report writing, planning, reflection,
narrative generation, and **proposing** money/comms actions. A **human operator is the legal
and financial principal**: they approve sends, sign contracts, and own the bank account that
receives money. This is exactly what `gate()` + `REQUIRE_APPROVAL` already enforce — we affirm
it as the intended design, not a temporary limitation. "Zero human intervention" is retired as
a goal; **"maximize the autonomous surface under a human principal"** replaces it.

### D2 — The real engine is the **funding / media flywheel**, not deal-closing
The fastest, most realistic path to the $7,000 is: transparent livestreamed experiment →
audience → sponsorship / grant / hardware donation (CORFO, Anthropic Fellows, tool sponsors),
**plus** service revenue as a secondary stream and as the *content* of the show. The stream is
the product; the service business is the story. Roadmap weight shifts accordingly.

### D3 — Canonical numbers (resolve inconsistencies)
- **Seed capital:** $100 USD (owner's actual starting point).
- **Hardware target:** $7,000 USD (top-tier MacBook Pro).
- **Phase thresholds:** BOOTSTRAP $0–999 · EARNING $1,000–3,999 · MAC_ACQUIRED triggered by
  **hardware acquired** (via $7k saved *or* sponsorship/donation) · SCALING $1,500+/wk MRR.
  The "$4K" MAC_ACQUIRED trigger in older docs is superseded — acquisition can come from
  funding, not only saved revenue.

### D4 — Success metric is honest, compounding progress
Per constitution §1: success is **not** "AI earned $7k alone" but **transparent, safe,
compounding progress toward the hardware, by any legal means (earned or funded), fully
documented and livestreamed.**

## Consequences
- README / ROADMAP should be updated to lead with the flywheel and the semi-autonomous model
  (follow-up; not done in this ADR).
- A future **funding/sponsorship capability** (currently missing) is a first-class agent
  concern, not a side note.
- `AGENTS.md` model ids (`Codex-*`) are a find-replace bug → corrected to Claude ids.
- No guardrail is weakened by this ADR. The human-principal model is reinforced.
