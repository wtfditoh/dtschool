/**
 * Netlify Scheduled Function — avisos de aula.
 *
 * Manda 2 pushes por aula:
 *  - 10 min antes: "Física em 10 min"
 *  - No começo:    "Física começou agora"
 *
 * COMO FUNCIONA
 *  - O app (grade-logica.js) salva tags no OneSignal do aluno:
 *      aviso_dia        = "2026-10-15"
 *      aviso_13_00      = "Física"     (aula às 13:00)
 *      aviso_13_50      = "Português"
 *      ... (só as aulas de hoje)
 *
 *  - A cada minuto, esta função calcula 2 alvos:
 *      "agora" (ex: 13:00) → avisa no começo
 *      "agora + 10min" (ex: 13:10) → avisa 10min antes
 *    Na prática: se a aula é 13:00, avisa às 12:50 e às 13:00.
 *
 * IDEMPOTÊNCIA
 *  - Usa uuidDe(str) em vez de crypto.randomUUID() pra evitar duplicados
 *    se o cron rodar 2x no mesmo minuto. Mesma string = mesmo UUID.
 *
 * HORÁRIO: cron UTC. `* * * * *` = a cada minuto. BRT = UTC−3.
 *
 * VARIÁVEIS (Netlify → Site configuration → Env vars):
 *  ONESIGNAL_API_KEY  (obrigatória) → OneSignal → Settings → Keys & IDs
 *  ONESIGNAL_APP_ID   (opcional — já tem padrão)
 */
export const config = { schedule: '* * * * *' };

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';
const APP_ID_PADRAO = '04313997-e78e-4274-948b-88586b1247ec';

/* ═══════════════ HELPERS DE DATA (BRT) ═══════════════ */

function brt() {
  return new Date(Date.now() - 3 * 3600 * 1000);
}

function diaBrasilia() {
  return brt().toISOString().slice(0, 10);
}

function hhmmAgora() {
  const d = brt();
  return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
}

function hhmmDaqui(minutos) {
  const d = brt();
  d.setUTCMinutes(d.getUTCMinutes() + minutos);
  return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
}

function tagDe(hhmm) {
  return 'aviso_' + hhmm.replace(':', '_');
}

/* ═══════════════ UUID DETERMINÍSTICO ═══════════════
   Mesma string → mesmo UUID v4 válido.
   Usado no idempotency_key pra:
     1. Ser aceito pelo OneSignal (exige UUID v4)
     2. Evitar duplicado se o cron rodar 2x no mesmo minuto */
function uuidDe(str) {
  let h1 = 0, h2 = 0;
  for (let i = 0; i < str.length; i++) {
    h1 = ((h1 << 5) - h1 + str.charCodeAt(i)) | 0;
    h2 = ((h2 << 7) - h2 + str.charCodeAt(i) * 31) | 0;
  }
  const a = Math.abs(h1).toString(16).padStart(8, '0');
  const b = Math.abs(h2).toString(16).padStart(8, '0');
  return (
    a.slice(0, 8) + '-' +
    b.slice(0, 4) + '-4' +
    a.slice(0, 3) + '-8' +
    b.slice(0, 3) + '-' +
    a.slice(0, 8) + b.slice(0, 4)
  );
}

/* ═══════════════ ENVIO ═══════════════ */

async function enviar(apiKey, appId, siteUrl, dia, hhmm, tipo) {
  const tag = tagDe(hhmm);
  const ehAntes = tipo === 'antes';

  const envio = {
    app_id: appId,
    target_channel: 'push',
    headings: {
      pt: ehAntes ? 'Aula em 10 min ⏰' : 'Aula começando 📚',
      en: ehAntes ? 'Class in 10 min ⏰' : 'Class starting 📚'
    },
    contents: {
      pt: '{{ ' + tag + " | default: 'Sua aula' }}" + (ehAntes ? ' — se prepara!' : ' — começou agora!'),
      en: '{{ ' + tag + " | default: 'Your class' }}" + (ehAntes ? ' — get ready!' : ' — starting now!')
    },
    url: siteUrl + '/horario.html',
    ttl: ehAntes ? 60 * 10 : 60 * 5,
    idempotency_key: uuidDe('aula-' + tipo + '-' + dia + '-' + hhmm),
    filters: [
      { field: 'tag', key: 'aviso_dia', relation: '=', value: dia },
      { field: 'tag', key: tag, relation: 'exists' }
    ]
  };

  const r = await fetch(ONESIGNAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Key ' + apiKey },
    body: JSON.stringify(envio)
  });
  const corpo = await r.text();
  return { status: r.status, corpo: corpo.slice(0, 200) };
}

/* ═══════════════ EXECUÇÃO ═══════════════ */

export default async () => {
  const apiKey = process.env.ONESIGNAL_API_KEY;
  if (!apiKey) {
    console.error('[aula-aviso] ONESIGNAL_API_KEY não configurada.');
    return;
  }

  const appId = process.env.ONESIGNAL_APP_ID || APP_ID_PADRAO;
  const siteUrl = (process.env.URL || 'https://hubbrain.netlify.app').replace(/\/$/, '');
  const dia = diaBrasilia();

  const agora = hhmmAgora();
  const dezMin = hhmmDaqui(10);

  console.log('[aula-aviso]', dia, agora, '→ antes:', dezMin, '| agora:', agora);

  // Avisa 10 min antes
  try {
    const r1 = await enviar(apiKey, appId, siteUrl, dia, dezMin, 'antes');
    if (r1.status >= 400) {
      console.error('[aula-aviso antes]', r1.status, r1.corpo);
    } else {
      console.log('[aula-aviso antes] ok', r1.corpo.slice(0, 100));
    }
  } catch (e) {
    console.error('[aula-aviso antes] erro:', e.message);
  }

  // Avisa no começo
  try {
    const r2 = await enviar(apiKey, appId, siteUrl, dia, agora, 'agora');
    if (r2.status >= 400) {
      console.error('[aula-aviso agora]', r2.status, r2.corpo);
    } else {
      console.log('[aula-aviso agora] ok', r2.corpo.slice(0, 100));
    }
  } catch (e) {
    console.error('[aula-aviso agora] erro:', e.message);
  }
};
