import { Request, Response } from 'express'
import mammoth from 'mammoth'

export async function parseFile(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { originalname, buffer, mimetype } = req.file
    let text = ''

    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        originalname.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (mimetype === 'text/plain' || originalname.endsWith('.txt')) {
      text = buffer.toString('utf-8')
    } else if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
      // PDF is handled client-side via pdfjs-dist, but fallback here
      text = buffer.toString('utf-8')
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload PDF, DOCX, or TXT.' })
    }

    res.json({ text: text.trim() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse file'
    res.status(500).json({ error: message })
  }
}
