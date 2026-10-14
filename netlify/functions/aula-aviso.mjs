/**
 * Netlify Scheduled Function — avisos de aula.
 *
 * Manda 2 pushes por aula:
 *  - 10 min antes: "Física em 10 min"
 *  - No começo:    "Física começou agora"
 *
 * COMO FUNCIONA
 *  - O app (grade-logica.js) salva tags no OneSignal do aluno:
 *      aviso_dia        = "2026-10-14"
 *      aviso_13_00      = "Física"     (aula às 13:00)
 *      aviso_13_50      = "Português"
 *      ... (só as aulas de hoje, limpa as antigas)
 *
 *  - A cada minuto, esta função calcula 2 alvos:
 *      "agora" (ex: 13:00) → avisa no começo
 *      "agora + 10min" (ex: 13:10) → não faz nada se não tiver aula
 *    Na prática: se a aula é 13:00, avisa às 12:50 e às 13:00.
 *
 * HORÁRIO: cron UTC. `* * * * *` = a cada minuto. BRT = UTC−3.
 *
 * VARIÁVEIS (Netlify → Site configuration → Env vars):
 *  ONESIGNAL_API_KEY  (obrigatória) → OneSignal → Settings → Keys & IDs
 *  ONESIGNAL_APP_ID   (opcional)
 */
export const config = { schedule: '* * * * *' };

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';
const APP_ID_PADRAO = '04313997-e78e-4274-948b-88586b1247ec';

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
      pt: "{{ " + tag + " | default: 'Sua aula' }}" + (ehAntes ? ' — se prepara!' : ' — começou agora!'),
      en: "{{ " + tag + " | default: 'Your class' }}" + (ehAntes ? ' — get ready!' : ' — starting now!')
    },
    url: siteUrl + '/horario.html',
    ttl: ehAntes ? 60 * 10 : 60 * 5,
    idempotency_key: 'aula-' + tipo + '-' + dia + '-' + hhmm,
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

  // Avisa 10 min antes
  try {
    const r1 = await enviar(apiKey, appId, siteUrl, dia, dezMin, 'antes');
    if (r1.status >= 400) console.error('[aula-aviso antes]', r1.status, r1.corpo);
  } catch (e) { console.error('[aula-aviso antes]', e.message); }

  // Avisa no começo
  try {
    const r2 = await enviar(apiKey, appId, siteUrl, dia, agora, 'agora');
    if (r2.status >= 400) console.error('[aula-aviso agora]', r2.status, r2.corpo);
  } catch (e) { console.error('[aula-aviso agora]', e.message); }
};
