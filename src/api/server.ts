/**
 * Spec 008 — API bridge HTTP server.
 *
 * A READ-ONLY status endpoint the stream frontend polls. Uses node:http only
 * (no new deps, AC-05). It never writes business state, never calls gate(), and
 * never moves money — it is a pure observation layer (constitution P3 / P5).
 *
 * The state loader is injected (AC-06) so this is testable without the global
 * memory store and without a running agent cycle. In production, pass a loader
 * backed by long-term memory / Supabase.
 */

import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http'
import type { KronosState } from '../types.js'
import { serializeStatus, type SerializeOptions } from './serialize.js'

export interface StatusServerOptions {
  /** Returns the current state, or undefined if none is persisted yet. */
  loadState: () => Promise<KronosState | undefined>
  /** Fallback state used when loadState resolves undefined (e.g. fresh boot). */
  defaultState?: KronosState
  /** Serialization options (target, clock). */
  serialize?: SerializeOptions
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS })
  res.end(payload)
}

/**
 * Build the request handler. Exposed for unit tests that drive it directly.
 * The handler is async but never awaits a side effect other than loadState.
 */
export function createStatusHandler(opts: StatusServerOptions) {
  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = (req.url ?? '').split('?')[0]
    const method = (req.method ?? 'GET').toUpperCase()

    if (url !== '/api/status') {
      sendJson(res, 404, { error: 'not found' })
      return
    }

    if (method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS)
      res.end()
      return
    }

    if (method !== 'GET') {
      sendJson(res, 405, { error: 'method not allowed' })
      return
    }

    const state = (await opts.loadState()) ?? opts.defaultState
    if (!state) {
      sendJson(res, 503, { error: 'state not initialized' })
      return
    }

    sendJson(res, 200, serializeStatus(state, opts.serialize))
  }
}

/** Create (but do not start) the status server. */
export function createStatusServer(opts: StatusServerOptions): Server {
  const handle = createStatusHandler(opts)
  return createServer((req, res) => {
    void handle(req, res).catch(() => {
      if (!res.headersSent) sendJson(res, 500, { error: 'internal error' })
    })
  })
}

/** Create and start the status server on `port`. */
export function startStatusServer(opts: StatusServerOptions, port = 8787): Server {
  const server = createStatusServer(opts)
  server.listen(port)
  return server
}
