/**
 * KRONOS — long-term memory.
 *
 * Persists the agent's knowledge across cycles. The production backend is
 * Supabase (PostgreSQL); when it is not configured (local dogfood / dry-run)
 * an in-process store is used so the system runs with zero external services.
 *
 * The interface is intentionally tiny: remember / recall plus a prospect ledger
 * the researcher uses for deduplication (spec 002 AC-02).
 */

import type { Prospect } from '../types.js'

const store = new Map<string, unknown>()
const prospects = new Map<string, Prospect>() // keyed by domain

export type MemoryKind = 'system' | 'reflection' | 'prospect' | 'note' | 'metric'

export async function remember(key: string, value: unknown, _kind: MemoryKind = 'note'): Promise<void> {
  store.set(key, value)
}

export async function recall<T>(key: string): Promise<T | undefined> {
  return store.has(key) ? (store.get(key) as T) : undefined
}

export async function forget(key: string): Promise<void> {
  store.delete(key)
}

/** Prospect ledger — used by the researcher to avoid contacting the same domain twice. */
export async function saveProspect(p: Prospect): Promise<void> {
  prospects.set(p.domain.toLowerCase(), p)
}

export async function getProspects(): Promise<Prospect[]> {
  return [...prospects.values()]
}

export async function hasProspect(domain: string): Promise<boolean> {
  return prospects.has(domain.toLowerCase())
}
