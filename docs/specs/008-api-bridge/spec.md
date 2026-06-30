# Spec 008 — API Bridge (backend → stream)
> Status: IMPLEMENTED (src/api/) · Priority: P1 — without it the stream cannot show real state
> Last updated: 2026-06-30

## Purpose

The stream frontend visualizes ARLO's work for viewers. Per the constitution (P3 One Source of
Truth, P5 Separation of Observation and Execution) the stream is a **read-only mirror** of the
agent's state. This spec defines the read-only bridge that lets the stream poll the backend's
real `KronosState` instead of showing simulated data.

## Contract

```
GET     /api/status   → 200  StatusDTO (JSON) + CORS
OPTIONS /api/status   → 204  CORS preflight
GET     /<other>      → 404  { error: "not found" }
<non-GET> /api/status → 405  { error: "method not allowed" }
```

`StatusDTO` (stable public shape the stream consumes):

| field | type | source |
|---|---|---|
| `phase` | `Phase` | `state.phase` |
| `revenue` | number | `state.totalRevenue` |
| `weeklyRevenue` | number | `state.weeklyRevenue` |
| `target` | number | `7000` (ADR 0001 D3) |
| `progressPct` | number | `clamp(round(revenue/target*100), 0, 100)` |
| `clients` | number | `state.currentClients` |
| `daysRunning` | number | `state.daysRunning` |
| `primaryGoal` | string | `state.primaryGoal` |
| `lastReflection` | string \| null | `state.lastReflection ?? null` |
| `updatedAt` | ISO string | serialization time |

## Acceptance Criteria

- **AC-01 Read-only.** `src/api/` MUST NOT import `gate`, write business state, move money, or
  mutate `KronosState`. It only reads via an injected `loadState`.
- **AC-02 Mapping.** `serializeStatus` maps every field above; `progressPct` is clamped to
  `[0,100]`; `lastReflection` is `null` when absent; `target` defaults to `7000`.
- **AC-03 Routing.** The server returns the status codes in the Contract for each case.
- **AC-04 CORS.** `Access-Control-Allow-Origin: *` is present (the stream is a public,
  read-only browser app); OPTIONS preflight returns 204.
- **AC-05 No new deps.** Uses `node:http` only — the backend stays dependency-light and the
  bridge cannot pull in anything that could touch the real world.
- **AC-06 Injectable.** `createStatusServer({ loadState })` takes a state loader so it is
  testable without the global memory store and without a running agent cycle.

## Out of scope
- Writing state (forbidden by P5). - Auth (status is public per constitution). - Supabase wiring
  (the loader is injected; production passes a Supabase-backed loader later).
