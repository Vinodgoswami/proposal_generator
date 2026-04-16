import { randomUUID } from 'crypto'

export interface GoogleAuthSession {
  sessionId: string
  clientId: string
  clientSecret: string
  tokens: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

interface GoogleAuthStore {
  get(sessionId: string): Promise<GoogleAuthSession | null>
  upsert(session: { sessionId: string; clientId: string; clientSecret: string; tokens: Record<string, unknown> | null }): Promise<GoogleAuthSession>
  clearTokens(sessionId: string): Promise<void>
}

const memoryStore = new Map<string, GoogleAuthSession>()

const fallbackStore: GoogleAuthStore = {
  async get(sessionId: string): Promise<GoogleAuthSession | null> {
    return memoryStore.get(sessionId) ?? null
  },

  async upsert(session): Promise<GoogleAuthSession> {
    const existing = memoryStore.get(session.sessionId)
    const now = new Date().toISOString()
    const next: GoogleAuthSession = {
      sessionId: session.sessionId,
      clientId: session.clientId,
      clientSecret: session.clientSecret,
      tokens: session.tokens,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    memoryStore.set(session.sessionId, next)
    return next
  },

  async clearTokens(sessionId: string): Promise<void> {
    const existing = memoryStore.get(sessionId)
    if (!existing) return
    memoryStore.set(sessionId, { ...existing, tokens: null, updatedAt: new Date().toISOString() })
  },
}

type SupabaseGoogleSessionRow = {
  session_id: string
  client_id: string
  client_secret: string
  tokens: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

function getSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)?.trim()
  if (!url || !key) return null
  return { url, key }
}

function mapRow(row: SupabaseGoogleSessionRow): GoogleAuthSession {
  return {
    sessionId: row.session_id,
    clientId: row.client_id,
    clientSecret: row.client_secret,
    tokens: row.tokens,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getSupabaseConfig()
  if (!config) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.')
  }

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Supabase error ${response.status}: ${message}`)
  }

  return (response.status === 204 ? null : await response.json()) as T
}

function buildRestPath(base: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params)
  return `${base}?${search.toString()}`
}

const supabaseStore: GoogleAuthStore = {
  async get(sessionId: string): Promise<GoogleAuthSession | null> {
    const path = buildRestPath('google_auth_sessions', {
      select: '*',
      session_id: `eq.${sessionId}`,
      limit: '1',
    })
    const rows = await supabaseRequest<SupabaseGoogleSessionRow[]>(path)
    return rows[0] ? mapRow(rows[0]) : null
  },

  async upsert(session): Promise<GoogleAuthSession> {
    const now = new Date().toISOString()
    const rows = await supabaseRequest<SupabaseGoogleSessionRow[]>('google_auth_sessions', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify([{
        session_id: session.sessionId,
        client_id: session.clientId,
        client_secret: session.clientSecret,
        tokens: session.tokens,
        created_at: now,
        updated_at: now,
      }]),
    })
    return mapRow(rows[0])
  },

  async clearTokens(sessionId: string): Promise<void> {
    const path = buildRestPath('google_auth_sessions', {
      session_id: `eq.${sessionId}`,
    })
    await supabaseRequest<null>(path, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        tokens: null,
        updated_at: new Date().toISOString(),
      }),
    })
  },
}

export const googleAuthStore: GoogleAuthStore = getSupabaseConfig() ? supabaseStore : fallbackStore

export function createSessionId(): string {
  return randomUUID()
}
