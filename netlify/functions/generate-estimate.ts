import { generateEstimateFromBody, type GenerateEstimateBody } from '../../server/lib/estimate.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Netlify v2 function — exports default, supports streaming Response.
// Keep-alive spaces prevent the proxy idle-connection timeout while the
// AI generates. fetch().then(r => r.json()) works because JSON.parse
// accepts leading whitespace.
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

  let body: GenerateEstimateBody
  try {
    body = await req.json() as GenerateEstimateBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const enc = new TextEncoder()

  const keepAlive = setInterval(() => {
    writer.write(enc.encode(' ')).catch(() => clearInterval(keepAlive))
  }, 5000)

  generateEstimateFromBody(body)
    .then(async result => {
      clearInterval(keepAlive)
      await writer.write(enc.encode(JSON.stringify(result)))
      await writer.close()
    })
    .catch(async err => {
      clearInterval(keepAlive)
      const message = err instanceof Error ? err.message : 'Generation failed'
      console.error('generate-estimate error:', message)
      await writer.write(enc.encode(JSON.stringify({ error: message })))
      await writer.close()
    })

  return new Response(readable, {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
