/**
 * KRONOS — entry point.
 *
 * Run modes:
 *   node src/index.ts once  → run one daily cycle immediately, then exit
 *   node src/index.ts start → run a cycle now, then schedule daily
 *   node src/index.ts test  → single dry-run cycle (no side effects)
 *
 * Defaults are safe: KRONOS_DRY_RUN=true unless explicitly disabled.
 */

import { getConfig } from './config/index.js'
import { OrchestratorAgent } from './agents/orchestrator/index.js'

const args = process.argv.slice(2)
const mode = args[0] ?? 'start'

async function main(): Promise<void> {
  const config = getConfig()

  console.log(`
╔═══════════════════════════════════════╗
║          K R O N O S  v0.1            ║
║   Autonomous Business Agent           ║
╚═══════════════════════════════════════╝

Mode: ${mode}
Dry run: ${config.dryRun}
Daily budget: $${config.dailyBudgetUsd} USD
`)

  if (mode === 'test' || mode === 'once') {
    const orchestrator = new OrchestratorAgent()
    await orchestrator.runDailyCycle()
    process.exit(0)
  }

  if (mode === 'start') {
    const orchestrator = new OrchestratorAgent()
    await orchestrator.runDailyCycle()

    const scheduleNext = (): void => {
      const now = new Date()
      const next = new Date()
      next.setHours(config.dailyReportHour, 0, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      const msUntilNext = next.getTime() - now.getTime()
      const hours = Math.floor(msUntilNext / 3600000)
      const mins = Math.floor((msUntilNext % 3600000) / 60000)
      console.log(`⏰ Next cycle in ${hours}h ${mins}m (at ${next.toLocaleTimeString()})`)
      setTimeout(async () => {
        await orchestrator.runDailyCycle()
        scheduleNext()
      }, msUntilNext)
    }

    scheduleNext()
    console.log('KRONOS is running. Press Ctrl+C to stop.')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
