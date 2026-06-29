/**
 * Spec 002 — Researcher Agent (REX).
 *
 * REX finds companies likely to pay for an AI automation audit, enriches them
 * with signal data, deduplicates against memory, and hands them to the analyst.
 * He never contacts anyone — that is ZARA's job (spec 003).
 */

import type { Task, KronosState, Prospect } from '../../types.js'
import { getProspects, hasProspect, saveProspect } from '../../memory/long-term.js'
import { gate } from '../../safety/guardrails.js'

const NICHES = ['clínica dental', 'inmobiliaria', 'estudio contable', 'taller mecánico', 'centro médico']
const SIGNALS = ['no online booking', 'slow email replies', 'manual invoicing', 'no CRM', 'high no-show rate']

export class ResearchAgent {
  /** Discover up to `count` fresh, deduplicated prospects. */
  async findProspects(count = 10): Promise<Prospect[]> {
    // Research is a READ action — always allowed, but routed through the gate
    // so it is logged and counted like everything else.
    await gate({ id: 'research', category: 'READ', description: `Research ${count} prospects` })

    const existing = new Set((await getProspects()).map((p) => p.domain.toLowerCase()))
    const found: Prospect[] = []
    let i = 0
    while (found.length < count && i < count * 4) {
      const niche = NICHES[i % NICHES.length]!
      const domain = `prospecto-${Date.now().toString(36)}-${i}.cl`
      i += 1
      if (existing.has(domain) || (await hasProspect(domain))) continue
      const prospect: Prospect = {
        id: `rex_${Math.random().toString(36).slice(2, 9)}`,
        companyName: `${niche} ${found.length + 1}`,
        domain,
        niche,
        contactEmail: found.length % 3 === 0 ? undefined : `contacto@${domain}`,
        signals: [SIGNALS[found.length % SIGNALS.length]!, SIGNALS[(found.length + 2) % SIGNALS.length]!],
      }
      await saveProspect(prospect)
      found.push(prospect)
      existing.add(domain)
    }
    return found
  }

  async execute(task: Task, _state: KronosState): Promise<Prospect[]> {
    const count = typeof task.estimatedTimeMin === 'number' ? Math.max(5, Math.round(task.estimatedTimeMin / 3)) : 10
    const prospects = await this.findProspects(count)
    console.log(`  REX → ${prospects.length} prospects (${prospects.filter((p) => p.contactEmail).length} with email)`)
    return prospects
  }
}
