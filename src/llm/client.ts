/**
 * KRONOS — LLM client.
 *
 * A thin abstraction over the reasoning model that keeps the agents decoupled
 * from any specific SDK. It mirrors the small slice of the Anthropic Messages
 * API the orchestrator uses, so call sites stay unchanged.
 *
 * In dry-run (or when no API key is configured) it never makes a network call:
 * it returns deterministic, well-formed responses so the full cycle can be
 * exercised locally with zero cost and zero external dependencies. When a real
 * key is present and dry-run is off, a live provider can be wired in here.
 */

import type { KronosConfig } from '../config/index.js'

export interface LLMMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface LLMCreateParams {
  model: string
  max_tokens: number
  system?: string
  messages: LLMMessage[]
}

export interface LLMResponse {
  content: Array<{ type: 'text'; text: string }>
}

export interface LLM {
  messages: { create(params: LLMCreateParams): Promise<LLMResponse> }
}

function text(t: string): LLMResponse {
  return { content: [{ type: 'text', text: t }] }
}

/** Deterministic stand-in used in dry-run / keyless mode. */
function offlineComplete(params: LLMCreateParams): LLMResponse {
  const prompt = params.messages.map((m) => m.content).join('\n')

  // Planning prompts ask for JSON with a `tasks` array.
  if (/plan today'?s|"tasks"|JSON:/i.test(prompt)) {
    return text(
      JSON.stringify({
        summary:
          'Dry-run plan: keep the pipeline full and move toward first revenue. ' +
          'Research fresh prospects, score them, send measured outreach, report.',
        tasks: [
          { title: 'Research 10 qualified prospects', agent: 'researcher', priority: 'HIGH', estimatedTimeMin: 30, expectedOutcome: '10 deduped prospects with signals' },
          { title: 'Score and rank prospects', agent: 'analyst', priority: 'HIGH', estimatedTimeMin: 20, expectedOutcome: 'Ranked list with pitch angles' },
          { title: 'Send 5 personalized outreach emails', agent: 'executor', priority: 'MEDIUM', estimatedTimeMin: 40, expectedOutcome: '5 emails queued (dry-run)' },
        ],
      })
    )
  }

  // Reflection prompts.
  if (/reflection|brutally honest|what worked/i.test(prompt)) {
    return text(
      'Weekly reflection (dry-run): pipeline is forming; no revenue yet, which is ' +
      'expected this early. Focus next week on outreach volume and response quality. ' +
      'Hold phase at BOOTSTRAP until the first paid audit lands.'
    )
  }

  return text('Dry-run response: no live model called.')
}

export function createLLM(config: KronosConfig): LLM {
  const offline = config.dryRun || !config.anthropicApiKey
  return {
    messages: {
      async create(params: LLMCreateParams): Promise<LLMResponse> {
        if (offline) return offlineComplete(params)
        // Live path: a real provider (Anthropic SDK / OpenAI-compatible local
        // endpoint per ROADMAP Phase 3) is wired here once dependencies are
        // installed and a key is configured. Until then we stay deterministic.
        return offlineComplete(params)
      },
    },
  }
}
