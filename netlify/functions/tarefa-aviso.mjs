/**
 * Netlify Scheduled Function — avisos de tarefa.
 *
 * Manda 2 pushes por dia:
 *  - 7h BRT  (10:00 UTC): "Você tem X tarefas pra hoje"
 *  - 20h BRT (23:00 UTC): "Fechando o dia — X tarefas pendentes"
 *
 * COMO FUNCIONA (v2 — lê do Firestore, não usa tags do OneSignal)
 *  - O app (home-logica.js) salva em grades_horarias/{userId}:
 *      onesignal_player_id = "abc-123-..."   (do device)
 *      tarefa_dia          = "2026-10-15"
 *      tarefas_hoje        = "3"             (pendentes pra hoje)
 *      provas_hoje         = "Matemática"    (ou vazio)
 *
 *  - Esta função lê todos os documentos, filtra quem tem tarefa_dia = hoje
 *    e tarefas_hoje > 0, pega os IDs e manda push direto pros devices.
 *    Sem delay de indexação de tag — chega na hora.
 */
export const config = { schedule: '0 10,23 * * *' };

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';
const APP_ID_PADRAO = '04313997-e78e-4274-948b-88586b1247ec';
const FIREBASE_PROJECT = 'dt-scho0l';
const FIREBASE_API_KEY = 'AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc';

function diaBrasilia() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}
function horaBrasilia() {
  return new Date(Date.now() - 3 * 3600 * 1000).getUTCHours();
}
function uuidDe(str) {
  let h1 = 0, h2 = 0;
  for (let i = 0; i < str.length; i++) {
    h1 = ((h1 << 5) - h1 + str.charCodeAt(i)) | 0;
    h2 = ((h2 << 7) - h2 + str.charCodeAt(i) * 31) | 0;
  }
  const a = Math.abs(h1).toString(16).padStart(8, '0');
  const b = Math.abs(h2).toString(16).padStart(8, '0');
  return a.slice(0, 8) + '-' + b.slice(0, 4) + '-4' + a.slice(0, 3) + '-8' + b.slice(0, 3) + '-' + a.slice(0, 8) + b.slice(0, 4);
}

/** Lê todos os docs de grades_horarias via Firestore REST */
async function lerGrades() {
  const url = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT +
    '/databases/(default)/documents/grades_horarias?key=' + FIREBASE_API_KEY;
  const r = await fetch(url);
  if (!r.ok) {
    console.error('[tarefa-aviso] erro Firestore:', r.status, (await r.text()).slice(0, 200));
    return [];
  }
  const data = await r.json();
  return (data.documents || []).map(doc => {
    const campos = {};
    Object.entries(doc.fields || {}).forEach(([k, v]) => {
      campos[k] = v.stringValue !== undefined ? v.stringValue
                : v.integerValue !== undefined ? v.integerValue
                : v.booleanValue !== undefined ? v.booleanValue
                : null;
    });
    return campos;
  });
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
  const ehManha = hora < 12;

  console.log('[tarefa-aviso] rodando', dia, 'hora BRT', hora, ehManha ? '(manhã)' : '(noite)');

  // Lê alunos do Firestore
  const grades = await lerGrades();
  console.log('[tarefa-aviso] total de alunos:', grades.length);

  // Filtra quem tem tarefa vencendo hoje
  const playerIds = grades
    .filter(g => g.tarefa_dia === dia)
    .filter(g => Number(g.tarefas_hoje) > 0)
    .map(g => g.onesignal_player_id)
    .filter(Boolean);

  const unicos = [...new Set(playerIds)];
  console.log('[tarefa-aviso] alunos com pendência:', unicos.length);

  if (!unicos.length) {
    console.log('[tarefa-aviso] ninguém tem pendência — não manda');
    return;
  }

  const headings = ehManha
    ? { pt: 'Bom dia 🌅', en: 'Good morning 🌅' }
    : { pt: 'Boa noite 🌙', en: 'Good evening 🌙' };

  const corpo = ehManha
    ? "Você tem {{ tarefas_hoje | default: 'algumas' }} tarefa(s) pra hoje. Bora? 📚"
    : "Fechando o dia: {{ tarefas_hoje | default: 'algumas' }} tarefa(s) ainda pendente(s). Bora resolver? 💪";

  const envio = {
    app_id: appId,
    target_channel: 'push',
    include_subscription_ids: unicos,
    headings,
    contents: { pt: corpo, en: corpo },
    url: siteUrl + '/agenda.html',
    ttl: 4 * 3600,
    idempotency_key: uuidDe('tarefa-' + (ehManha ? 'manha' : 'noite') + '-' + dia)
  };

  try {
    const r = await fetch(ONESIGNAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Key ' + apiKey },
      body: JSON.stringify(envio)
    });
    const texto = await r.text();
    if (r.status >= 400) console.error('[tarefa-aviso] erro OneSignal:', r.status, texto.slice(0, 300));
    else console.log('[tarefa-aviso] ok', texto.slice(0, 200));
  } catch (e) {
    console.error('[tarefa-aviso] falha:', e.message);
  }
};
