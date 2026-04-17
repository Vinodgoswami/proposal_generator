import { Request, Response } from 'express'
import { createHash } from 'crypto'
import { proposalStore } from '../lib/proposalStore.js'

export function hashRequirements(requirements: string, projectName: string): string {
  return createHash('sha256')
    .update(`${requirements.trim().toLowerCase()}::${projectName.trim().toLowerCase()}`)
    .digest('hex')
}

export async function listProposals(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1'))
    res.json(await proposalStore.list(page))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}

export async function getProposal(req: Request, res: Response) {
  try {
    const proposal = await proposalStore.getById(req.params.id)
    if (!proposal) return res.status(404).json({ error: 'Not found' })
    res.json(proposal)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}

export async function checkProposal(req: Request, res: Response) {
  try {
    const { hash } = req.query as { hash: string }
    if (!hash) return res.status(400).json({ error: 'hash required' })
    const proposal = await proposalStore.getByHash(hash)
    res.json({ found: !!proposal, proposal: proposal ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}

export async function saveProposal(req: Request, res: Response) {
  try {
    const {
      title, description, requirementsHash,
      proposalData, estimateData, conceptData,
      projectInfo, companyId, teamRates,
      totalCost, timeline,
      documentType = 'proposal',
    } = req.body as {
      title: string; description: string; requirementsHash: string
      proposalData?: unknown; estimateData?: unknown; conceptData?: unknown
      projectInfo: unknown; companyId: string; teamRates?: unknown
      totalCost: number; timeline: string; documentType?: string
    }
    const proposal = await proposalStore.create({
      title, description, requirementsHash,
      proposalData, estimateData, conceptData,
      projectInfo, companyId, teamRates,
      totalCost, timeline,
      documentType: documentType as 'proposal' | 'estimate' | 'concept',
    })
    res.status(201).json(proposal)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}

export async function updateProposal(req: Request, res: Response) {
  try {
    const { proposalData, estimateData, conceptData, projectInfo, totalCost, timeline, description } =
      req.body as {
        proposalData?: unknown; estimateData?: unknown; conceptData?: unknown
        projectInfo?: unknown; totalCost?: number; timeline?: string; description?: string
      }
    const updated = await proposalStore.update(req.params.id, {
      ...(proposalData !== undefined ? { proposalData } : {}),
      ...(estimateData !== undefined ? { estimateData } : {}),
      ...(conceptData !== undefined ? { conceptData } : {}),
      ...(projectInfo !== undefined ? { projectInfo } : {}),
      ...(totalCost !== undefined ? { totalCost } : {}),
      ...(timeline !== undefined ? { timeline } : {}),
      ...(description !== undefined ? { description } : {}),
    })
    if (!updated) return res.status(404).json({ error: 'Not found' })
    res.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}

export async function deleteProposal(req: Request, res: Response) {
  try {
    const ok = await proposalStore.delete(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}
