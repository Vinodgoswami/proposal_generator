import type { SavedProposal, ProposalData, ProjectInfo } from '@/types/proposal'

export async function hashRequirements(requirements: string, projectName: string): Promise<string> {
  const text = `${requirements.trim().toLowerCase()}::${projectName.trim().toLowerCase()}`
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface ProposalListResult {
  proposals: SavedProposal[]
  total: number
  page: number
  totalPages: number
}

export async function listProposals(page = 1): Promise<ProposalListResult> {
  const res = await fetch(`/api/proposals?page=${page}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to load history' })) as { error?: string }
    throw new Error(err.error || 'Failed to load history')
  }
  return res.json() as Promise<ProposalListResult>
}

export async function checkProposalByHash(hash: string): Promise<{ found: boolean; proposal: SavedProposal | null }> {
  const res = await fetch(`/api/proposals/check?hash=${encodeURIComponent(hash)}`)
  if (!res.ok) return { found: false, proposal: null }
  return res.json() as Promise<{ found: boolean; proposal: SavedProposal | null }>
}

export async function getProposalById(id: string): Promise<SavedProposal | null> {
  const res = await fetch(`/api/proposals/${id}`)
  if (!res.ok) return null
  return res.json() as Promise<SavedProposal>
}

export async function saveProposalToDb(params: {
  proposalData: ProposalData
  projectInfo: ProjectInfo
  companyId: string
  requirementsHash: string
}): Promise<SavedProposal | null> {
  const { proposalData, projectInfo, companyId, requirementsHash } = params
  const rawDesc = proposalData.executiveSummary.text
  const description = rawDesc.length > 220 ? rawDesc.slice(0, 217) + '…' : rawDesc

  try {
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: proposalData.project.name,
        description,
        requirementsHash,
        proposalData,
        projectInfo,
        companyId,
        totalCost: proposalData.costEstimation.summary.totalCost,
        timeline: proposalData.executiveSummary.totalTimeline,
      }),
    })
    if (!res.ok) return null
    return res.json() as Promise<SavedProposal>
  } catch {
    return null
  }
}

export async function updateProposalInDb(
  id: string,
  proposalData: ProposalData,
  projectInfo: ProjectInfo,
): Promise<SavedProposal | null> {
  const rawDesc = proposalData.executiveSummary.text
  const description = rawDesc.length > 220 ? rawDesc.slice(0, 217) + '…' : rawDesc
  try {
    const res = await fetch(`/api/proposals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposalData,
        projectInfo,
        description,
        totalCost: proposalData.costEstimation.summary.totalCost,
        timeline: proposalData.executiveSummary.totalTimeline,
      }),
    })
    if (!res.ok) return null
    return res.json() as Promise<SavedProposal>
  } catch {
    return null
  }
}

export async function deleteProposalFromDb(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/proposals/${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}
