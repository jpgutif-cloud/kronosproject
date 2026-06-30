import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { type AddressInfo } from 'node:net'
import { createStatusServer } from './server.js'
import type { StatusDTO } from './serialize.js'
import type { KronosState } from '../types.js'

const state: KronosState = {
  phase: 'EARNING',
  primaryGoal: 'Earn $7,000 for the MacBook',
  weeklyRevenue: 300,
  totalRevenue: 3500,
  currentClients: 5,
  daysRunning: 21,
}

let server: ReturnType<typeof createStatusServer>
let baseUrl: string

before(async () => {
  server = createStatusServer({ loadState: async () => state })
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const port = (server.address() as AddressInfo).port
  baseUrl = `http://127.0.0.1:${port}`
})

after(() => { server.close() })

test('AC-03/AC-02: GET /api/status → 200 with the DTO', async () => {
  const res = await fetch(`${baseUrl}/api/status`)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'application/json')
  const dto = (await res.json()) as StatusDTO
  assert.equal(dto.phase, 'EARNING')
  assert.equal(dto.revenue, 3500)
  assert.equal(dto.target, 7000)
  assert.equal(dto.progressPct, 50)
  assert.equal(dto.clients, 5)
  assert.equal(typeof dto.updatedAt, 'string')
})

test('AC-04: CORS header present on GET', async () => {
  const res = await fetch(`${baseUrl}/api/status`)
  assert.equal(res.headers.get('access-control-allow-origin'), '*')
})

test('AC-04: OPTIONS preflight → 204', async () => {
  const res = await fetch(`${baseUrl}/api/status`, { method: 'OPTIONS' })
  assert.equal(res.status, 204)
  assert.equal(res.headers.get('access-control-allow-origin'), '*')
})

test('AC-03: unknown path → 404', async () => {
  const res = await fetch(`${baseUrl}/nope`)
  assert.equal(res.status, 404)
})

test('AC-03: non-GET method → 405', async () => {
  const res = await fetch(`${baseUrl}/api/status`, { method: 'POST' })
  assert.equal(res.status, 405)
})

test('returns 503 when no state is available', async () => {
  const empty = createStatusServer({ loadState: async () => undefined })
  await new Promise<void>((resolve) => empty.listen(0, resolve))
  const port = (empty.address() as AddressInfo).port
  const res = await fetch(`http://127.0.0.1:${port}/api/status`)
  assert.equal(res.status, 503)
  empty.close()
})
