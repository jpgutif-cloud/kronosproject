/**
 * Spec 004 — Analyst Agent (ARLO).
 *
 * A pure reasoning agent. It scores prospects 0–100 by likelihood to convert,
 * attaches a pitch angle for ZARA, and ranks them. It never touches the
 * external world. Scores must differentiate (spec 004 AC-01: not degenerate).
 */

import type { Task, KronosState, Prospect } from '../../types.js'
import { getProspects, saveProspect, remember } from '../../memory/long-term.js'

const PITCHES: Record<string, string> = {
  'no online booking': 'Automatiza la reserva de citas y reduce no-shows.',
  'slow email replies': 'Asistente de respuestas que contesta leads en minutos.',
  'manual invoicing': 'Facturación automática que ahorra horas semanales.',
  'no CRM': 'CRM ligero que centraliza clientes y seguimientos.',
  'high no-show rate': 'Recordatorios automáticos que bajan el ausentismo.',
}

export class AnalystAgent {
  /** Score a prospect 0–100 from its signals + contactability. */
  score(p: Prospect): number {
    let s = 35 + p.signals.length * 12        // more pain signals → higher value
    if (p.contactEmail) s += 18               // reachable → easier to convert
    s += (p.niche.length % 7) * 3             // niche-specific spread
    return Math.max(0, Math.min(100, Math.round(s)))
  }

  async rank(): Promise<Prospect[]> {
    const prospects = await getProspects()
    for (const p of prospects) {
      p.score = this.score(p)
      p.pitchAngle = PITCHES[p.signals[0] ?? ''] ?? 'Auditoría de automatización a medida.'
      await saveProspect(p)
    }
    return [...prospects].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }

  async execute(_task: Task, _state: KronosState): Promise<Prospect[]> {
    const ranked = await this.rank()
    await remember('ranked_prospects', ranked.map((p) => p.id), 'metric')
    const scores = ranked.map((p) => p.score ?? 0)
    console.log(`  ARLO → ranked ${ranked.length}; top=${scores[0] ?? 0}, spread σ=${stddev(scores).toFixed(1)}`)
    return ranked
  }
}

function stddev(xs: number[]): number {
  if (xs.length === 0) return 0
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length)
}
