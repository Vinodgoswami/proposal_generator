import { proposalStore } from '../../server/lib/proposalStore.js'

interface NetlifyEvent {
  httpMethod: string
  path: string
  rawUrl?: string
  queryStringParameters?: Record<string, string | undefined> | null
}

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

export async function handler(event: NetlifyEvent) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: jsonHeaders,
      body: '',
    }
  }

  try {
    const url = new URL(event.rawUrl ?? `https://placeholder.local${event.path}`)
    const pathname = url.pathname.replace(/\/+$/, '')

    if (pathname.endsWith('/check')) {
      const hash = url.searchParams.get('hash')
      if (!hash) {
        return {
          statusCode: 400,
          headers: jsonHeaders,
          body: JSON.stringify({ error: 'hash required' }),
        }
      }

      const proposal = await proposalStore.getByHash(hash)
      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ found: !!proposal, proposal }),
      }
    }

    const proposalIdMatch = pathname.match(/\/([^/]+)$/)

    if (event.httpMethod === 'GET') {
      if (proposalIdMatch && proposalIdMatch[1] !== 'proposals') {
        const proposal = await proposalStore.getById(proposalIdMatch[1])
        return proposal
          ? {
              statusCode: 200,
              headers: jsonHeaders,
              body: JSON.stringify(proposal),
            }
          : {
              statusCode: 404,
              headers: jsonHeaders,
              body: JSON.stringify({ error: 'Not found' }),
            }
      }

      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify(await proposalStore.list(page)),
      }
    }

    if (event.httpMethod === 'POST' && pathname.endsWith('/proposals')) {
      const body = JSON.parse((event as NetlifyEvent & { body?: string | null }).body || '{}') as {
        title: string
        description: string
        requirementsHash: string
        proposalData: unknown
        projectInfo: unknown
        companyId: string
        totalCost: number
        timeline: string
      }

      const proposal = await proposalStore.create(body)
      return {
        statusCode: 201,
        headers: jsonHeaders,
        body: JSON.stringify(proposal),
      }
    }

    if (event.httpMethod === 'PUT' && proposalIdMatch) {
      const body = JSON.parse((event as NetlifyEvent & { body?: string | null }).body || '{}') as {
        proposalData: unknown
        projectInfo: unknown
        totalCost: number
        timeline: string
        description?: string
      }

      const proposal = await proposalStore.update(proposalIdMatch[1], body)
      return proposal
        ? {
            statusCode: 200,
            headers: jsonHeaders,
            body: JSON.stringify(proposal),
          }
        : {
            statusCode: 404,
            headers: jsonHeaders,
            body: JSON.stringify({ error: 'Not found' }),
          }
    }

    if (event.httpMethod === 'DELETE' && proposalIdMatch) {
      const ok = await proposalStore.delete(proposalIdMatch[1])
      return ok
        ? {
            statusCode: 200,
            headers: jsonHeaders,
            body: JSON.stringify({ ok: true }),
          }
        : {
            statusCode: 404,
            headers: jsonHeaders,
            body: JSON.stringify({ error: 'Not found' }),
          }
    }

    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: message }),
    }
  }
}
