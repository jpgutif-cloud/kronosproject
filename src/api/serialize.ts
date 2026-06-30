/**
 * Spec 008 — API bridge serializer.
 *
 * Pure mapping from the internal KronosState to the stable, public StatusDTO the
 * stream frontend consumes. READ-ONLY: no side effects, no state mutation, no
 * money, no gate(). This is the observation layer (constitution P3 / P5).
 */

import type { KronosState, Phase } from '../types.js'

/** Default hardware target — $7,000 (ADR 0001 D3). */
export const DEFAULT_TARGET_USD = 7000

/** Stable, stream-facing view of the agent's state. */
export interface StatusDTO {
  phase: Phase
  revenue: number
  weeklyRevenue: number
  target: number
  /** revenue / target, as an integer percent clamped to [0, 100]. */
  progressPct: number
  clients: number
  daysRunning: number
  primaryGoal: string
  lastReflection: string | null
  updatedAt: string
}

export interface SerializeOptions {
  /** Hardware target in USD. Defaults to DEFAULT_TARGET_USD. */
  target?: number
  /** Injectable clock for deterministic tests. */
  now?: Date
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

/** Map internal state → public StatusDTO. Pure. */
export function serializeStatus(state: KronosState, opts: SerializeOptions = {}): StatusDTO {
  const target = opts.target ?? DEFAULT_TARGET_USD
  const now = opts.now ?? new Date()
  const revenue = state.totalRevenue
  const progressPct = target > 0 ? clampPct((revenue / target) * 100) : 0

  return {
    phase: state.phase,
    revenue,
    weeklyRevenue: state.weeklyRevenue,
    target,
    progressPct,
    clients: state.currentClients,
    daysRunning: state.daysRunning,
    primaryGoal: state.primaryGoal,
    lastReflection: state.lastReflection ?? null,
    updatedAt: now.toISOString(),
  }
}
