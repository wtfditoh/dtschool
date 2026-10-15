/**
 * Netlify Scheduled Function — push das 21h da Agenda.
 * Todo dia às 21h BRT manda: "X tarefas pendentes. Reagendar pra amanhã?"
 *
 * COMO FUNCIONA (v2 — lê do Firestore, não usa tags do OneSignal)
 *  - O app (grade-logica.js) salva em grades_horarias/{userId}:
 *      onesignal_player_id = "abc-123-..."
 *      pend_dia            = "2026-10-15"   (dia que foi calculado)
 *      pend_n              = "3"            (qtd pendente hoje/atrasada)
 *
 *  - Esta função lê todos os docs, filtra quem tem pend_dia = hoje e pend_n > 0,
 *    agrupa por quantidade (1 vs várias) e manda push direto pros device IDs.
 *
 * HORÁRIO: 21h BRT = 00:00 UTC do dia seguinte → "0 0 * * *"
 */
export const config = { schedule: '0 0 * * *' };

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';
const APP_ID_PADRAO = '04313997-e78e-4274-948b-88586b1247ec';
const FIREBASE_PROJECT = 'dt-scho0l';
const FIREBASE_API_KEY = 'AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc';

/** Data de "hoje" em Brasília (UTC−3). Às 00:00 UTC ainda é 21h BRT do dia anterior. */
function diaBrasilia() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
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

function sValor(v) {
  if (!v) return '';
  return v.stringValue !== undefined ? v.stringValue
       : v.integerValue !== undefined ? String(v.integerValue)
       : v.booleanValue !== undefined ? String(v.booleanValue)
       : '';
}

/** Lê todos os docs de grades_horarias via Firestore REST */
async function lerGrades() {
  const url = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT +
    '/databases/(default)/documents/grades_horarias?key=' + FIREBASE_API_KEY;
  const r = await fetch(url);
  if (!r.ok) {
    console.error('[agenda-21h] erro Firestore:', r.status, (await r.text()).slice(0, 200));
    return [];
  }
  const data = await r.json();
  return (data.documents || []).map(doc => {
    const f = doc.fields || {};
    return {
      onesignal_player_id: sValor(f.onesignal_player_id),
      pend_dia: sValor(f.pend_dia),
      pend_n: Number(sValor(f.pend_n)) || 0
    };
  });
}

async function enviar(apiKey, appId, siteUrl, playerIds, n, ehSingular) {
  const enviar = {
    app_id: appId,
    target_channel: 'push',
    include_subscription_ids: playerIds,
    headings: { pt: 'Agenda 🌙', en: 'Agenda 🌙' },
    contents: {
      pt: ehSingular
        ? '1 tarefa pendente. Reagendar pra amanhã?'
        : n + ' tarefas pendentes. Reagendar pra amanhã?',
      en: ehSingular
        ? '1 pending task. Reschedule for tomorrow?'
        : n + ' pending tasks. Reschedule for tomorrow?'
    },
    url: siteUrl + '/agenda.html?reagendar=1',
    ttl: 3 * 3600,
    idempotency_key: uuidDe('agenda21h-' + new Date().toISOString().slice(0, 10) + '-' + (ehSingular ? '1' : 'n') + '-' + n)
  };

  const r = await fetch(ONESIGNAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Key ' + apiKey },
    body: JSON.stringify(enviar)
  });
  const corpo = await r.text();
  return { status: r.status, corpo: corpo.slice(0, 200) };
}

export default async () => {
  const apiKey = process.env.ONESIGNAL_API_KEY;
  if (!apiKey) {
    console.error('[agenda-21h] ONESIGNAL_API_KEY não configurada.');
    return;
  }
  const appId = process.env.ONESIGNAL_APP_ID || APP_ID_PADRAO;
  const siteUrl = (process.env.URL || 'https://hubbrain.netlify.app').replace(/\/$/, '');
  const dia = diaBrasilia();

  console.log('[agenda-21h] rodando pra', dia);

  const grades = await lerGrades();
  if (!grades.length) {
    console.log('[agenda-21h] nenhuma grade encontrada');
    return;
  }

  // Filtra quem tem pendência hoje
  const comPendencia = grades.filter(g =>
    g.onesignal_player_id &&
    g.pend_dia === dia &&
    g.pend_n > 0
  );

  console.log('[agenda-21h] alunos com pendência:', comPendencia.length);

  if (!comPendencia.length) {
    console.log('[agenda-21h] ninguém pra avisar');
    return;
  }

  // Separa 1 tarefa vs várias
  const umSó = comPendencia.filter(g => g.pend_n === 1).map(g => g.onesignal_player_id);
  const varios = comPendencia.filter(g => g.pend_n > 1);

  // Manda pra quem tem 1 tarefa
  if (umSó.length) {
    console.log('[agenda-21h] 1 tarefa →', umSó.length, 'aluno(s)');
    try {
      const r = await enviar(apiKey, appId, siteUrl, [...new Set(umSó)], 1, true);
      if (r.status >= 400) console.error('[agenda-21h 1] erro:', r.status, r.corpo);
      else console.log('[agenda-21h 1] ok');
    } catch (e) {
      console.error('[agenda-21h 1] falha:', e.message);
    }
  }

  // Agrupa "vários" por quantidade (2, 3, 4...) pra não fazer 20 chamadas
  const porQtd = {};
  varios.forEach(g => {
    const k = String(g.pend_n);
    if (!porQtd[k]) porQtd[k] = [];
    porQtd[k].push(g.onesignal_player_id);
  });

  for (const [qtd, ids] of Object.entries(porQtd)) {
    console.log('[agenda-21h]', qtd, 'tarefas →', ids.length, 'aluno(s)');
    try {
      const r = await enviar(apiKey, appId, siteUrl, [...new Set(ids)], Number(qtd), false);
      if (r.status >= 400) console.error('[agenda-21h ' + qtd + '] erro:', r.status, r.corpo);
      else console.log('[agenda-21h ' + qtd + '] ok');
    } catch (e) {
      console.error('[agenda-21h ' + qtd + '] falha:', e.message);
    }
  }
};
