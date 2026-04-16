import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { generateProposal } from './routes/ai.js'
import { parseFile } from './routes/parse.js'
import { getAuthUrl, handleCallback, getAuthStatus, revokeAuth, createGoogleDoc } from './routes/googleDocs.js'
import { listProposals, getProposal, checkProposal, saveProposal, updateProposal, deleteProposal } from './routes/proposals.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '20mb' }))

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

app.post('/api/generate', generateProposal)
app.post('/api/parse', upload.single('file'), parseFile)

// Google Docs routes
app.post('/api/google/auth-url', getAuthUrl)
app.get('/api/google/callback', handleCallback)
app.get('/api/google/status', getAuthStatus)
app.post('/api/google/revoke', revokeAuth)
app.post('/api/google/create-doc', createGoogleDoc)

// Proposal history routes
app.get('/api/proposals', listProposals)
app.get('/api/proposals/check', checkProposal)
app.get('/api/proposals/:id', getProposal)
app.post('/api/proposals', saveProposal)
app.put('/api/proposals/:id', updateProposal)
app.delete('/api/proposals/:id', deleteProposal)

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
