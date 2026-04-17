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

export const googleAuthStore: GoogleAuthStore = {
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

export function createSessionId(): string {
  return randomUUID()
}
