/**
 * Netlify Function: envia push global via OneSignal.
 * URL: /.netlify/functions/push-global   (POST)
 */

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';
const APP_ID_PADRAO = '04313997-e78e-4274-948b-88586b1247ec';
const ADMIN_TOKEN_PADRAO = 'hubbrain-admin-2024';

// Headers que a função devolve em TODAS as respostas
const CORS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function resposta(status, body) {
  return {
    statusCode: status,
    headers: CORS,
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  // ─── CORS preflight ───
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return resposta(405, { error: 'Use POST' });
  }

  // ─── Auth do admin ───
  const adminToken = process.env.ADMIN_PUSH_TOKEN || ADMIN_TOKEN_PADRAO;
  const auth = event.headers.authorization || event.headers.Authorization || '';
  if (auth !== 'Bearer ' + adminToken) {
    return resposta(401, { error: 'Não autorizado' });
  }

  // ─── Body ───
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (_) { return resposta(400, { error: 'JSON inválido' }); }

  const titulo = String(body.titulo || '').trim().slice(0, 100);
  const mensagem = String(body.mensagem || '').trim().slice(0, 300);

  if (!titulo || !mensagem) {
    return resposta(400, { error: 'Preencha título e mensagem' });
  }

  // ─── OneSignal ───
  const apiKey = process.env.ONESIGNAL_API_KEY;
  console.log('[push-global] chave presente?', apiKey ? 'SIM' : 'NAO');
  if (apiKey) console.log('[push-global] prefixo:', apiKey.slice(0, 15));

  if (!apiKey) {
    return resposta(503, { error: 'ONESIGNAL_API_KEY não configurada no Netlify' });
  }

  const appId = process.env.ONESIGNAL_APP_ID || APP_ID_PADRAO;
  const siteUrl = (process.env.URL || 'https://hubbrain.netlify.app').replace(/\/$/, '');

  const envio = {
    app_id: appId,
    target_channel: 'push',
    included_segments: ['Subscribed Users'],
    headings: { pt: titulo, en: titulo },
    contents: { pt: mensagem, en: mensagem },
    url: siteUrl + '/index.html',
    ttl: 4 * 3600,
    idempotency_key: crypto.randomUUID()
  };

  try {
    const r = await fetch(ONESIGNAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Key ' + apiKey
      },
      body: JSON.stringify(envio)
    });

    const data = await r.json();

    if (!r.ok) {
      console.error('[push-global] OneSignal erro:', r.status, data);
      return resposta(r.status, { error: data.errors || data });
    }

    console.log('[push-global] ok. recipients:', data.recipients || 0);
    return resposta(200, {
      id: data.id || 'ok',
      recipients: data.recipients || 0
    });
  } catch (e) {
    console.error('[push-global] erro rede:', e.message);
    return resposta(502, { error: 'Falha ao falar com OneSignal: ' + (e.message || 'erro') });
  }
};
