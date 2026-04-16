import { Request, Response } from 'express'
import {
  createGoogleAuthUrl,
  createGoogleDocument,
  getGoogleAuthStatus,
  handleGoogleCallback,
  revokeGoogleAuth,
} from '../lib/googleDocs.js'

function getBaseUrl(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) || req.protocol || 'http'
  return `${proto}://${req.get('host')}`
}

export async function getAuthUrl(req: Request, res: Response) {
  const result = await createGoogleAuthUrl(req.body as { clientId?: string; clientSecret?: string }, {
    baseUrl: getBaseUrl(req),
    cookieHeader: req.headers.cookie,
    secureCookies: getBaseUrl(req).startsWith('https://'),
  })
  if (result.setCookie) res.setHeader('Set-Cookie', result.setCookie)
  res.status(result.statusCode).json(result.body)
}

export async function handleCallback(req: Request, res: Response) {
  const result = await handleGoogleCallback(req.query as { code?: string; state?: string }, {
    baseUrl: getBaseUrl(req),
    cookieHeader: req.headers.cookie,
    secureCookies: getBaseUrl(req).startsWith('https://'),
  })
  if (result.setCookie) res.setHeader('Set-Cookie', result.setCookie)
  res.status(result.statusCode).send(result.html)
}

export async function getAuthStatus(req: Request, res: Response) {
  res.json(await getGoogleAuthStatus({
    baseUrl: getBaseUrl(req),
    cookieHeader: req.headers.cookie,
    secureCookies: getBaseUrl(req).startsWith('https://'),
  }))
}

export async function revokeAuth(req: Request, res: Response) {
  res.json(await revokeGoogleAuth({
    baseUrl: getBaseUrl(req),
    cookieHeader: req.headers.cookie,
    secureCookies: getBaseUrl(req).startsWith('https://'),
  }))
}

export async function createGoogleDoc(req: Request, res: Response) {
  const result = await createGoogleDocument(req.body as { html?: string; title?: string }, {
    baseUrl: getBaseUrl(req),
    cookieHeader: req.headers.cookie,
    secureCookies: getBaseUrl(req).startsWith('https://'),
  })
  res.status(result.statusCode).json(result.body)
}
