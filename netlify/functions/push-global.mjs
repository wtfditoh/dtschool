/**
 * Netlify Function: envia push global via OneSignal.
 * URL: /.netlify/functions/push-global   (POST)
 *
 * Usado pelo painel do mestre pra mandar aviso pra todos os alunos.
 * Substitui o servidor no Render (que dormia e dava "Failed to fetch").
 *
 * VARIÁVEIS DE AMBIENTE:
 *  ONESIGNAL_API_KEY  (obrigatória) — mesmo valor usado em aula-aviso/tarefa-aviso
 *  ONESIGNAL_APP_ID   (opcional) — padrão já configurado
 *  ADMIN_PUSH_TOKEN   (opcional) — token de auth; se não setar, usa o padrão abaixo
 */

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';
const APP_ID_PADRAO = 'f73275cd-17ad-4963-a25b-321ce2def2ba';
const ADMIN_TOKEN_PADRAO = 'hubbrain-admin-2024';

function resposta(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return resposta(200, '');
  }

  if (event.httpMethod !== 'POST') {
    return resposta(405, { error: 'Use POST' });
  }

  // ─── Auth ───
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
  if (!apiKey) {
    return resposta(503, { error: 'ONESIGNAL_API_KEY não configurada no Netlify' });
  }

  const appId = process.env.ONESIGNAL_APP_ID || APP_ID_PADRAO;
  const siteUrl = (process.env.URL || 'https://hubbrain.netlify.app').replace(/\/$/, '');

  const envio = {
    app_id: appId,
    target_channel: 'push',
    headings: { pt: titulo, en: titulo },
    contents: { pt: mensagem, en: mensagem },
    url: siteUrl + '/index.html',
    ttl: 4 * 3600,
    idempotency_key: 'admin-' + Date.now()
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
      return resposta(r.status, { error: data.errors || data });
    }

    return resposta(200, {
      id: data.id || 'ok',
      recipients: data.recipients || 0
    });
  } catch (e) {
    return resposta(502, { error: 'Falha ao falar com OneSignal: ' + (e.message || 'erro') });
  }
};
