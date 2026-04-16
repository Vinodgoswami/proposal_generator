import { Readable } from 'stream'
import { google } from 'googleapis'
import { createSessionId, googleAuthStore } from './googleAuthStore.js'

const COOKIE_NAME = 'proposal_google_session'
const SCOPES = ['https://www.googleapis.com/auth/drive.file']

function getCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(';').map(part => part.trim())
  for (const cookie of cookies) {
    const [key, ...value] = cookie.split('=')
    if (key === name) return decodeURIComponent(value.join('='))
  }
  return null
}

function buildCookie(sessionId: string, secure: boolean): string {
  return `${COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? '; Secure' : ''}`
}

function getRedirectUri(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/api/google/callback`
}

function createOAuthClient(clientId: string, clientSecret: string, redirectUri: string) {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

function resolveGoogleClientCredentials(body: { clientId?: string; clientSecret?: string }, existing?: { clientId: string; clientSecret: string } | null) {
  const clientId = body.clientId?.trim() || process.env.GOOGLE_CLIENT_ID?.trim() || existing?.clientId || ''
  const clientSecret = body.clientSecret?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim() || existing?.clientSecret || ''
  return { clientId, clientSecret }
}

export interface GoogleRequestContext {
  baseUrl: string
  cookieHeader?: string
  secureCookies: boolean
}

export async function createGoogleAuthUrl(
  input: { clientId?: string; clientSecret?: string },
  context: GoogleRequestContext,
): Promise<{ statusCode: number; body: { url?: string; error?: string }; setCookie?: string }> {
  const existingSessionId = getCookie(context.cookieHeader, COOKIE_NAME)
  const sessionId = existingSessionId || createSessionId()
  const existing = existingSessionId ? await googleAuthStore.get(existingSessionId) : null
  const { clientId, clientSecret } = resolveGoogleClientCredentials(input, existing)

  if (!clientId || !clientSecret) {
    return {
      statusCode: 400,
      body: { error: 'Client ID and Secret are required' },
      setCookie: buildCookie(sessionId, context.secureCookies),
    }
  }

  await googleAuthStore.upsert({ sessionId, clientId, clientSecret, tokens: null })

  const redirectUri = getRedirectUri(context.baseUrl)
  const oauth2Client = createOAuthClient(clientId, clientSecret, redirectUri)
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: sessionId,
  })

  return {
    statusCode: 200,
    body: { url },
    setCookie: buildCookie(sessionId, context.secureCookies),
  }
}

export async function handleGoogleCallback(
  input: { code?: string; state?: string },
  context: GoogleRequestContext,
): Promise<{ statusCode: number; html: string; setCookie?: string }> {
  const code = input.code?.trim()
  const sessionId = input.state?.trim() || getCookie(context.cookieHeader, COOKIE_NAME) || ''

  if (!code || !sessionId) {
    return {
      statusCode: 400,
      html: 'Missing code or session information',
    }
  }

  const session = await googleAuthStore.get(sessionId)
  if (!session) {
    return {
      statusCode: 400,
      html: `<html><body><script>
        window.opener?.postMessage({ type: 'google-auth-error', error: 'Session expired. Please reconnect Google.' }, '*');
        window.close();
      </script></body></html>`,
      setCookie: buildCookie(sessionId, context.secureCookies),
    }
  }

  try {
    const oauth2Client = createOAuthClient(session.clientId, session.clientSecret, getRedirectUri(context.baseUrl))
    const { tokens } = await oauth2Client.getToken(code)
    if (!tokens) throw new Error('Token exchange failed')

    await googleAuthStore.upsert({
      sessionId,
      clientId: session.clientId,
      clientSecret: session.clientSecret,
      tokens: tokens as Record<string, unknown>,
    })

    return {
      statusCode: 200,
      setCookie: buildCookie(sessionId, context.secureCookies),
      html: `<html><body style="font-family:sans-serif;text-align:center;padding:40px;">
        <h2 style="color:#E86500;">Google account connected</h2>
        <p>You can close this window and return to the app.</p>
        <script>
          window.opener?.postMessage({ type: 'google-auth-success' }, '*');
          setTimeout(() => window.close(), 1500);
        </script>
      </body></html>`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token exchange failed'
    return {
      statusCode: 200,
      setCookie: buildCookie(sessionId, context.secureCookies),
      html: `<html><body><script>
        window.opener?.postMessage({ type: 'google-auth-error', error: ${JSON.stringify(message)} }, '*');
        window.close();
      </script></body></html>`,
    }
  }
}

export async function getGoogleAuthStatus(context: GoogleRequestContext): Promise<{ authenticated: boolean }> {
  const sessionId = getCookie(context.cookieHeader, COOKIE_NAME)
  if (!sessionId) return { authenticated: false }
  const session = await googleAuthStore.get(sessionId)
  return { authenticated: !!session?.tokens }
}

export async function revokeGoogleAuth(context: GoogleRequestContext): Promise<{ ok: true }> {
  const sessionId = getCookie(context.cookieHeader, COOKIE_NAME)
  if (sessionId) {
    await googleAuthStore.clearTokens(sessionId)
  }
  return { ok: true }
}

export async function createGoogleDocument(
  input: { html?: string; title?: string },
  context: GoogleRequestContext,
): Promise<{ statusCode: number; body: { docId?: string; docUrl?: string; error?: string } }> {
  const sessionId = getCookie(context.cookieHeader, COOKIE_NAME)
  if (!sessionId) {
    return { statusCode: 401, body: { error: 'Not authenticated with Google. Please connect first.' } }
  }

  const session = await googleAuthStore.get(sessionId)
  if (!session?.tokens) {
    return { statusCode: 401, body: { error: 'Not authenticated with Google. Please connect first.' } }
  }

  if (!input.html) {
    return { statusCode: 400, body: { error: 'HTML content is required' } }
  }

  try {
    const oauth2Client = createOAuthClient(session.clientId, session.clientSecret, getRedirectUri(context.baseUrl))
    oauth2Client.setCredentials(session.tokens)

    const drive = google.drive({ version: 'v3', auth: oauth2Client })
    const response = await drive.files.create({
      requestBody: {
        name: input.title || 'Technical Proposal',
        mimeType: 'application/vnd.google-apps.document',
      },
      media: {
        mimeType: 'text/html',
        body: Readable.from(input.html),
      },
      fields: 'id, webViewLink',
    })

    await googleAuthStore.upsert({
      sessionId,
      clientId: session.clientId,
      clientSecret: session.clientSecret,
      tokens: oauth2Client.credentials as Record<string, unknown>,
    })

    return {
      statusCode: 200,
      body: {
        docId: response.data.id || undefined,
        docUrl: response.data.webViewLink || undefined,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Google Doc'
    if (message.includes('invalid_grant') || message.includes('Token has been expired')) {
      await googleAuthStore.clearTokens(sessionId)
    }
    return { statusCode: 500, body: { error: message } }
  }
}
