/**
 * KRONOS — operator approvals (human-in-the-loop).
 *
 * The channel through which KRONOS asks its operator for permission and sends
 * notifications. Production uses a Telegram bot; in dry-run / unconfigured mode
 * everything is logged locally and high-risk requests are denied by default —
 * the safe choice is always "do nothing without a human".
 */

import { getConfig } from '../config/index.js'

export interface ApprovalRequest {
  title: string
  description: string
  estimatedCostUsd?: number
  metadata?: Record<string, unknown>
  reason?: string
}

const DRY_RUN_LOG: string[] = []

export function getDryRunLog(): readonly string[] {
  return DRY_RUN_LOG
}

/** Fire-and-forget operator notification (daily plan, reports, alerts). */
export async function notify(message: string): Promise<void> {
  const config = getConfig()
  if (config.dryRun || !config.telegramBotToken) {
    DRY_RUN_LOG.push(message)
    console.log(`[notify] ${message.split('\n')[0]}`)
    return
  }
  // Live path: send via Telegram once configured. Kept side-effect-free here.
  console.log(`[notify:telegram] ${message.split('\n')[0]}`)
}

/**
 * Blocking approval request. Returns true only on explicit operator approval.
 * In dry-run / unconfigured mode it denies by default — never auto-approve a
 * real-world action without a human.
 */
export async function notifyOperator(req: ApprovalRequest): Promise<boolean> {
  const config = getConfig()
  const line = `${req.title} — ${req.description}${req.estimatedCostUsd ? ` ($${req.estimatedCostUsd})` : ''}`

  if (config.dryRun || !config.telegramBotToken) {
    DRY_RUN_LOG.push(`[approval-denied:dry-run] ${line}`)
    console.log(`[approval] DENIED (dry-run, no human in loop): ${line}`)
    return false
  }

  // Live path: send the request to Telegram and await the operator's reply.
  console.log(`[approval] awaiting operator: ${line}`)
  return false
}
