import type { Request, Response } from 'express'
import { generateEstimateFromBody } from '../lib/estimate.js'
import { decryptKeys } from '../lib/keyDecryption.js'

export async function generateEstimate(req: Request, res: Response): Promise<void> {
  try {
    const result = await generateEstimateFromBody(decryptKeys(req.body))
    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed'
    res.status(500).json({ error: message })
  }
}
