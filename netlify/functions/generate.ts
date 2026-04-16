import { generateProposalFromBody, type GenerateProposalBody } from '../../server/lib/ai.js'

interface NetlifyEvent {
  httpMethod: string
  body: string | null
}

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export async function handler(event: NetlifyEvent) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: jsonHeaders,
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const body = JSON.parse(event.body || '{}') as GenerateProposalBody
    const result = await generateProposalFromBody(body)

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify(result),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Generate error:', message)

    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: message }),
    }
  }
}
