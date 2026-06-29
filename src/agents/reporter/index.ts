/**
 * Spec 005 — Reporter Agent (PIP).
 *
 * PIP closes the daily loop: it compiles what happened, sends the operator a
 * Telegram briefing, persists state, and emits the Episode[] that feeds the
 * stream's K-Drama engine. It also flags anomalies that need human attention.
 */

import type { Task, KronosState, Episode } from '../../types.js'
import { recall, remember } from '../../memory/long-term.js'
import { notify } from '../../safety/approvals.js'
import { getDailySpend } from '../../safety/guardrails.js'

interface OutreachMetric { attempted: number; sent: number; blocked: number }

export class ReporterAgent {
  /** Build the Episode[] the drama engine consumes from today's real events. */
  async buildEpisodes(state: KronosState): Promise<Episode[]> {
    const outreach = (await recall<OutreachMetric>('last_outreach')) ?? { attempted: 0, sent: 0, blocked: 0 }
    const ranked = (await recall<string[]>('ranked_prospects')) ?? []
    const now = new Date().toISOString()
    const episodes: Episode[] = []

    if (ranked.length > 0) {
      episodes.push({ id: `ep_${ranked.length}_leads`, kind: 'lead', headline: `REX trajo ${ranked.length} prospectos`, detail: 'El pipeline tiene leads frescos para hoy.', at: now })
    }
    if (outreach.sent > 0) {
      episodes.push({ id: 'ep_outreach', kind: 'outreach', headline: `ZARA envió ${outreach.sent} correos`, detail: `${outreach.blocked} bloqueados por seguridad/presupuesto.`, at: now })
    }
    // Anomaly detection (spec 005 US-04).
    if (outreach.attempted > 0 && outreach.sent === 0) {
      episodes.push({ id: 'ep_anomaly_zero_sent', kind: 'anomaly', headline: '0 correos enviados', detail: 'Todo el outreach fue bloqueado — revisar guardrails/presupuesto.', at: now })
    }
    return episodes
  }

  async sendDailyReport(state: KronosState): Promise<Episode[]> {
    const spend = getDailySpend()
    const target = 4000
    const pct = ((state.totalRevenue / target) * 100).toFixed(1)
    const briefing = [
      `📊 *KRONOS — briefing diario*`,
      ``,
      `Fase: ${state.phase} · Día: ${state.daysRunning}`,
      `Revenue hoy: $${state.weeklyRevenue} · Total: $${state.totalRevenue} (${pct}% de $${target})`,
      `Clientes activos: ${state.currentClients}`,
      `Gasto del día: $${spend.toFixed(2)}`,
    ].join('\n')

    await notify(briefing)
    const episodes = await this.buildEpisodes(state)
    await remember('today_episodes', episodes, 'system')
    console.log(`  PIP → briefing sent, ${episodes.length} episodes for the stream`)
    return episodes
  }

  async execute(_task: Task, state: KronosState): Promise<Episode[]> {
    return this.sendDailyReport(state)
  }
}
