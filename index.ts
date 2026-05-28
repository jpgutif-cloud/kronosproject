/**
 * KRONOS Orchestrator
 *
 * The top-level agent that runs the main loop:
 * 1. Reads current goals and context from memory
 * 2. Plans the day's tasks
 * 3. Delegates to specialist agents
 * 4. Reflects and adjusts strategy weekly
 */

import Anthropic from '@anthropic-ai/sdk'
import { getConfig } from '../../config/index.js'
import { remember, recall } from '../../memory/long-term.js'
import { notify } from '../../safety/approvals.js'
import { getDailySpend } from '../../safety/guardrails.js'
import { ResearchAgent } from '../researcher/index.js'
import { AnalystAgent } from '../analyst/index.js'
import { ExecutorAgent } from '../executor/index.js'
import { ReporterAgent } from '../reporter/index.js'

export interface KronosState {
  phase: 'BOOTSTRAP' | 'EARNING' | 'MAC_ACQUIRED' | 'SCALING'
  primaryGoal: string
  weeklyRevenue: number
  totalRevenue: number
  currentClients: number
  daysRunning: number
  lastReflection?: string
}

const SYSTEM_PROMPT = `You are KRONOS, an autonomous business development agent. 

Your mission: Help your operator build sustainable revenue through AI-powered services.

Current phase system:
- BOOTSTRAP: No Mac yet. Focus on fast cash: audits, ghostwriting, voice AI setup. Target $4-7K.
- EARNING: Revenue flowing. Optimize, retain clients, build reputation.
- MAC_ACQUIRED: M5 Max available. Add local model inference. Start evaluating micro-SaaS acquisitions.
- SCALING: Multiple revenue streams. Autonomous operation with weekly human check-ins.

Core principles:
1. Safety first: Never spend beyond daily budget. Never take irreversible actions without approval.
2. Revenue per hour: Every task must move toward revenue. No busy work.
3. Quality obsession: One unhappy client costs 5 potential clients.
4. Document everything: Your memory is your asset.
5. Operator transparency: Daily reports. No surprises.

You operate in ${process.env.KRONOS_TIMEZONE || 'America/Santiago'}, primarily in Spanish.`

export class OrchestratorAgent {
  private client: Anthropic
  private researcher: ResearchAgent
  private analyst: AnalystAgent
  private executor: ExecutorAgent
  private reporter: ReporterAgent

  constructor() {
    const config = getConfig()
    this.client = new Anthropic({ apiKey: config.anthropicApiKey })
    this.researcher = new ResearchAgent()
    this.analyst = new AnalystAgent()
    this.executor = new ExecutorAgent()
    this.reporter = new ReporterAgent()
  }

  /**
   * Run one full planning and execution cycle.
   * Call this once per day via cron.
   */
  async runDailyCycle(): Promise<void> {
    console.log('\n🤖 KRONOS Daily Cycle Starting...\n')

    const state = await this.loadState()
    console.log(`Phase: ${state.phase} | Revenue: $${state.weeklyRevenue}/wk | Day: ${state.daysRunning}`)

    // 1. Plan the day
    const plan = await this.planDay(state)
    await notify(`📋 *KRONOS Daily Plan*\n\n${plan.summary}`)

    // 2. Execute tasks by priority
    for (const task of plan.tasks) {
      try {
        await this.executeTask(task, state)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`Task failed: ${task.title} — ${msg}`)
        await notify(`⚠️ Task failed: *${task.title}*\n${msg}`)
      }
    }

    // 3. Daily report
    await this.reporter.sendDailyReport(state)

    // 4. Weekly reflection (Sundays)
    const isWeekly = new Date().getDay() === 0
    if (isWeekly) await this.weeklyReflection(state)

    // 5. Update state
    state.daysRunning += 1
    await this.saveState(state)

    console.log(`\n✅ Daily cycle complete. Spend today: $${getDailySpend().toFixed(2)}\n`)
  }

  private async planDay(state: KronosState): Promise<{ summary: string; tasks: Task[] }> {
    const config = getConfig()
    const model = config.modelSmart

    const recentContext = await recall<string>('last_weekly_reflection') ?? 'No reflection yet.'
    const pipeline = await recall<string[]>('active_prospects') ?? []

    const prompt = `
Current state: ${JSON.stringify(state, null, 2)}
Active prospects: ${pipeline.length} in pipeline
Last weekly reflection: ${recentContext}

Based on the current phase (${state.phase}) and goals, plan today's 3-5 highest-leverage tasks.
For each task, specify:
- title (short)
- agent: researcher | analyst | executor | reporter
- priority: HIGH | MEDIUM | LOW
- estimated_time_min: number
- expected_outcome: string

Format your response as JSON: { "summary": "...", "tasks": [...] }
`

    const response = await this.client.messages.create({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    try {
      const json = JSON.parse(text.replace(/```json\n?|\n?```/g, ''))
      return json
    } catch {
      return {
        summary: 'Planning failed — running default tasks',
        tasks: [{ title: 'Research new leads', agent: 'researcher', priority: 'HIGH', estimatedTimeMin: 30, expectedOutcome: 'List of 10 qualified prospects' }],
      }
    }
  }

  private async executeTask(task: Task, state: KronosState): Promise<void> {
    console.log(`\n→ Executing: ${task.title} [${task.agent}]`)

    switch (task.agent) {
      case 'researcher':
        await this.researcher.execute(task, state)
        break
      case 'analyst':
        await this.analyst.execute(task, state)
        break
      case 'executor':
        await this.executor.execute(task, state)
        break
      case 'reporter':
        await this.reporter.execute(task, state)
        break
      default:
        console.warn(`Unknown agent: ${task.agent}`)
    }
  }

  private async weeklyReflection(state: KronosState): Promise<void> {
    const config = getConfig()
    const allMemories = await recall<string>('weekly_notes') ?? ''

    const prompt = `
Weekly state: ${JSON.stringify(state, null, 2)}
Notes from the week: ${allMemories}

Provide a frank weekly reflection:
1. What worked? (be specific)
2. What didn't? (root cause)
3. Revenue trend — on track? Why/why not?
4. Strategy adjustments for next week
5. Should phase change? Current: ${state.phase}

Be brutally honest. This drives next week's priorities.`

    const response = await this.client.messages.create({
      model: config.modelSmart,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const reflection = response.content[0].type === 'text' ? response.content[0].text : ''
    await remember('last_weekly_reflection', reflection, 'reflection')
    await notify(`📊 *Weekly Reflection*\n\n${reflection.slice(0, 2000)}`)

    // Auto-advance phase if conditions are met
    await this.checkPhaseTransition(state)
  }

  private async checkPhaseTransition(state: KronosState): Promise<void> {
    if (state.phase === 'BOOTSTRAP' && state.totalRevenue >= 4000) {
      await notify('🎯 *Phase transition ready!* Revenue target for M5 Max reached. Ready to purchase?')
    }
    if (state.phase === 'EARNING' && state.weeklyRevenue >= 1500) {
      state.phase = 'SCALING'
      await remember('kronos_state', state, 'system')
      await notify('🚀 *Phase: SCALING activated!* Weekly revenue consistently above $1,500.')
    }
  }

  private async loadState(): Promise<KronosState> {
    const saved = await recall<KronosState>('kronos_state')
    return saved ?? {
      phase: 'BOOTSTRAP',
      primaryGoal: 'Generate $4,000-7,000 to purchase MacBook Pro M5 Max',
      weeklyRevenue: 0,
      totalRevenue: 0,
      currentClients: 0,
      daysRunning: 0,
    }
  }

  private async saveState(state: KronosState): Promise<void> {
    await remember('kronos_state', state, 'system')
  }
}

// Types used internally
interface Task {
  title: string
  agent: 'researcher' | 'analyst' | 'executor' | 'reporter'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  estimatedTimeMin?: number
  expectedOutcome?: string
  [key: string]: unknown
}
