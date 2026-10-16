/**
 * Netlify Scheduled Function — avisos de aula.
 *
 * Manda 2 pushes por aula:
 *  - 10 min antes: "Física em 10min, se liga"
 *  - No começo:    "Física começou. Vai logo"
 *
 * COMO FUNCIONA (v3 — janela de tolerância + mensagens variadas)
 *  - Lê grades_horarias via Firestore REST.
 *  - Janela "antes": só dispara quando a aula está entre 8 e 10 min à frente.
 *  - Janela "agora": só dispara quando a aula começou há 0-3 min.
 *  - Mensagens variam por hash(matéria + hora) — mesma aula = mesma mensagem entre reenvios.
 *  - idempotency_key garante que reexecução não duplica.
 */
export const config = { schedule: '* * * * *' };

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';
const APP_ID_PADRAO = '04313997-e78e-4274-948b-88586b1247ec';
const FIREBASE_PROJECT = 'dt-scho0l';
const FIREBASE_API_KEY = 'AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc';

const DIAS_FULL = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

/* ───────── mensagens na vibe "amigo da sala" ───────── */
const ANTES = [
  ['ó o bagulho 👀',        (m) => `${m} em 10min, se liga`],
  ['acorda fi 😴',          (m) => `${m} já já. Levanta desse chão`],
  ['mano... ⏰',            (m) => `${m} em 10min. Cuida pra cuidar`],
  ['chegando o bicho 🚨',   (m) => `${m} em 10min. Se prepara aí`],
  ['10min só ⚡',           (m) => `${m} já já. Fecha o Insta`],
  ['psiu 👀',               (m) => `${m} em 10min. Bora se arrumar`],
  ['tá chegando a hora 💀', (m) => `${m} em 10min. Não dorme não`],
  ['último aviso ⏳',       (m) => `${m} em 10min. Depois não diz que não avisei`]
];

const AGORA = [
  ['é AGORA mlk 🔥',         (m) => `${m} começou. Vai logo`],
  ['colou a aula 📚',        (m) => `${m} agora. Entra aí`],
  ['acabou a moleza 🫡',     (m) => `${m} começou. bora meu fi`],
  ['bora bora 🚀',           (m) => `${m} agora. Levanta`],
  ['chegou o momento 🎯',    (m) => `${m} começou. Bora`],
  ['já era o descanso 😮‍💨', (m) => `${m} agora. Vai`],
  ['presta atenção 👀',      (m) => `${m} começou. Cola aí`],
  ['já começou ',              (m) => `${m} ó a hora. entra pcr`]
];

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
const seedDe = (s) => s.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

/* ───────── helpers de tempo (BRT = UTC−3) ───────── */
function brt() { return new Date(Date.now() - 3 * 3600 * 1000); }
function diaSemanaBrasilia() { return DIAS_FULL[brt().getUTCDay()]; }
function hhmmDaqui(minutos) {
  const d = brt();
  d.setUTCMinutes(d.getUTCMinutes() + minutos);
  return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
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

/* ───────── Firestore REST ───────── */
function sValor(v) {
  if (!v) return '';
  return v.stringValue !== undefined ? v.stringValue
       : v.integerValue !== undefined ? String(v.integerValue)
       : v.booleanValue !== undefined ? String(v.booleanValue)
       : '';
}
function extrairAulas(v) {
  if (!v || !v.arrayValue || !v.arrayValue.values) return [];
  return v.arrayValue.values.map(item => {
    const f = (item.mapValue && item.mapValue.fields) || {};
    return {
      ordem: sValor(f.ordem),
      materia: sValor(f.materia),
      hora: sValor(f.hora),
      prof: sValor(f.prof)
    };
  });
}
async function lerGrades() {
  const url = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT +
    '/databases/(default)/documents/grades_horarias?key=' + FIREBASE_API_KEY;
  const r = await fetch(url);
  if (!r.ok) {
    console.error('[aula-aviso] erro Firestore:', r.status, (await r.text()).slice(0, 200));
    return [];
  }
  const data = await r.json();
  return (data.documents || []).map(doc => {
    const f = doc.fields || {};
    const gradeFields = (f.grade && f.grade.mapValue && f.grade.mapValue.fields) || {};
    const grade = {};
    Object.entries(gradeFields).forEach(([dia, arr]) => { grade[dia] = extrairAulas(arr); });
    return { onesignal_player_id: sValor(f.onesignal_player_id), grade };
  });
}

/* ───────── envio ───────── */
async function enviar(apiKey, appId, siteUrl, playerIds, materia, tipo, diaStr, hhmm) {
  const ehAntes = tipo === 'antes';
  const lista = ehAntes ? ANTES : AGORA;
  const [titulo, corpoFn] = pick(lista, seedDe(materia + hhmm));

  const envio = {
    app_id: appId,
    target_channel: 'push',
    include_subscription_ids: playerIds,
    headings: { pt: titulo, en: ehAntes ? 'In 10 min' : 'Starting now' },
    contents: { pt: corpoFn(materia), en: ehAntes ? `${materia} in 10 min` : `${materia} starting now` },
    url: siteUrl + '/horario.html',
    ttl: ehAntes ? 60 * 10 : 60 * 5,
    idempotency_key: uuidDe('aula-' + tipo + '-' + diaStr + '-' + hhmm + '-' + materia),
    android_group: 'aula-' + tipo + '-' + diaStr + '-' + hhmm,
    web_push_topic: 'aula' + tipo + diaStr.replace(/-/g, '') + hhmm.replace(':', '')
  };

  const r = await fetch(ONESIGNAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Key ' + apiKey },
    body: JSON.stringify(envio)
  });
  const corpo = await r.text();
  return { status: r.status, corpo: corpo.slice(0, 200) };
}

/* ───────── handler ───────── */
export default async () => {
  const apiKey = process.env.ONESIGNAL_API_KEY;
  if (!apiKey) { console.error('[aula-aviso] ONESIGNAL_API_KEY não configurada.'); return; }
  const appId = process.env.ONESIGNAL_APP_ID || APP_ID_PADRAO;
  const siteUrl = (process.env.URL || 'https://hubbrain.netlify.app').replace(/\/$/, '');

  const hoje = diaSemanaBrasilia();
  if (!['segunda', 'terca', 'quarta', 'quinta', 'sexta'].includes(hoje)) return;

  // "antes": só quando a aula está 8, 9 ou 10 min à frente (nunca mais cedo)
  const antesSet = new Set([hhmmDaqui(10), hhmmDaqui(9), hhmmDaqui(8)]);
  // "agora": só quando a aula começou há 0-3 min (nunca antes de começar)
  const agoraSet = new Set([hhmmDaqui(0), hhmmDaqui(-1), hhmmDaqui(-2), hhmmDaqui(-3)]);

  console.log('[aula-aviso] rodando', hoje, 'agora:', hhmmDaqui(0), '| antes:', hhmmDaqui(10));

  const grades = await lerGrades();
  if (!grades.length) { console.log('[aula-aviso] nenhuma grade encontrada'); return; }

  const mapaAntes = {};
  const mapaAgora = {};

  grades.forEach(g => {
    if (!g.onesignal_player_id) return;
    const aulas = g.grade[hoje] || [];
    aulas.forEach(a => {
      if (!a.hora || !a.materia) return;
      const chave = a.hora + '|' + a.materia;
      if (antesSet.has(a.hora)) (mapaAntes[chave] = mapaAntes[chave] || []).push(g.onesignal_player_id);
      if (agoraSet.has(a.hora))  (mapaAgora[chave]  = mapaAgora[chave]  || []).push(g.onesignal_player_id);
    });
  });

  for (const [chave, ids] of Object.entries(mapaAntes)) {
    const [hora, materia] = chave.split('|');
    const unicos = [...new Set(ids)];
    console.log('[aula-aviso] antes:', materia, 'às', hora, '→', unicos.length, 'aluno(s)');
    try {
      const r = await enviar(apiKey, appId, siteUrl, unicos, materia, 'antes', hoje, hora);
      if (r.status >= 400) console.error('[aula-aviso antes] erro:', r.status, r.corpo);
    } catch (e) { console.error('[aula-aviso antes] falha:', e.message); }
  }

  for (const [chave, ids] of Object.entries(mapaAgora)) {
    const [hora, materia] = chave.split('|');
    const unicos = [...new Set(ids)];
    console.log('[aula-aviso] agora:', materia, 'às', hora, '→', unicos.length, 'aluno(s)');
    try {
      const r = await enviar(apiKey, appId, siteUrl, unicos, materia, 'agora', hoje, hora);
      if (r.status >= 400) console.error('[aula-aviso agora] erro:', r.status, r.corpo);
    } catch (e) { console.error('[aula-aviso agora] falha:', e.message); }
  }

  if (!Object.keys(mapaAntes).length && !Object.keys(mapaAgora).length) {
    console.log('[aula-aviso] nenhuma aula nesse minuto');
  }
};
