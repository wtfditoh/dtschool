/**
 * Netlify Scheduled Function — push das 21h da Agenda.
 * Todo dia às 21h (horário de Brasília) manda: "X tarefas pendentes. Reagendar pra amanhã?"
 *
 * COMO FUNCIONA
 *  - A página da agenda grava 3 tags no OneSignal de cada aluno:
 *      agenda21h = "1" (lembrete ligado) · pend_dia = "AAAA-MM-DD" · pend_n = "3" (qtd. vencendo hoje/atrasada)
 *    As tags só existem se o aluno tem pendência HOJE; sem pendência elas são removidas.
 *  - Esta função só precisa da chave do OneSignal (não acessa o Firestore).
 *
 * HORÁRIO: cron da Netlify é em UTC. Brasília = UTC−3 (sem horário de verão desde 2019),
 *  então 21h BRT = 00:00 UTC do dia seguinte → "0 0 * * *".
 *
 * VARIÁVEIS (Netlify → Site configuration → Environment variables):
 *  ONESIGNAL_API_KEY  (obrigatória, secreta) → OneSignal → Settings → Keys & IDs → REST API Key
 *  ONESIGNAL_APP_ID   (opcional; já tem o app id do Hub Brain como padrão)
 *
 * Só roda em deploy PUBLICADO (produção). Não dá para chamar por URL; para testar:
 *  `netlify functions:invoke agenda-21h` com `netlify dev`.
 */
export const config = { schedule: '0 0 * * *' };

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';
const APP_ID_PADRAO = '04313997-e78e-4274-948b-88586b1247ec';
const PLURAL = Array.from({ length: 19 }, (_, i) => String(i + 2)).join(',');   // "2,3,...,20" (a tag é limitada a 20)

/** Data de "hoje" em Brasília (UTC−3). Às 00:00 UTC ainda é 21h do dia anterior em BRT. */
function diaBrasilia() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

function montarEnvios(dia, appId, siteUrl) {
  const base = {
    app_id: appId,
    target_channel: 'push',
    headings: { pt: 'Agenda 🌙', en: 'Agenda 🌙' },     // o título começa com "Agenda": o service worker usa isso
    url: siteUrl + '/agenda.html?reagendar=1',           // abre direto o "Reagendar para amanhã"
    ttl: 3 * 3600                                         // se o celular estiver off por 3h, descarta
  };
  const filtros = (n) => [
    { field: 'tag', key: 'agenda21h', relation: '=', value: '1' },
    { field: 'tag', key: 'pend_dia', relation: '=', value: dia },
    n
  ];
  return [
    {
      ...base,
      idempotency_key: 'agenda21h-' + dia + '-1',        // reexecução no mesmo dia não duplica
      filters: filtros({ field: 'tag', key: 'pend_n', relation: '=', value: '1' }),
      contents: { pt: '1 tarefa pendente. Reagendar pra amanhã?', en: '1 pending task. Reschedule for tomorrow?' }
    },
    {
      ...base,
      idempotency_key: 'agenda21h-' + dia + '-n',
      filters: filtros({ field: 'tag', key: 'pend_n', relation: 'in_array', value: PLURAL }),
      contents: {
        pt: "{{ pend_n | default: 'Várias' }} tarefas pendentes. Reagendar pra amanhã?",
        en: "{{ pend_n | default: 'Several' }} pending tasks. Reschedule for tomorrow?"
      }
    }
  ];
}

export default async () => {
  const apiKey = process.env.ONESIGNAL_API_KEY;
  if (!apiKey) {
    console.error('[agenda-21h] ONESIGNAL_API_KEY não configurada: nada enviado.');
    return;
  }
  const appId = process.env.ONESIGNAL_APP_ID || APP_ID_PADRAO;
  const siteUrl = (process.env.URL || 'https://hubbrain.netlify.app').replace(/\/$/, '');
  const dia = diaBrasilia();

  for (const envio of montarEnvios(dia, appId, siteUrl)) {
    try {
      const r = await fetch(ONESIGNAL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Key ' + apiKey },
        body: JSON.stringify(envio)
      });
      const corpo = await r.text();
      // 200 sem "id" = ninguém no público (normal em dia sem pendência)
      console.log('[agenda-21h]', envio.idempotency_key, r.status, corpo.slice(0, 300));
    } catch (e) {
      console.error('[agenda-21h] falha ao chamar o OneSignal:', e && e.message);
    }
  }
};
