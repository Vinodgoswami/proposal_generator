import type { SavedProposal, ProposalData, ProjectInfo, TeamRates } from '@/types/proposal'
import type { EstimateData } from '@/types/estimate'
import type { ConceptData } from '@/types/concept'

export async function hashRequirements(requirements: string, projectName: string, scope = ''): Promise<string> {
  const text = `${requirements.trim().toLowerCase()}::${projectName.trim().toLowerCase()}::${scope.trim().toLowerCase()}`
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

// ── Proposal ──────────────────────────────────────────────────────────────────

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
        documentType: 'proposal',
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

// ── Estimate ──────────────────────────────────────────────────────────────────

export async function saveEstimateToDb(params: {
  estimateData: EstimateData
  projectInfo: ProjectInfo
  companyId: string
  teamRates: TeamRates
  requirementsHash: string
}): Promise<SavedProposal | null> {
  const { estimateData, projectInfo, companyId, teamRates, requirementsHash } = params
  const description = `Split estimate across ${estimateData.platforms.join(', ')} — ${estimateData.costingSummary.grandTotalHours}h total`
  try {
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentType: 'estimate',
        title: estimateData.projectName,
        description,
        requirementsHash,
        estimateData,
        projectInfo,
        companyId,
        teamRates,
        totalCost: estimateData.costingSummary.grandTotalCost,
        timeline: estimateData.costingSummary.timeline,
      }),
    })
    if (!res.ok) return null
    return res.json() as Promise<SavedProposal>
  } catch {
    return null
  }
}

export async function updateEstimateInDb(
  id: string,
  estimateData: EstimateData,
): Promise<SavedProposal | null> {
  try {
    const res = await fetch(`/api/proposals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estimateData,
        totalCost: estimateData.costingSummary.grandTotalCost,
        timeline: estimateData.costingSummary.timeline,
      }),
    })
    if (!res.ok) return null
    return res.json() as Promise<SavedProposal>
  } catch {
    return null
  }
}

// ── Concept ───────────────────────────────────────────────────────────────────

export async function saveConceptToDb(params: {
  conceptData: ConceptData
  projectInfo: ProjectInfo
  companyId: string
  requirementsHash: string
}): Promise<SavedProposal | null> {
  const { conceptData, projectInfo, companyId, requirementsHash } = params
  const rawDesc = conceptData.overview
  const description = rawDesc.length > 220 ? rawDesc.slice(0, 217) + '…' : rawDesc
  const costStr = `$${conceptData.ballparkEstimate.minCost.toLocaleString()}–$${conceptData.ballparkEstimate.maxCost.toLocaleString()}`
  try {
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentType: 'concept',
        title: conceptData.projectName,
        description,
        requirementsHash,
        conceptData,
        projectInfo,
        companyId,
        totalCost: conceptData.ballparkEstimate.maxCost,
        timeline: `${conceptData.ballparkEstimate.timeline.min}–${conceptData.ballparkEstimate.timeline.max} · ${costStr}`,
      }),
    })
    if (!res.ok) return null
    return res.json() as Promise<SavedProposal>
  } catch {
    return null
  }
}

export async function updateConceptInDb(
  id: string,
  conceptData: ConceptData,
): Promise<SavedProposal | null> {
  try {
    const res = await fetch(`/api/proposals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conceptData,
        totalCost: conceptData.ballparkEstimate.maxCost,
        timeline: `${conceptData.ballparkEstimate.timeline.min}–${conceptData.ballparkEstimate.timeline.max}`,
      }),
    })
    if (!res.ok) return null
    return res.json() as Promise<SavedProposal>
  } catch {
    return null
  }
}

// ── Shared ────────────────────────────────────────────────────────────────────

export async function deleteProposalFromDb(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/proposals/${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}
