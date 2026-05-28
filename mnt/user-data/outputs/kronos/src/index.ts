/**
 * KRONOS — Entry Point
 *
 * Run modes:
 *   npm run dev          → Start the agent (daily cycle + scheduler)
 *   tsx src/index.ts once → Run one cycle immediately
 *   tsx src/index.ts test → Dry run (no side effects)
 */

import { getConfig } from './config/index.js'
import { OrchestratorAgent } from './agents/orchestrator/index.js'

const args = process.argv.slice(2)
const mode = args[0] ?? 'start'

async function main() {
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

  if (mode === 'once') {
    const orchestrator = new OrchestratorAgent()
    await orchestrator.runDailyCycle()
    process.exit(0)
  }

  if (mode === 'start') {
    const orchestrator = new OrchestratorAgent()

    // Run immediately on start
    await orchestrator.runDailyCycle()

    // Then schedule daily at configured hour
    const scheduleNext = () => {
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

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
