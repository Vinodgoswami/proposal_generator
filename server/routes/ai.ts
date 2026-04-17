import { Request, Response } from 'express'
import { generateProposalFromBody, type GenerateProposalBody } from '../lib/ai.js'
import { decryptKeys } from '../lib/keyDecryption.js'

export async function generateProposal(req: Request, res: Response) {
  try {
    const { proposal, provider } = await generateProposalFromBody(decryptKeys(req.body) as GenerateProposalBody)
    res.json({ proposal, provider })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Generate error:', message)
    res.status(500).json({ error: message })
  }
}
