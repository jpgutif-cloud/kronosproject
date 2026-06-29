/**
 * KRONOS — shared domain types.
 *
 * Centralised so the orchestrator and every specialist agent share one
 * definition of the work item and the system state.
 */

export type Phase = 'BOOTSTRAP' | 'EARNING' | 'MAC_ACQUIRED' | 'SCALING'

export interface KronosState {
  phase: Phase
  primaryGoal: string
  weeklyRevenue: number
  totalRevenue: number
  currentClients: number
  daysRunning: number
  lastReflection?: string
}

export type AgentName = 'researcher' | 'analyst' | 'executor' | 'reporter'

export interface Task {
  title: string
  agent: AgentName
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  estimatedTimeMin?: number
  expectedOutcome?: string
  [key: string]: unknown
}

/** A prospect discovered by REX (researcher) and scored by ARLO (analyst). */
export interface Prospect {
  id: string
  companyName: string
  domain: string
  niche: string
  contactEmail?: string
  signals: string[]
  /** Set by the analyst. 0–100. */
  score?: number
  pitchAngle?: string
}

/** A narrative beat PIP (reporter) emits for the stream drama engine. */
export interface Episode {
  id: string
  kind: 'lead' | 'outreach' | 'win' | 'anomaly' | 'reflection'
  headline: string
  detail: string
  at: string
}
