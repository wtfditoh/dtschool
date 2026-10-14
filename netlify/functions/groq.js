/**
 * Netlify Function: proxy seguro para a API da Groq.
 * URL no site: /.netlify/functions/groq   (POST)
 *
 * A chave da Groq fica SÓ aqui, na variável de ambiente GROQ_API_KEY
 * (Netlify → Site configuration → Environment variables). Nunca vai pro navegador.
 *
 * Proteções:
 *  - exige usuário logado (valida o ID token do Firebase)
 *  - só aceita chamadas do próprio site (mesma origem)
 *  - lista fixa de modelos, teto de tokens e de tamanho de texto
 *  - limite de uso por usuário (best-effort, por instância da função)
 *  - aceita mensagens multimodais (texto + imagem) pra leitura de grade com IA
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Troque aqui quando a Groq descontinuar algum modelo (e no MODELOS do ia-config.js).
// Inclui o modelo de VISÃO (llama-4-scout) usado pra escanear a grade horária.
const MODELOS_PERMITIDOS = new Set([
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'meta-llama/llama-4-scout-17b-16e-instruct'
]);
const MODELO_PADRAO = 'openai/gpt-oss-120b';

const TETO_TOKENS = 8000;
const MAX_MENSAGENS = 24;
const MAX_CHARS_TOTAL = 30000;
const MAX_IMG_BASE64 = 5_000_000;   // ~5MB de string base64 por imagem
const TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS) || 30000;

// Chave pública do Firebase (a mesma do front). Só serve pra validar o token do usuário.
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc';

const RATE_JANELA_MS = 60 * 1000;
const RATE_MAX = 20; // chamadas por usuário por minuto

const cacheTokens = new Map(); // idToken -> { uid, ate }
const usos = new Map();        // uid -> [timestamps]

function resposta(status, code, message) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ error: { code, message } }),
  };
}

async function verificarIdToken(idToken) {
  const hit = cacheTokens.get(idToken);
  if (hit && hit.ate > Date.now()) return hit.uid;

  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: process.env.URL || 'https://hubbrain.netlify.app/',
      },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!r.ok) return null;
  const d = await r.json();
  const uid = d && d.users && d.users[0] && d.users[0].localId;
  if (!uid) return null;

  if (cacheTokens.size > 500) cacheTokens.clear();
  cacheTokens.set(idToken, { uid, ate: Date.now() + 5 * 60 * 1000 });
  return uid;
}

function dentroDoLimite(uid) {
  const agora = Date.now();
  const lista = (usos.get(uid) || []).filter((t) => agora - t < RATE_JANELA_MS);
  if (lista.length >= RATE_MAX) {
    usos.set(uid, lista);
    return false;
  }
  lista.push(agora);
  usos.set(uid, lista);
  if (usos.size > 2000) usos.clear();
  return true;
}

const entre = (n, min, max, padrao) => {
  n = Number(n);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
};

/** Monta o payload enviado à Groq.
 *  Aceita content como STRING (compatível com o resto do app) ou ARRAY multimodal
 *  (texto + imagem), que é o que a grade horária usa pra escanear foto. */
function montarPayload(b) {
  if (!b || !Array.isArray(b.messages) || b.messages.length === 0 || b.messages.length > MAX_MENSAGENS) {
    return { erro: [400, 'bad_request', 'Mensagens inválidas.'] };
  }

  let total = 0;
  const messages = [];

  for (const m of b.messages) {
    if (!m || !['system', 'user', 'assistant'].includes(m.role)) {
      return { erro: [400, 'bad_request', 'Mensagem em formato inválido.'] };
    }

    // ── String simples (texto puro) ──
    if (typeof m.content === 'string') {
      total += m.content.length;
      messages.push({ role: m.role, content: m.content });
      continue;
    }

    // ── Array multimodal (texto + imagem) ──
    if (Array.isArray(m.content)) {
      const partes = [];
      for (const p of m.content) {
        if (!p || typeof p !== 'object') continue;

        if (p.type === 'text' && typeof p.text === 'string') {
          total += p.text.length;
          partes.push({ type: 'text', text: p.text });
        } else if (p.type === 'image_url' && p.image_url && typeof p.image_url.url === 'string') {
          if (p.image_url.url.length > MAX_IMG_BASE64) {
            return { erro: [413, 'too_large', 'Imagem grande demais.'] };
          }
          // Conta ~1 token por 4 caracteres base64 (aproximação)
          total += Math.round(p.image_url.url.length / 4);
          partes.push({ type: 'image_url', image_url: { url: p.image_url.url } });
        }
      }
      if (!partes.length) {
        return { erro: [400, 'bad_request', 'Mensagem vazia.'] };
      }
      messages.push({ role: m.role, content: partes });
      continue;
    }

    return { erro: [400, 'bad_request', 'Formato de mensagem desconhecido.'] };
  }

  if (total > MAX_CHARS_TOTAL) {
    return { erro: [413, 'too_large', 'Conteúdo grande demais.'] };
  }

  const model = b.model || MODELO_PADRAO;
  if (!MODELOS_PERMITIDOS.has(model)) {
    return { erro: [400, 'model_not_allowed', 'Modelo não permitido.'] };
  }

  const payload = {
    model,
    messages,
    temperature: entre(b.temperature, 0, 1.5, 0.6),
    max_completion_tokens: Math.round(entre(b.max_completion_tokens, 1, TETO_TOKENS, 2000)),
    reasoning_effort: ['low', 'medium', 'high'].includes(b.reasoning_effort) ? b.reasoning_effort : 'low',
    include_reasoning: false,
  };
  if (b.response_format && b.response_format.type === 'json_object') {
    payload.response_format = { type: 'json_object' };
  }
  return { payload };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return resposta(405, 'method_not_allowed', 'Use POST.');

  const headers = event.headers || {};

  // Só mesma origem (o navegador envia Origin em POST)
  if (headers.origin) {
    let ok = false;
    try { ok = new URL(headers.origin).host === headers.host; } catch (_) {}
    if (!ok) return resposta(403, 'forbidden_origin', 'Origem não permitida.');
  }

  const serverKey = process.env.GROQ_API_KEY;
  if (!serverKey) return resposta(503, 'no_server_key', 'Chave da IA não configurada no servidor.');

  const auth = headers.authorization || '';
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!idToken) return resposta(401, 'auth_required', 'Faça login para usar a IA.');

  let uid = null;
  try { uid = await verificarIdToken(idToken); } catch (_) {}
  if (!uid) return resposta(401, 'invalid_token', 'Sessão inválida. Entre novamente.');

  if (!dentroDoLimite(uid)) return resposta(429, 'rate_limited', 'Muitas chamadas seguidas. Espere um pouco.');

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (_) {
    return resposta(400, 'bad_request', 'JSON inválido.');
  }
  const { payload, erro } = montarPayload(body);
  if (erro) return resposta(erro[0], erro[1], erro[2]);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serverKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const texto = await r.text();
    return {
      statusCode: r.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: texto,
    };
  } catch (e) {
    if (e && e.name === 'AbortError') return resposta(504, 'timeout', 'A IA demorou demais.');
    return resposta(502, 'upstream_error', 'Falha ao falar com a IA.');
  } finally {
    clearTimeout(timer);
  }
};

// exportado só para testes
exports._montarPayload = montarPayload;
