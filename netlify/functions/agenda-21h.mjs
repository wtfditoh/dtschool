/**
 * Netlify Scheduled Function — push das 21h da Agenda.
 * Todo dia às 21h (horário de Brasília) manda: "X tarefas pendentes. Reagendar pra amanhã?"
 *
 * COMO FUNCIONA
 *  - A página da agenda grava 3 tags no OneSignal de cada aluno:
 *      agenda21h = "1" (lembrete ligado) · pend_dia = "AAAA-MM-DD" · pend_n = "3"
 *    As tags só existem se o aluno tem pendência HOJE; sem pendência elas são removidas.
 *
 * IDEMPOTÊNCIA
 *  - Usa uuidDe(str) pra gerar UUID v4 determinístico.
 *    Mesma string = mesmo UUID → se o cron rodar 2x, não duplica.
 *
 * HORÁRIO: cron da Netlify é em UTC. Brasília = UTC−3,
 *  então 21h BRT = 00:00 UTC do dia seguinte → "0 0 * * *".
 *
 * VARIÁVEIS (Netlify → Site configuration → Environment variables):
 *  ONESIGNAL_API_KEY  (obrigatória) → OneSignal → Settings → Keys & IDs → App API Key
 *  ONESIGNAL_APP_ID   (opcional)
 */
export const config = { schedule: '0 0 * * *' };

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';
const APP_ID_PADRAO = '04313997-e78e-4274-948b-88586b1247ec';
const PLURAL = Array.from({ length: 19 }, (_, i) => String(i + 2)).join(',');   // "2,3,...,20"

/* ═══════════════ HELPERS ═══════════════ */

/** Data de "hoje" em Brasília (UTC−3). Às 00:00 UTC ainda é 21h do dia anterior em BRT. */
function diaBrasilia() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/* ═══════════════ UUID DETERMINÍSTICO ═══════════════
   Mesma string → mesmo UUID v4 válido. */
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

/* ═══════════════ MONTAGEM DOS ENVIOS ═══════════════ */

function montarEnvios(dia, appId, siteUrl) {
  const base = {
    app_id: appId,
    target_channel: 'push',
    headings: { pt: 'Agenda 🌙', en: 'Agenda 🌙' },
    url: siteUrl + '/agenda.html?reagendar=1',
    ttl: 3 * 3600
  };

  const filtros = (n) => [
    { field: 'tag', key: 'agenda21h', relation: '=', value: '1' },
    { field: 'tag', key: 'pend_dia', relation: '=', value: dia },
    n
  ];

  return [
    {
      ...base,
      idempotency_key: uuidDe('agenda21h-' + dia + '-1'),
      filters: filtros({ field: 'tag', key: 'pend_n', relation: '=', value: '1' }),
      contents: {
        pt: '1 tarefa pendente. Reagendar pra amanhã?',
        en: '1 pending task. Reschedule for tomorrow?'
      }
    },
    {
      ...base,
      idempotency_key: uuidDe('agenda21h-' + dia + '-n'),
      filters: filtros({ field: 'tag', key: 'pend_n', relation: 'in_array', value: PLURAL }),
      contents: {
        pt: "{{ pend_n | default: 'Várias' }} tarefas pendentes. Reagendar pra amanhã?",
        en: "{{ pend_n | default: 'Several' }} pending tasks. Reschedule for tomorrow?"
      }
    }
  ];
}

/* ═══════════════ EXECUÇÃO ═══════════════ */

export default async () => {
  const apiKey = process.env.ONESIGNAL_API_KEY;
  if (!apiKey) {
    console.error('[agenda-21h] ONESIGNAL_API_KEY não configurada: nada enviado.');
    return;
  }

  const appId = process.env.ONESIGNAL_APP_ID || APP_ID_PADRAO;
  const siteUrl = (process.env.URL || 'https://hubbrain.netlify.app').replace(/\/$/, '');
  const dia = diaBrasilia();

  console.log('[agenda-21h] rodando para', dia);

  for (const envio of montarEnvios(dia, appId, siteUrl)) {
    try {
      const r = await fetch(ONESIGNAL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Key ' + apiKey },
        body: JSON.stringify(envio)
      });
      const corpo = await r.text();
      if (r.status >= 400) {
        console.error('[agenda-21h]', envio.idempotency_key, r.status, corpo.slice(0, 300));
      } else {
        console.log('[agenda-21h] ok', envio.idempotency_key, r.status, corpo.slice(0, 200));
      }
    } catch (e) {
      console.error('[agenda-21h] falha ao chamar o OneSignal:', e && e.message);
    }
  }
};
