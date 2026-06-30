import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serializeStatus, DEFAULT_TARGET_USD } from './serialize.js'
import type { KronosState } from '../types.js'

const base: KronosState = {
  phase: 'BOOTSTRAP',
  primaryGoal: 'Earn $7,000 for the MacBook',
  weeklyRevenue: 120,
  totalRevenue: 1750,
  currentClients: 3,
  daysRunning: 9,
}

const NOW = new Date('2026-06-30T12:00:00.000Z')

test('AC-02: maps every field', () => {
  const dto = serializeStatus(base, { now: NOW })
  assert.equal(dto.phase, 'BOOTSTRAP')
  assert.equal(dto.revenue, 1750)
  assert.equal(dto.weeklyRevenue, 120)
  assert.equal(dto.target, DEFAULT_TARGET_USD)
  assert.equal(dto.clients, 3)
  assert.equal(dto.daysRunning, 9)
  assert.equal(dto.primaryGoal, 'Earn $7,000 for the MacBook')
  assert.equal(dto.updatedAt, '2026-06-30T12:00:00.000Z')
})

test('AC-02: progressPct = round(revenue/target*100)', () => {
  // 1750 / 7000 = 25%
  assert.equal(serializeStatus(base, { now: NOW }).progressPct, 25)
})

test('AC-02: progressPct clamped to [0,100]', () => {
  const over = serializeStatus({ ...base, totalRevenue: 999999 }, { now: NOW })
  assert.equal(over.progressPct, 100)
  const under = serializeStatus({ ...base, totalRevenue: -500 }, { now: NOW })
  assert.equal(under.progressPct, 0)
})

test('AC-02: lastReflection is null when absent, string when present', () => {
  assert.equal(serializeStatus(base, { now: NOW }).lastReflection, null)
  const withRef = serializeStatus({ ...base, lastReflection: 'week 1 notes' }, { now: NOW })
  assert.equal(withRef.lastReflection, 'week 1 notes')
})

test('AC-02: custom target overrides default', () => {
  const dto = serializeStatus(base, { now: NOW, target: 3500 })
  assert.equal(dto.target, 3500)
  assert.equal(dto.progressPct, 50) // 1750/3500
})

test('does not mutate the input state', () => {
  const snapshot = JSON.stringify(base)
  serializeStatus(base, { now: NOW })
  assert.equal(JSON.stringify(base), snapshot)
})
