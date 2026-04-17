import { generateConceptFromBody, type GenerateConceptBody } from '../../server/lib/concept.js'
import { decryptKeys } from '../../server/lib/keyDecryption.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Netlify v2 function — exports default, supports streaming Response.
// We stream a keep-alive space every 5 s so the proxy never sees an idle
// connection. The final JSON is the last (and only real) chunk.
// fetch().then(r => r.json()) on the client is fine because JSON.parse
// ignores leading whitespace, which is all the keep-alive bytes are.
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  let body: GenerateConceptBody
  try {
    body = await req.json() as GenerateConceptBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const enc = new TextEncoder()

  // Send a space every 5 s to prevent idle-connection timeouts on proxies
  const keepAlive = setInterval(() => {
    writer.write(enc.encode(' ')).catch(() => clearInterval(keepAlive))
  }, 5000)

  generateConceptFromBody(decryptKeys(body))
    .then(async result => {
      clearInterval(keepAlive)
      await writer.write(enc.encode(JSON.stringify(result)))
      await writer.close()
    })
    .catch(async err => {
      clearInterval(keepAlive)
      const message = err instanceof Error ? err.message : 'Generation failed'
      console.error('generate-concept error:', message)
      await writer.write(enc.encode(JSON.stringify({ error: message })))
      await writer.close()
    })

  return new Response(readable, {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
