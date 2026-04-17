import type { Request, Response } from 'express'
import { generateConceptFromBody } from '../lib/concept.js'
import { decryptKeys } from '../lib/keyDecryption.js'

export async function generateConcept(req: Request, res: Response): Promise<void> {
  try {
    const result = await generateConceptFromBody(decryptKeys(req.body))
    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed'
    res.status(500).json({ error: message })
  }
}
