/**
 * Netlify Scheduled Function — avisos de tarefa.
 *
 * Manda 2 pushes por dia:
 *  - 7h BRT  (10:00 UTC): "Você tem X tarefas pra hoje"
 *  - 20h BRT (23:00 UTC): "Fechando o dia — X tarefas pendentes"
 *
 * COMO FUNCIONA
 *  - O app (home-logica.js) salva tags no OneSignal do aluno:
 *      tarefa_dia    = "2026-10-14"
 *      tarefas_hoje  = "3"
 *      provas_hoje   = "Matemática"  (ou vazio)
 *
 *  - Cron roda nos dois horários. A função detecta qual horário é
 *    pela hora BRT e muda a mensagem.
 */
export const config = { schedule: '0 10,23 * * *' };

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';
const APP_ID_PADRAO = 'f73275cd-17ad-4963-a25b-321ce2def2ba';

function diaBrasilia() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}
function horaBrasilia() {
  return new Date(Date.now() - 3 * 3600 * 1000).getUTCHours();
}

async function enviar(apiKey, appId, siteUrl, dia, hora, total, provas) {
  const ehManha = hora < 12;

  const headings = ehManha
    ? { pt: 'Bom dia 🌅', en: 'Good morning 🌅' }
    : { pt: 'Boa noite 🌙', en: 'Good evening 🌙' };

  let corpo;
  if (ehManha) {
    corpo = provas
      ? "Hoje tem " + provas + "! 📚 Bora revisar?"
      : "Você tem {{ tarefas_hoje | default: 'algumas' }} tarefa(s) pra hoje. Bora? 📚";
  } else {
    corpo = "Fechando o dia: {{ tarefas_hoje | default: 'algumas' }} tarefa(s) ainda pendente(s). Bora resolver? 💪";
  }

  const envio = {
    app_id: appId,
    target_channel: 'push',
    headings,
    contents: { pt: corpo, en: corpo },
    url: siteUrl + '/agenda.html',
    ttl: 4 * 3600,
    idempotency_key: 'tarefa-' + (ehManha ? 'manha' : 'noite') + '-' + dia,
    filters: [
      { field: 'tag', key: 'tarefa_dia', relation: '=', value: dia },
      { field: 'tag', key: 'tarefas_hoje', relation: '!=', value: '0' }
    ]
  };

  const r = await fetch(ONESIGNAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Key ' + apiKey },
    body: JSON.stringify(envio)
  });
  const texto = await r.text();
  return { status: r.status, corpo: texto.slice(0, 200) };
}

export default async () => {
  const apiKey = process.env.ONESIGNAL_API_KEY;
  if (!apiKey) {
    console.error('[tarefa-aviso] ONESIGNAL_API_KEY não configurada.');
    return;
  }
  const appId = process.env.ONESIGNAL_APP_ID || APP_ID_PADRAO;
  const siteUrl = (process.env.URL || 'https://hubbrain.netlify.app').replace(/\/$/, '');
  const dia = diaBrasilia();
  const hora = horaBrasilia();

  console.log('[tarefa-aviso] enviando pra', dia, 'hora BRT', hora);

  try {
    const r = await enviar(apiKey, appId, siteUrl, dia, hora);
    if (r.status >= 400) console.error('[tarefa-aviso]', r.status, r.corpo);
    else console.log('[tarefa-aviso] ok', r.corpo);
  } catch (e) {
    console.error('[tarefa-aviso] erro:', e && e.message);
  }
};
