/**
 * KRONOS — runtime configuration.
 *
 * All config comes from environment variables with safe defaults. The single
 * most important default is `dryRun: true` — KRONOS never touches the real world
 * unless an operator explicitly sets KRONOS_DRY_RUN=false.
 */

export interface KronosConfig {
  // Models
  anthropicApiKey: string
  modelSmart: string
  modelFast: string
  modelLocal?: string

  // Safety
  dryRun: boolean
  requireApproval: boolean
  dailyBudgetUsd: number
  maxSingleTxUsd: number

  // Ops
  timezone: string
  dailyReportHour: number
  telegramBotToken?: string
  telegramChatId?: string
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]
  if (raw === undefined) return fallback
  return raw !== 'false' && raw !== '0'
}

function envNum(name: string, fallback: number): number {
  const raw = process.env[name]
  const n = raw === undefined ? NaN : Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export function getConfig(): KronosConfig {
  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    modelSmart: process.env.KRONOS_MODEL_SMART ?? 'claude-sonnet-4-6',
    modelFast: process.env.KRONOS_MODEL_FAST ?? 'claude-haiku-4-5',
    ...(process.env.KRONOS_MODEL_LOCAL ? { modelLocal: process.env.KRONOS_MODEL_LOCAL } : {}),

    // Default to dry-run: explicit opt-out required to act for real.
    dryRun: envBool('KRONOS_DRY_RUN', true),
    requireApproval: envBool('KRONOS_REQUIRE_APPROVAL', true),
    dailyBudgetUsd: envNum('KRONOS_DAILY_BUDGET_USD', 8),
    maxSingleTxUsd: envNum('KRONOS_MAX_SINGLE_TX_USD', 50),

    timezone: process.env.KRONOS_TIMEZONE ?? 'America/Santiago',
    dailyReportHour: envNum('KRONOS_DAILY_REPORT_HOUR', 9),
    ...(process.env.TELEGRAM_BOT_TOKEN ? { telegramBotToken: process.env.TELEGRAM_BOT_TOKEN } : {}),
    ...(process.env.TELEGRAM_CHAT_ID ? { telegramChatId: process.env.TELEGRAM_CHAT_ID } : {}),
  }
}
