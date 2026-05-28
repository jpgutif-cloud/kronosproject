/**
 * KRONOS Safety Guardrails
 *
 * These are non-negotiable hard limits. No agent, orchestrator, or
 * external instruction can bypass them. They protect the operator
 * from financial loss, legal issues, and irreversible mistakes.
 */

import { getConfig } from '../config/index.js'
import { notifyOperator } from './approvals.js'

export type ActionCategory =
  | 'READ'         // Safe: reading data, researching
  | 'COMMUNICATE'  // Medium: sending emails, DMs
  | 'TRANSACT'     // High: payments, purchases
  | 'PUBLISH'      // High: posting public content
  | 'CONFIGURE'    // High: changing settings
  | 'IRREVERSIBLE' // Critical: deletions, permanent changes

interface Action {
  id: string
  category: ActionCategory
  description: string
  estimatedCostUsd?: number
  metadata?: Record<string, unknown>
}

interface GuardrailResult {
  allowed: boolean
  reason?: string
  requiresApproval?: boolean
}

// Tracks spend within the current day
const dailySpend = new Map<string, number>() // date -> total USD

function todayKey(): string {
  return new Date().toISOString().split('T')[0]
}

export function recordSpend(amountUsd: number): void {
  const key = todayKey()
  dailySpend.set(key, (dailySpend.get(key) ?? 0) + amountUsd)
}

export function getDailySpend(): number {
  return dailySpend.get(todayKey()) ?? 0
}

/**
 * Primary guardrail check. Call before every action.
 * Returns { allowed, requiresApproval, reason }
 */
export function checkAction(action: Action): GuardrailResult {
  const config = getConfig()

  // DRY RUN: allow everything but never execute
  if (config.dryRun && action.category !== 'READ') {
    return { allowed: false, reason: `DRY RUN — would execute: ${action.description}` }
  }

  // Hard block: never allowed without human in the loop
  const hardBlocked: ActionCategory[] = ['IRREVERSIBLE']
  if (hardBlocked.includes(action.category)) {
    return {
      allowed: false,
      requiresApproval: true,
      reason: `IRREVERSIBLE actions require explicit operator approval`,
    }
  }

  // Budget check for transactional actions
  if (action.estimatedCostUsd !== undefined) {
    const cost = action.estimatedCostUsd

    if (cost > config.maxSingleTxUsd) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: `Single transaction $${cost} exceeds limit of $${config.maxSingleTxUsd}`,
      }
    }

    const todayTotal = getDailySpend()
    if (todayTotal + cost > config.dailyBudgetUsd) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: `Would exceed daily budget: $${todayTotal + cost} > $${config.dailyBudgetUsd}`,
      }
    }
  }

  // Actions that always require approval if flag is set
  const approvalRequired: ActionCategory[] = ['TRANSACT', 'PUBLISH', 'CONFIGURE']
  if (config.requireApproval && approvalRequired.includes(action.category)) {
    return { allowed: true, requiresApproval: true }
  }

  return { allowed: true }
}

/**
 * Full action execution gate. Checks guardrails and handles approval flow.
 * Throws if the action cannot proceed.
 */
export async function gate(action: Action): Promise<void> {
  const result = checkAction(action)

  if (!result.allowed && !result.requiresApproval) {
    console.warn(`[GUARDRAIL BLOCKED] ${action.description}: ${result.reason}`)
    throw new Error(`Action blocked by guardrail: ${result.reason}`)
  }

  if (result.requiresApproval) {
    const approved = await notifyOperator({
      title: `Approval needed: ${action.category}`,
      description: action.description,
      estimatedCostUsd: action.estimatedCostUsd,
      metadata: action.metadata,
      reason: result.reason,
    })

    if (!approved) {
      throw new Error(`Action rejected by operator: ${action.description}`)
    }
  }

  // Record spend after approval
  if (action.estimatedCostUsd) {
    recordSpend(action.estimatedCostUsd)
  }
}

// Blocked content categories — agent must never produce these
export const BLOCKED_CONTENT = [
  'financial advice or investment recommendations',
  'medical diagnoses or treatment recommendations',
  'legal advice',
  'content targeting minors',
  'deceptive or misleading claims',
  'spam or unsolicited bulk messaging',
] as const

export function checkContent(content: string): { safe: boolean; reason?: string } {
  const lower = content.toLowerCase()
  const indicators = [
    { pattern: /guaranteed.*return|100%.*profit/i, reason: 'financial guarantee claims' },
    { pattern: /medical.*diagnos|cure.*cancer/i, reason: 'medical claims' },
    { pattern: /legal.*advice|you.*should.*sue/i, reason: 'legal advice' },
    { pattern: /click.*now.*limited.*time.*offer/i, reason: 'spam patterns' },
  ]

  for (const { pattern, reason } of indicators) {
    if (pattern.test(lower)) {
      return { safe: false, reason }
    }
  }

  return { safe: true }
}
