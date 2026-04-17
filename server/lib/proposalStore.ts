import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

export interface StoredProposal {
  id: string
  title: string
  description: string
  requirementsHash: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proposalData: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projectInfo: any
  companyId: string
  totalCost: number
  timeline: string
  createdAt: string
  updatedAt: string
}

interface Store {
  proposals: StoredProposal[]
}

interface ListResult {
  proposals: StoredProposal[]
  total: number
  page: number
  totalPages: number
}

interface ProposalStore {
  list(page: number, limit?: number): Promise<ListResult>
  getById(id: string): Promise<StoredProposal | null>
  getByHash(hash: string): Promise<StoredProposal | null>
  create(data: Omit<StoredProposal, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredProposal>
  update(id: string, data: Partial<Omit<StoredProposal, 'id' | 'createdAt'>>): Promise<StoredProposal | null>
  delete(id: string): Promise<boolean>
}

function resolveDbPath(): string {
  const explicitPath = process.env.PROPOSALS_FILE_PATH?.trim()
  if (explicitPath) return explicitPath

  const candidates = [
    process.cwd ? join(process.cwd(), 'proposals.json') : null,
    typeof import.meta !== 'undefined' && import.meta.url
      ? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'proposals.json')
      : null,
    '/tmp/proposals.json',
  ].filter((candidate): candidate is string => !!candidate)

  const existingCandidate = candidates.find(candidate => existsSync(candidate))
  return existingCandidate ?? candidates[0]
}

const DB_PATH = resolveDbPath()

function read(): Store {
  if (!existsSync(DB_PATH)) return { proposals: [] }
  try {
    return JSON.parse(readFileSync(DB_PATH, 'utf-8')) as Store
  } catch {
    return { proposals: [] }
  }
}

function write(store: Store): void {
  writeFileSync(DB_PATH, JSON.stringify(store, null, 2))
}

const fileStore: ProposalStore = {
  async list(page: number, limit = 20): Promise<ListResult> {
    const store = read()
    const sorted = [...store.proposals].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const total = sorted.length
    const start = (page - 1) * limit
    return {
      proposals: sorted.slice(start, start + limit),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    }
  },

  async getById(id: string): Promise<StoredProposal | null> {
    const store = read()
    return store.proposals.find(proposal => proposal.id === id) ?? null
  },

  async getByHash(hash: string): Promise<StoredProposal | null> {
    const store = read()
    const sorted = [...store.proposals].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return sorted.find(proposal => proposal.requirementsHash === hash) ?? null
  },

  async create(data: Omit<StoredProposal, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredProposal> {
    const existing = await fileStore.getByHash(data.requirementsHash)
    if (existing) return existing

    const store = read()
    const now = new Date().toISOString()
    const proposal: StoredProposal = { id: randomUUID(), ...data, createdAt: now, updatedAt: now }
    store.proposals.push(proposal)
    write(store)
    return proposal
  },

  async update(id: string, data: Partial<Omit<StoredProposal, 'id' | 'createdAt'>>): Promise<StoredProposal | null> {
    const store = read()
    const index = store.proposals.findIndex(proposal => proposal.id === id)
    if (index === -1) return null
    store.proposals[index] = { ...store.proposals[index], ...data, updatedAt: new Date().toISOString() }
    write(store)
    return store.proposals[index]
  },

  async delete(id: string): Promise<boolean> {
    const store = read()
    const index = store.proposals.findIndex(proposal => proposal.id === id)
    if (index === -1) return false
    store.proposals.splice(index, 1)
    write(store)
    return true
  },
}

type SupabaseProposalRow = {
  id: string
  title: string
  description: string
  requirements_hash: string
  proposal_data: unknown
  project_info: unknown
  company_id: string
  total_cost: number
  timeline: string
  created_at: string
  updated_at: string
}

function getSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)?.trim()
  if (!url || !key) return null
  return { url, key }
}

function mapRow(row: SupabaseProposalRow): StoredProposal {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    requirementsHash: row.requirements_hash,
    proposalData: row.proposal_data,
    projectInfo: row.project_info,
    companyId: row.company_id,
    totalCost: row.total_cost,
    timeline: row.timeline,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<{ data: T; count: number | null }> {
  const config = getSupabaseConfig()
  if (!config) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
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

  const range = response.headers.get('content-range')
  const count = range?.includes('/') ? Number(range.split('/')[1]) : null
  const data = (response.status === 204 ? null : await response.json()) as T
  return { data, count: Number.isFinite(count) ? count : null }
}

function buildRestPath(base: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params)
  return `${base}?${search.toString()}`
}

const supabaseStore: ProposalStore = {
  async list(page: number, limit = 20): Promise<ListResult> {
    const from = (page - 1) * limit
    const to = from + limit - 1
    const path = buildRestPath('proposals', {
      select: '*',
      order: 'created_at.desc',
    })

    const { data, count } = await supabaseRequest<SupabaseProposalRow[]>(path, {
      headers: {
        Range: `${from}-${to}`,
        Prefer: 'count=exact',
      },
    })

    const total = count ?? data.length
    return {
      proposals: data.map(mapRow),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    }
  },

  async getById(id: string): Promise<StoredProposal | null> {
    const path = buildRestPath('proposals', {
      select: '*',
      id: `eq.${id}`,
      limit: '1',
    })
    const { data } = await supabaseRequest<SupabaseProposalRow[]>(path)
    return data[0] ? mapRow(data[0]) : null
  },

  async getByHash(hash: string): Promise<StoredProposal | null> {
    const path = buildRestPath('proposals', {
      select: '*',
      requirements_hash: `eq.${hash}`,
      order: 'created_at.desc',
      limit: '1',
    })
    const { data } = await supabaseRequest<SupabaseProposalRow[]>(path)
    return data[0] ? mapRow(data[0]) : null
  },

  async create(data: Omit<StoredProposal, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredProposal> {
    const existing = await supabaseStore.getByHash(data.requirementsHash)
    if (existing) return existing

    const now = new Date().toISOString()
    const payload = {
      title: data.title,
      description: data.description,
      requirements_hash: data.requirementsHash,
      proposal_data: data.proposalData,
      project_info: data.projectInfo,
      company_id: data.companyId,
      total_cost: data.totalCost,
      timeline: data.timeline,
      created_at: now,
      updated_at: now,
    }

    const { data: inserted } = await supabaseRequest<SupabaseProposalRow[]>('proposals', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    })

    return mapRow(inserted[0])
  },

  async update(id: string, data: Partial<Omit<StoredProposal, 'id' | 'createdAt'>>): Promise<StoredProposal | null> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (data.title !== undefined) payload.title = data.title
    if (data.description !== undefined) payload.description = data.description
    if (data.requirementsHash !== undefined) payload.requirements_hash = data.requirementsHash
    if (data.proposalData !== undefined) payload.proposal_data = data.proposalData
    if (data.projectInfo !== undefined) payload.project_info = data.projectInfo
    if (data.companyId !== undefined) payload.company_id = data.companyId
    if (data.totalCost !== undefined) payload.total_cost = data.totalCost
    if (data.timeline !== undefined) payload.timeline = data.timeline

    const path = buildRestPath('proposals', {
      id: `eq.${id}`,
      select: '*',
    })

    const { data: updated } = await supabaseRequest<SupabaseProposalRow[]>(path, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    })

    return updated[0] ? mapRow(updated[0]) : null
  },

  async delete(id: string): Promise<boolean> {
    const path = buildRestPath('proposals', {
      id: `eq.${id}`,
    })

    await supabaseRequest<null>(path, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    })

    return true
  },
}

export const proposalStore: ProposalStore = getSupabaseConfig() ? supabaseStore : fileStore
