/**
 * Netlify Scheduled Function — avisos de aula.
 *
 * Manda 2 pushes por aula:
 *  - 10 min antes: "Física em 10 min"
 *  - No começo:    "Física começou agora"
 *
 * COMO FUNCIONA (v2 — lê do Firestore, não usa tags do OneSignal)
 *  - O app (grade-logica.js) salva em grades_horarias/{userId}:
 *      onesignal_player_id = "abc-123-..."   (do device)
 *      grade.segunda[0] = { ordem: "1ª Aula", materia: "Física", hora: "13:00", prof: "..." }
 *
 *  - A cada minuto, esta função lê todas as grades, calcula o "HH:MM de agora"
 *    e "HH:MM + 10min", e manda push direto pros IDs de quem tem aula nesse horário.
 *    Sem delay de indexação de tag — chega na hora.
 */
export const config = { schedule: '* * * * *' };

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';
const APP_ID_PADRAO = '04313997-e78e-4274-948b-88586b1247ec';
const FIREBASE_PROJECT = 'dt-scho0l';
const FIREBASE_API_KEY = 'AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc';

const DIAS_FULL = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

function brt() {
  return new Date(Date.now() - 3 * 3600 * 1000);
}
function diaSemanaBrasilia() {
  return DIAS_FULL[brt().getUTCDay()];
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

/** Extrai string de um campo Firestore REST */
function sValor(v) {
  if (!v) return '';
  return v.stringValue !== undefined ? v.stringValue
       : v.integerValue !== undefined ? String(v.integerValue)
       : v.booleanValue !== undefined ? String(v.booleanValue)
       : '';
}

/** Extrai um array de objetos (grade do dia) */
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

/** Lê todos os docs de grades_horarias via Firestore REST */
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
    Object.entries(gradeFields).forEach(([dia, arr]) => {
      grade[dia] = extrairAulas(arr);
    });
    return {
      onesignal_player_id: sValor(f.onesignal_player_id),
      grade
    };
  });
}

/** Envia push pra um conjunto de IDs */
async function enviar(apiKey, appId, siteUrl, playerIds, materia, tipo, diaStr, hhmm) {
  const ehAntes = tipo === 'antes';

  const envio = {
    app_id: appId,
    target_channel: 'push',
    include_subscription_ids: playerIds,
    headings: {
      pt: ehAntes ? 'Aula em 10 min ⏰' : 'Aula começando 📚',
      en: ehAntes ? 'Class in 10 min ⏰' : 'Class starting 📚'
    },
    contents: {
      pt: materia + (ehAntes ? ' — se prepara!' : ' — começou agora!'),
      en: materia + (ehAntes ? ' — get ready!' : ' — starting now!')
    },
    url: siteUrl + '/horario.html',
    ttl: ehAntes ? 60 * 10 : 60 * 5,
    idempotency_key: uuidDe('aula-' + tipo + '-' + diaStr + '-' + hhmm + '-' + materia)
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

  const hoje = diaSemanaBrasilia();
  const agora = hhmmAgora();
  const dezMin = hhmmDaqui(10);

  // Se for fim de semana, não faz nada
  if (!['segunda', 'terca', 'quarta', 'quinta', 'sexta'].includes(hoje)) {
    return;
  }

  console.log('[aula-aviso] rodando', hoje, 'agora:', agora, '| antes:', dezMin);

  const grades = await lerGrades();
  if (!grades.length) {
    console.log('[aula-aviso] nenhuma grade encontrada');
    return;
  }

  // Agrupa alunos por matéria+horário
  // Mapa: "13:00|Física" → [ids]
  const mapaAntes = {};   // aula em 10min
  const mapaAgora = {};   // aula agora

  grades.forEach(g => {
    if (!g.onesignal_player_id) return;
    const aulas = g.grade[hoje] || [];

    aulas.forEach(a => {
      if (!a.hora || !a.materia) return;
      const chave = a.hora + '|' + a.materia;

      if (a.hora === dezMin) {
        if (!mapaAntes[chave]) mapaAntes[chave] = [];
        mapaAntes[chave].push(g.onesignal_player_id);
      }
      if (a.hora === agora) {
        if (!mapaAgora[chave]) mapaAgora[chave] = [];
        mapaAgora[chave].push(g.onesignal_player_id);
      }
    });
  });

  // Envia "aula em 10min" — agrupado por matéria+horário
  for (const [chave, ids] of Object.entries(mapaAntes)) {
    const [hora, materia] = chave.split('|');
    const unicos = [...new Set(ids)];
    console.log('[aula-aviso] antes:', materia, 'às', hora, '→', unicos.length, 'aluno(s)');
    try {
      const r = await enviar(apiKey, appId, siteUrl, unicos, materia, 'antes', hoje, hora);
      if (r.status >= 400) console.error('[aula-aviso antes] erro:', r.status, r.corpo);
    } catch (e) {
      console.error('[aula-aviso antes] falha:', e.message);
    }
  }

  // Envia "aula começando" — agrupado por matéria+horário
  for (const [chave, ids] of Object.entries(mapaAgora)) {
    const [hora, materia] = chave.split('|');
    const unicos = [...new Set(ids)];
    console.log('[aula-aviso] agora:', materia, 'às', hora, '→', unicos.length, 'aluno(s)');
    try {
      const r = await enviar(apiKey, appId, siteUrl, unicos, materia, 'agora', hoje, hora);
      if (r.status >= 400) console.error('[aula-aviso agora] erro:', r.status, r.corpo);
    } catch (e) {
      console.error('[aula-aviso agora] falha:', e.message);
    }
  }

  if (!Object.keys(mapaAntes).length && !Object.keys(mapaAgora).length) {
    console.log('[aula-aviso] nenhuma aula nesse minuto');
  }
};
