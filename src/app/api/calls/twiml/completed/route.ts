import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const XML_HEADERS = { 'Content-Type': 'text/xml' }

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const params  = Object.fromEntries(new URLSearchParams(rawBody))

  console.log('[twiml/completed] DialCallStatus:', params['DialCallStatus'], 'params:', JSON.stringify(params))

  // Responde com TeXML vazio — a chamada já encerrou, nada mais a fazer
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { status: 200, headers: XML_HEADERS }
  )
}
