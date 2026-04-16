import {
  createGoogleAuthUrl,
  createGoogleDocument,
  getGoogleAuthStatus,
  handleGoogleCallback,
  revokeGoogleAuth,
} from '../../server/lib/googleDocs.js'

interface NetlifyEvent {
  httpMethod: string
  path: string
  rawUrl?: string
  headers?: Record<string, string | undefined>
  body?: string | null
  queryStringParameters?: Record<string, string | undefined> | null
}

function getBaseUrl(event: NetlifyEvent): string {
  const proto = event.headers?.['x-forwarded-proto'] || 'https'
  const host = event.headers?.host || new URL(event.rawUrl || 'https://placeholder.local').host
  return `${proto}://${host}`
}

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export async function handler(event: NetlifyEvent) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: jsonHeaders, body: '' }
  }

  const pathname = new URL(event.rawUrl ?? `https://placeholder.local${event.path}`).pathname.replace(/\/+$/, '')
  const context = {
    baseUrl: getBaseUrl(event),
    cookieHeader: event.headers?.cookie,
    secureCookies: getBaseUrl(event).startsWith('https://'),
  }

  try {
    if (event.httpMethod === 'POST' && pathname.endsWith('/auth-url')) {
      const result = await createGoogleAuthUrl(JSON.parse(event.body || '{}') as { clientId?: string; clientSecret?: string }, context)
      return {
        statusCode: result.statusCode,
        headers: { ...jsonHeaders, ...(result.setCookie ? { 'Set-Cookie': result.setCookie } : {}) },
        body: JSON.stringify(result.body),
      }
    }

    if (event.httpMethod === 'GET' && pathname.endsWith('/callback')) {
      const url = new URL(event.rawUrl ?? `https://placeholder.local${event.path}`)
      const result = await handleGoogleCallback({
        code: url.searchParams.get('code') || undefined,
        state: url.searchParams.get('state') || undefined,
      }, context)
      return {
        statusCode: result.statusCode,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...(result.setCookie ? { 'Set-Cookie': result.setCookie } : {}),
        },
        body: result.html,
      }
    }

    if (event.httpMethod === 'GET' && pathname.endsWith('/status')) {
      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify(await getGoogleAuthStatus(context)),
      }
    }

    if (event.httpMethod === 'POST' && pathname.endsWith('/revoke')) {
      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify(await revokeGoogleAuth(context)),
      }
    }

    if (event.httpMethod === 'POST' && pathname.endsWith('/create-doc')) {
      const result = await createGoogleDocument(JSON.parse(event.body || '{}') as { html?: string; title?: string }, context)
      return {
        statusCode: result.statusCode,
        headers: jsonHeaders,
        body: JSON.stringify(result.body),
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
