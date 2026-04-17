import type { ProjectInfo, ProposalData, SavedProposal } from '@/types/proposal'

const STORAGE_KEY = 'proposal-maker.saved-proposals'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readAll(): SavedProposal[] {
  if (!canUseStorage()) return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedProposal[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(proposals: SavedProposal[]): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals))
}

export function listLocalProposals(page = 1, limit = 20): {
  proposals: SavedProposal[]
  total: number
  page: number
  totalPages: number
} {
  const sorted = [...readAll()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const total = sorted.length
  const start = (page - 1) * limit

  return {
    proposals: sorted.slice(start, start + limit),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  }
}

export function getLocalProposalById(id: string): SavedProposal | null {
  return readAll().find(proposal => proposal.id === id) ?? null
}

export function getLocalProposalByHash(hash: string): SavedProposal | null {
  return [...readAll()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .find(proposal => proposal.requirementsHash === hash) ?? null
}

export function saveLocalProposal(params: {
  proposalData: ProposalData
  projectInfo: ProjectInfo
  companyId: string
  requirementsHash: string
}): SavedProposal {
  const all = readAll()
  const rawDesc = params.proposalData.executiveSummary.text
  const description = rawDesc.length > 220 ? `${rawDesc.slice(0, 217)}…` : rawDesc
  const now = new Date().toISOString()

  const saved: SavedProposal = {
    id: crypto.randomUUID(),
    documentType: 'proposal',
    title: params.proposalData.project.name,
    description,
    requirementsHash: params.requirementsHash,
    proposalData: params.proposalData,
    projectInfo: params.projectInfo,
    companyId: params.companyId,
    totalCost: params.proposalData.costEstimation.summary.totalCost,
    timeline: params.proposalData.executiveSummary.totalTimeline,
    createdAt: now,
    updatedAt: now,
  }

  all.push(saved)
  writeAll(all)
  return saved
}

export function updateLocalProposal(
  id: string,
  proposalData: ProposalData,
  projectInfo: ProjectInfo,
): SavedProposal | null {
  const all = readAll()
  const index = all.findIndex(proposal => proposal.id === id)
  if (index === -1) return null

  const rawDesc = proposalData.executiveSummary.text
  const description = rawDesc.length > 220 ? `${rawDesc.slice(0, 217)}…` : rawDesc

  all[index] = {
    ...all[index],
    proposalData,
    projectInfo,
    description,
    totalCost: proposalData.costEstimation.summary.totalCost,
    timeline: proposalData.executiveSummary.totalTimeline,
    updatedAt: new Date().toISOString(),
  }

  writeAll(all)
  return all[index]
}

export function deleteLocalProposal(id: string): boolean {
  const all = readAll()
  const filtered = all.filter(proposal => proposal.id !== id)
  if (filtered.length === all.length) return false
  writeAll(filtered)
  return true
}
