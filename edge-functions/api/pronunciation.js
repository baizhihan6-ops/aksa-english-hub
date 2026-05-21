const RENDER_PRONUNCIATION_API = 'https://aksa-speech.onrender.com/api/pronunciation/';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export default async function onRequest(context) {
  const request = context.request;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Use POST for pronunciation evaluation.' }, 405);
  }

  let payload;
  try {
    payload = await request.text();
  } catch (err) {
    return jsonResponse({ error: 'Failed to read request body.' }, 400);
  }

  try {
    const upstream = await fetch(RENDER_PRONUNCIATION_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    return jsonResponse({
      error: 'Speech proxy cannot reach the pronunciation backend.',
      detail: err && err.message ? err.message : String(err),
    }, 502);
  }
}
