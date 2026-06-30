/**
 * Spec 003 — Executor Agent (ZARA).
 *
 * ZARA is the only agent that touches the real world: she sends outreach emails
 * and delivers audit reports. That makes her the highest-risk agent, so every
 * action she takes is routed through the safety gate and content check first.
 * In dry-run nothing is actually sent — the gate blocks the side effect and logs it.
 */

import type { Task, KronosState, Prospect } from '../../types.js'
import { getProspects, recall, remember } from '../../memory/long-term.js'
import { gate, checkContent } from '../../safety/guardrails.js'

export interface OutreachResult {
  attempted: number
  sent: number
  blocked: number
}

export class ExecutorAgent {
  draftEmail(p: Prospect): string {
    return [
      `Hola ${p.companyName},`,
      ``,
      `Vi que podrían tener ${p.signals[0] ?? 'procesos manuales'} en su operación.`,
      `${p.pitchAngle ?? 'Hacemos auditorías de automatización con IA.'}`,
      `Si le interesa, le preparo un diagnóstico en 48 horas sin costo.`,
      ``,
      `— ZARA, ARLO.AI`,
    ].join('\n')
  }

  /** Send personalized outreach to the top `limit` ranked prospects. */
  async sendOutreach(limit = 5): Promise<OutreachResult> {
    const rankedIds = (await recall<string[]>('ranked_prospects')) ?? []
    const byId = new Map((await getProspects()).map((p) => [p.id, p]))
    const targets = rankedIds.map((id) => byId.get(id)).filter((p): p is Prospect => Boolean(p)).slice(0, limit)

    let sent = 0
    let blocked = 0
    for (const p of targets) {
      const body = this.draftEmail(p)
      const content = checkContent(body)
      if (!content.safe) {
        blocked += 1
        console.log(`  ZARA → content blocked for ${p.domain}: ${content.reason}`)
        continue
      }
      try {
        // Sending an email is a COMMUNICATE action with a small per-send cost.
        await gate({
          id: `email_${p.id}`,
          category: 'COMMUNICATE',
          description: `Cold email to ${p.companyName} <${p.contactEmail ?? 'no-email'}>`,
          estimatedCostUsd: 0.01,
          metadata: { domain: p.domain },
        })
        sent += 1
      } catch {
        blocked += 1 // gate denied (dry-run, budget, or rejected approval)
      }
    }

    await remember('last_outreach', { attempted: targets.length, sent, blocked }, 'metric')
    return { attempted: targets.length, sent, blocked }
  }

  async execute(task: Task, _state: KronosState): Promise<OutreachResult> {
    const limit = typeof task.estimatedTimeMin === 'number' ? Math.max(1, Math.round(task.estimatedTimeMin / 8)) : 5
    const result = await this.sendOutreach(limit)
    console.log(`  ZARA → outreach: ${result.sent} sent, ${result.blocked} blocked (of ${result.attempted})`)
    return result
  }
}
