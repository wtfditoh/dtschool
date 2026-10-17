/* agenda-logica.js — Hub Brain · Agenda reformulada (HOJE · SEMANA · TUDO)
   Módulo ES. A lógica pura (urgência, prioridade, sugestões, streak, "+ Rápido") está em agenda-core.js.
   Coleção Firestore `agenda` continua igual; campo novo e opcional: concluidaEm. */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, increment, getDoc, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import * as Core from "./agenda-core.js";

const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a",
    measurementId: "G-F7TG23TBTL"
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const userEmail = localStorage.getItem('dt_user_email');
const userType = localStorage.getItem('dt_user_type');
const primeiroNome = (localStorage.getItem('dt_user_name') || '').split(' ')[0];
const isLocal = () => userType === 'local';

/* ═══════════════ UTILITÁRIOS ═══════════════ */

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hojeStr = () => Core.dataLocal();
const tipoDe = (t) => Core.TIPOS[t.tipo] || Core.TIPOS.tarefa;
const matDe = (t) => t.materia || 'Geral';
const idDe = (t) => t.id_firebase || ('l' + t.criadoEm);

const S = {
    tarefas: [],
    carregou: false,
    view: ['hoje', 'semana', 'tudo'].includes(localStorage.getItem('hb_agenda_view')) ? localStorage.getItem('hb_agenda_view') : 'hoje',
    semana: hojeStr(),
    tudo: { status: 'pendentes', materia: 'todas', bim: 'todos' },
    fechados: new Set(),
    sugestoes: [],
    diaRender: hojeStr(),
    pushOk: false,
    tagSig: ''
};
const acharPorId = (id) => S.tarefas.find((t) => idDe(t) === id);

function toast(msg) {
    const el = $('toast-agenda');
    if (!el) return;
    el.innerText = msg;
    el.style.display = 'block';
    el.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.style.opacity = '0'; setTimeout(() => (el.style.display = 'none'), 300); }, 2600);
}

function lerJSON(chave, padrao) { try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch (e) { return padrao; } }
const lerMateriasObj = () => { const m = lerJSON('materias_db', null) || lerJSON('materias', []); return Array.isArray(m) ? m : []; };
const cfgMedia = () => { const m = Number(lerJSON('dt_config', {}).media); return isFinite(m) && m > 0 ? m : 6; };
function nomesMaterias() {
    const n = lerMateriasObj().map((m) => m && m.nome).filter(Boolean);
    return [...new Set(['Geral', ...n, ...S.tarefas.map((t) => t.materia).filter(Boolean)])];
}
const prazoTexto = (t) => Core.NOMES_DIA[Core.diaDaSemana(t.dataFim)] + ' ' + Core.formatCurto(t.dataFim);

/* ═══════════════ PERSISTÊNCIA (Firestore ou localStorage) ═══════════════ */

function salvarLocalStorage() { localStorage.setItem('dt_agenda', JSON.stringify(S.tarefas)); }

async function carregar() {
    if (isLocal()) {
        S.tarefas = lerJSON('dt_agenda', []);
    } else if (userEmail) {
        try {
            const snap = await getDocs(query(collection(db, 'agenda'), where('usuario', '==', userEmail)));
            S.tarefas = snap.docs.map((d) => ({ id_firebase: d.id, ...d.data() }));
        } catch (e) { console.error('[agenda] carregar:', e); toast('Sem conexão com a agenda'); }
    }
    S.carregou = true;
    S.carregadoEm = Date.now();
}

/** Aplica na hora (UI otimista) e persiste em seguida. */
function salvarCampos(t, campos) {
    Object.assign(t, campos);
    if (isLocal()) { salvarLocalStorage(); return Promise.resolve(); }
    if (!t.id_firebase) return Promise.resolve();
    return updateDoc(doc(db, 'agenda', t.id_firebase), campos).catch(async (e) => {
        console.error('[agenda] salvar:', e);
        toast('Não consegui salvar. Atualizando…');
        await carregar(); renderView();
    });
}

function obterPlayerId() {
    return new Promise((res) => {
        if (!window.OneSignalDeferred) return res(null);
        const limite = setTimeout(() => res(null), 1500);   // nunca trava a criação se o SDK não carregar
        window.OneSignalDeferred.push(async (OS) => {
            let id = null;
            try { id = OS.User.PushSubscription.id; } catch (e) {}
            if (!id) { try { id = OS.User.PushSubscription.token; } catch (e) {} }
            clearTimeout(limite); res(id || null);
        });
    });
}

async function criarTarefa(d) {
    const playerId = await obterPlayerId();
    const nova = {
        nome: d.nome, descricao: d.descricao || '', dataInicio: d.dataInicio, dataFim: d.dataFim,
        materia: d.materia || 'Geral', tipo: d.tipo || 'tarefa', bimestre: d.bimestre || '', imagem: d.imagem || '',
        concluida: false, usuario: userEmail || '', onesignal_player_id: playerId || null, criadoEm: Date.now()
    };
    if (isLocal()) { S.tarefas.push(nova); salvarLocalStorage(); }
    else {
        const ref = await addDoc(collection(db, 'agenda'), nova);
        S.tarefas.push({ id_firebase: ref.id, ...nova });
    }
    renderView();
    return nova;
}

/* ═══════════════ XP E CONQUISTAS (mesma regra de antes) ═══════════════ */

async function atualizarXPRanking(val) {
    if (isLocal() || !userEmail) return;
    try { await setDoc(doc(db, 'notas', userEmail), { xp: increment(val) }, { merge: true }); } catch (e) {}
}

const NOMES_CONQUISTAS = {
    organizado: { emoji: '📋', nome: 'Organizado', desc: 'Concluiu 5 tarefas' },
    produtivo: { emoji: '⚙️', nome: 'Produtivo', desc: 'Concluiu 20 tarefas' },
    maquina: { emoji: '🤖', nome: 'Máquina', desc: 'Concluiu 50 tarefas' },
    implacavel: { emoji: '💣', nome: 'Implacável', desc: 'Concluiu 100 tarefas' },
    perfeccionista: { emoji: '⭐', nome: 'Perfeccionista', desc: 'Todas as tarefas do dia' }
};

function mostrarPopupConquista(id) {
    const c = NOMES_CONQUISTAS[id]; if (!c) return;
    const p = document.createElement('div');
    p.className = 'ag-conquista';
    p.innerHTML = '<div class="ag-conq-emoji">' + c.emoji + '</div><div><div class="ag-conq-topo">CONQUISTA!</div><div class="ag-conq-nome">' + esc(c.nome) + '</div><div class="ag-conq-desc">' + esc(c.desc) + '</div></div>';
    document.body.appendChild(p);
    setTimeout(() => p.classList.add('on'), 50);
    setTimeout(() => { p.classList.remove('on'); setTimeout(() => p.remove(), 400); }, 3500);
}

async function verificarConquistasTarefas() {
    if (!userEmail || isLocal()) return;
    try {
        const snap = await getDoc(doc(db, 'notas', userEmail));
        if (!snap.exists()) return;
        const atuais = snap.data().conquistas || [];
        const hoje = hojeStr();
        const concl = S.tarefas.filter((t) => t.concluida).length;
        const doDia = S.tarefas.filter((t) => hoje >= t.dataInicio && hoje <= t.dataFim);
        const novas = [];
        [{ id: 'organizado', min: 5 }, { id: 'produtivo', min: 20 }, { id: 'maquina', min: 50 }, { id: 'implacavel', min: 100 }]
            .forEach((c) => { if (concl >= c.min && !atuais.includes(c.id)) novas.push(c.id); });
        if (doDia.length > 0 && doDia.every((t) => t.concluida) && !atuais.includes('perfeccionista')) novas.push('perfeccionista');
        if (novas.length) {
            await updateDoc(doc(db, 'notas', userEmail), { conquistas: arrayUnion(...novas) });
            novas.forEach((id, i) => setTimeout(() => mostrarPopupConquista(id), i * 1000));
        }
    } catch (e) {}
}

// grava o id do push só nas tarefas que ainda não têm (antes regravava TODAS a cada visita)
function salvarPlayerIdNasAgendas() {
    if (!userEmail || isLocal() || !window.OneSignalDeferred) return;
    window.OneSignalDeferred.push(async (OS) => {
        try {
            let pid = null;
            try { pid = OS.User.PushSubscription.id; } catch (e) {}
            if (!pid) { try { pid = OS.User.PushSubscription.token; } catch (e) {} }
            if (!pid) return;
            const pend = S.tarefas.filter((t) => t.id_firebase && t.onesignal_player_id !== pid);
            await Promise.all(pend.map((t) => { t.onesignal_player_id = pid; return updateDoc(doc(db, 'agenda', t.id_firebase), { onesignal_player_id: pid }); }));
        } catch (e) {}
    });
}

/* ═══════════════ AÇÕES DE TAREFA ═══════════════ */

async function alternarConcluida(t) {
    const nova = !t.concluida;
    const xp = tipoDe(t).xp;
    const p = salvarCampos(t, { concluida: nova, concluidaEm: nova ? Date.now() : null });
    renderView();
    await p;
    await atualizarXPRanking(nova ? xp : -xp);
    if (nova) { toast('✓ +' + xp + ' XP'); await verificarConquistasTarefas(); }
}

function abrirFoco(o) {
    localStorage.setItem('hb_foco_prefill', JSON.stringify({
        materia: o.materia || 'Geral', minutos: o.minutos || 25, tarefaId: o.id || null, tarefaNome: o.nome || '', tipo: o.tipo || '', ts: Date.now()
    }));
    location.href = 'foco.html';
}
const focarTarefa = (t) => abrirFoco({ materia: matDe(t), minutos: Core.minutosFoco(t), id: idDe(t), nome: t.nome, tipo: t.tipo });

function explicarTarefa(t) {
    const texto = [
        'Matéria: ' + matDe(t),
        'Atividade (' + tipoDe(t).label + '): ' + t.nome,
        t.descricao ? 'Detalhes: ' + t.descricao : '',
        'Prazo: ' + Core.formatCurto(t.dataFim),
        '',
        'Me explique o conteúdo que preciso dominar para essa atividade, com exemplos e as pegadinhas mais comuns.'
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
    localStorage.setItem('hb_ia_prefill', JSON.stringify({ modo: 'explicador', texto, auto: true }));
    location.href = 'estudos.html';
}

async function reagendarTarefa(t, novoFim) {
    await salvarCampos(t, Core.reagendarPara(t, novoFim));
    renderView();
    toast('📅 Reagendada para ' + prazoTexto({ dataFim: novoFim }));
}

async function reagendarVarias(ids, destino) {
    const alvo = ids.map(acharPorId).filter(Boolean);
    await Promise.all(alvo.map((t) => salvarCampos(t, Core.reagendarPara(t, destino))));
    renderView();
    toast('📅 ' + alvo.length + (alvo.length === 1 ? ' tarefa reagendada' : ' tarefas reagendadas') + ' para ' + prazoTexto({ dataFim: destino }));
}

/* ═══════════════ COMPONENTES DE TELA ═══════════════ */

function linhaTarefa(t) {
    const hoje = hojeStr(), u = Core.urgencia(t, hoje), tipo = tipoDe(t), id = esc(idDe(t));
    const prazo = t.concluida ? '✓ Concluída' : u.rotulo;
    return '<div class="ag-t ag-n-' + u.nivel + '" data-id="' + id + '">' +
        '<div class="ag-t-em" aria-hidden="true">' + u.emoji + '</div>' +
        '<div class="ag-t-main" data-acao="abrir" data-id="' + id + '">' +
            '<div class="ag-t-nome' + (t.concluida ? ' feita' : '') + '">' + esc(t.nome) + '</div>' +
            '<div class="ag-t-meta"><span class="ag-prazo">' + esc(prazo) + '</span>' +
                '<span class="ag-mat" style="--cor:' + Core.corMateria(matDe(t)) + '">' + esc(matDe(t)) + '</span>' +
                '<span>' + tipo.emoji + ' ' + esc(tipo.label) + '</span></div>' +
            (t.concluida ? '' :
                '<div class="ag-pills">' +
                    '<button class="ag-pill" data-acao="focar" data-id="' + id + '">▶ Focar</button>' +
                    '<button class="ag-pill" data-acao="explicar" data-id="' + id + '">🤖 Explicar</button>' +
                '</div>') +
        '</div>' +
        '<button class="ag-check' + (t.concluida ? ' on' : '') + '" data-acao="concluir" data-id="' + id + '" aria-label="' + (t.concluida ? 'Reabrir' : 'Concluir') + ' ' + esc(t.nome) + '">' + (t.concluida ? '✓' : '') + '</button>' +
    '</div>';
}

const saudacao = () => { const h = new Date().getHours(); return (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite') + (primeiroNome ? ', ' + esc(primeiroNome) : ''); };
const lembreteAtivo = () => localStorage.getItem('hb_ag21_ativo') !== '0';

function botaoSino() {
    const on = lembreteAtivo();
    const estado = !on ? 'off' : S.pushOk ? 'on' : 'sem';
    const rotulo = !on ? 'Lembrete das 21h desligado' : S.pushOk ? 'Lembrete das 21h ligado' : 'Lembrete das 21h ligado — toque para permitir notificações';
    return '<button class="ag-icon-btn ag-sino ' + estado + '" data-acao="sino" aria-label="' + rotulo + '" title="' + rotulo + '">' + (on ? '🔔' : '🔕') + (estado === 'sem' ? '<i class="ag-sino-ponto"></i>' : '') + '</button>';
}

/* ───────── HOJE ───────── */

function renderHoje() {
    const hoje = hojeStr(), T = S.tarefas;
    if (!S.carregou) { $('ag-v-hoje').innerHTML = '<div class="ag-card ag-carregando"><span class="ag-spin"></span> Carregando sua agenda…</div>'; return; }

    const resumo = Core.resumoDoDia(T, hoje);
    const prio = Core.escolherPrioridade(T, hoje);
    const streak = Core.calcularStreak(T, hoje);
    const feitasHoje = T.filter((t) => Core.concluidaNoDia(t, hoje));
    const prox = Core.proximas(T, hoje, prio ? idDe(prio.t) : null, 6, idDe);
    S.sugestoes = Core.gerarSugestoes({ todas: T, hoje, materias: lerMateriasObj(), mediaMin: cfgMedia(), streak, concluidasHoje: feitasHoje.length });

    let h = '<div class="ag-topo"><div><div class="ag-saud">' + saudacao() + ' 👋</div><div class="ag-data">' + esc(Core.rotuloDiaLongo(hoje)) + '</div></div>' +
        '<div class="ag-topo-acoes">' + botaoSino() + '<button class="ag-icon-btn" data-acao="share" aria-label="Compartilhar agenda">📤</button></div></div>';

    // progresso do dia + streak
    h += '<div class="ag-card ag-prog"><div class="ag-prog-topo"><div><div class="ag-prog-titulo">Progresso de hoje</div><div class="ag-prog-sub">' +
        (resumo.total ? resumo.feitas + ' de ' + resumo.total + (resumo.total === 1 ? ' feita' : ' feitas') : 'Nada marcado para hoje') + '</div></div>' +
        '<div class="ag-streak' + (streak ? '' : ' off') + '" title="Dias seguidos concluindo tarefas">🔥 <b>' + streak + '</b><small>' + (streak === 1 ? 'dia' : 'dias') + '</small></div></div>' +
        '<div class="ag-bar"><i style="width:' + resumo.pct + '%"></i></div><div class="ag-prog-pct">' + resumo.pct + '%</div></div>';

    // prioridade inteligente
    if (prio) {
        const t = prio.t, u = Core.urgencia(t, hoje), id = esc(idDe(t));
        h += '<div class="ag-card ag-prio ag-n-' + u.nivel + '"><div class="ag-prio-rotulo">⭐ PRIORIDADE AGORA</div>' +
            '<div class="ag-prio-titulo" data-acao="abrir" data-id="' + id + '"><span>' + u.emoji + '</span> ' + esc(t.nome) + '</div>' +
            '<div class="ag-prio-meta">' + tipoDe(t).emoji + ' ' + esc(tipoDe(t).label) + ' · ' + esc(matDe(t)) + ' · ' + esc(u.rotulo) + '</div>' +
            '<div class="ag-prio-motivo">' + esc(prio.motivo) + '</div>' +
            '<div class="ag-prio-acoes"><button class="ag-btn pri" data-acao="focar" data-id="' + id + '">▶ Focar ' + Core.minutosFoco(t) + ' min</button>' +
            '<button class="ag-btn" data-acao="explicar" data-id="' + id + '">🤖 Explicar</button>' +
            '<button class="ag-btn ghost" data-acao="concluir" data-id="' + id + '">✓ Concluir</button></div></div>';
    } else if (resumo.total > 0 && resumo.pendentes === 0) {
        h += '<div class="ag-card ag-prio ag-vazio-card"><div class="ag-prio-titulo">🎉 Dia fechado!</div><div class="ag-prio-motivo">Tudo de hoje está feito. Que tal adiantar algo de amanhã?</div></div>';
    } else {
        h += '<div class="ag-card ag-prio ag-vazio-card"><div class="ag-prio-titulo">☀️ Sem urgências agora</div><div class="ag-prio-motivo">Nada precisa de você hoje. Aproveite para se adiantar.</div>' +
            '<div class="ag-prio-acoes"><button class="ag-btn pri" data-acao="rapido">+ Rápido</button></div></div>';
    }

    // atrasadas
    if (resumo.atrasadas.length) {
        h += '<div class="ag-card ag-atrasadas"><div><b>⚠️ ' + resumo.atrasadas.length + (resumo.atrasadas.length === 1 ? ' atrasada' : ' atrasadas') + '</b><span>Reagende e siga em frente</span></div>' +
            '<button class="ag-btn" data-acao="reagendar-abrir">Reagendar</button></div>';
    }

    // sugestões
    if (S.sugestoes.length) {
        h += '<div class="ag-sec">💡 Sugestões</div>' + S.sugestoes.map((s, i) =>
            '<div class="ag-card ag-sug"><div class="ag-sug-em">' + s.emoji + '</div><div class="ag-sug-txt"><b>' + esc(s.titulo) + '</b><span>' + esc(s.texto) + '</span></div>' +
            (s.acao ? '<button class="ag-btn mini" data-acao="sugestao" data-i="' + i + '">' + esc(s.acao.rotulo) + '</button>' : '') + '</div>').join('');
    }

    // próximas
    if (prox.length) {
        h += '<div class="ag-sec">Próximas <button class="ag-link" data-acao="ver-tudo">ver tudo →</button></div><div class="ag-lista">' + prox.map((x) => linhaTarefa(x.t)).join('') + '</div>';
    }

    if (feitasHoje.length) {
        h += '<details class="ag-feitas"><summary>✓ Feitas hoje (' + feitasHoje.length + ')</summary><div class="ag-lista">' + feitasHoje.map(linhaTarefa).join('') + '</div></details>';
    }
    $('ag-v-hoje').innerHTML = h;
}

/* ───────── SEMANA ───────── */

function renderSemana() {
    const hoje = hojeStr(), dias = Core.diasDaSemana(S.semana);
    let h = '<div class="ag-sem-nav"><button class="ag-icon-btn" data-acao="sem-ant" aria-label="Semana anterior">‹</button>' +
        '<div class="ag-sem-titulo">' + esc(Core.rotuloSemana(S.semana)) + '</div>' +
        '<button class="ag-icon-btn" data-acao="sem-prox" aria-label="Próxima semana">›</button>' +
        '<button class="ag-pill" data-acao="sem-hoje">Hoje</button></div>' +
        '<div class="ag-dica">Segure uma tarefa e arraste para outro dia</div><div class="ag-semana" id="ag-semana">';
    dias.forEach((d) => {
        const ts = Core.tarefasDoDia(S.tarefas, d, hoje);
        const p = d.split('-');
        h += '<div class="ag-dia' + (d === hoje ? ' hoje' : '') + (d < hoje ? ' passado' : '') + '" data-dia="' + d + '">' +
            '<div class="ag-dia-topo"><span class="ag-dia-nome">' + Core.NOMES_DIA[Core.diaDaSemana(d)] + '</span><span class="ag-dia-num">' + (+p[2]) + '</span>' +
            (ts.length ? '<span class="ag-dia-cont">' + ts.length + '</span>' : '') +
            '<button class="ag-dia-add" data-acao="add-dia" data-dia="' + d + '" aria-label="Adicionar em ' + Core.formatCurto(d) + '">+</button></div><div class="ag-dia-lista">';
        if (!ts.length) h += '<div class="ag-dia-livre">livre</div>';
        ts.forEach((t) => {
            const u = Core.urgencia(t, hoje), cont = t.dataFim !== d && t.dataInicio !== t.dataFim;
            h += '<div class="ag-ct ag-n-' + u.nivel + (cont ? ' cont' : '') + '" data-id="' + esc(idDe(t)) + '" data-dia="' + d + '" data-drag="' + (t.concluida ? 0 : 1) + '">' +
                '<span class="ag-ct-em">' + u.emoji + '</span><div class="ag-ct-txt"><div class="ag-ct-nome' + (t.concluida ? ' feita' : '') + '">' + esc(t.nome) + '</div>' +
                '<div class="ag-ct-sub"><i class="ag-dot" style="background:' + Core.corMateria(matDe(t)) + '"></i>' + esc(matDe(t)) + ' ' + tipoDe(t).emoji + (cont ? ' ↦' : '') + '</div></div>' +
                (t.concluida ? '' : '<span class="ag-grip" aria-hidden="true">⋮⋮</span>') + '</div>';
        });
        h += '</div></div>';
    });
    $('ag-v-semana').innerHTML = h + '</div>';
}

/* ───────── TUDO ───────── */

function renderTudo() {
    const hoje = hojeStr(), ano = Number(hoje.slice(0, 4)), f = S.tudo;
    const base = Core.filtrarTudo(S.tarefas, { status: 'todas', materia: f.materia, bim: f.bim }, hoje, ano);
    const cont = {
        pendentes: base.filter((t) => !t.concluida).length,
        atrasadas: base.filter((t) => !t.concluida && t.dataFim < hoje).length,
        concluidas: base.filter((t) => t.concluida).length,
        todas: base.length
    };
    const chip = (acao, val, txt, ativo) => '<button class="ag-fchip' + (ativo ? ' on' : '') + '" data-acao="' + acao + '" data-val="' + esc(val) + '">' + txt + '</button>';
    let h = '<div class="ag-filtros">' +
        ['pendentes:Pendentes', 'atrasadas:Atrasadas', 'concluidas:Concluídas', 'todas:Todas'].map((s) => { const [k, l] = s.split(':'); return chip('filtro-status', k, l + ' <b>' + cont[k] + '</b>', f.status === k); }).join('') + '</div>' +
        '<div class="ag-filtros">' + ['todos', '1', '2', '3', '4'].map((b) => chip('filtro-bim', b, b === 'todos' ? 'Todos os bim.' : b + 'º BIM', f.bim === b)).join('') + '</div>';
    const mats = [...new Set(S.tarefas.map(matDe))];
    if (mats.length > 1) h += '<div class="ag-filtros">' + chip('filtro-mat', 'todas', 'Todas', f.materia === 'todas') + mats.map((m) => chip('filtro-mat', m, esc(m), f.materia === m)).join('') + '</div>';

    const grupos = Core.agruparPorMateria(Core.filtrarTudo(S.tarefas, f, hoje, ano), hoje);
    if (!grupos.length) {
        h += '<div class="ag-card ag-vazio"><div class="ag-vazio-em">📭</div><b>Nada por aqui</b><span>Nenhuma atividade com esses filtros.</span></div>';
    } else {
        h += grupos.map((g) => {
            const fechado = S.fechados.has(g.nome);
            return '<div class="ag-grupo"><button class="ag-grupo-head" data-acao="grupo" data-val="' + esc(g.nome) + '">' +
                '<i class="ag-dot" style="background:' + Core.corMateria(g.nome) + '"></i><span class="ag-grupo-nome">' + esc(g.nome) + '</span>' +
                '<span class="ag-grupo-cont">' + g.pendentes + ' pendente' + (g.pendentes === 1 ? '' : 's') + '</span><span class="ag-seta">' + (fechado ? '→' : '↓') + '</span></button>' +
                (fechado ? '' : '<div class="ag-lista">' + g.tarefas.map(linhaTarefa).join('') + '</div>') + '</div>';
        }).join('');
    }
    $('ag-v-tudo').innerHTML = h;
}

/* ───────── orquestração das views ───────── */

function renderView() {
    S.diaRender = hojeStr();
    const wrap = $('ag-wrap');
    wrap.classList.toggle('ag-largo', S.view === 'semana');
    document.querySelectorAll('.ag-view').forEach((v) => v.classList.toggle('ativa', v.id === 'ag-v-' + S.view));
    document.querySelectorAll('.ag-tab').forEach((b) => { const on = b.dataset.view === S.view; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    if (S.view === 'hoje') renderHoje();
    else if (S.view === 'semana') renderSemana();
    else renderTudo();
    agendarSyncTags();
}

function definirView(v) {
    S.view = v;
    localStorage.setItem('hb_agenda_view', v);
    renderView();
    window.scrollTo({ top: 0 });
}

/* ═══════════════ SHEETS (bottom sheet genérico) ═══════════════ */

let sheet = null;
function montarSheet() {
    if (sheet) return sheet;
    const ov = document.createElement('div');
    ov.className = 'ag-overlay';
    ov.innerHTML = '<div class="ag-sheet" role="dialog" aria-modal="true" tabindex="-1"><div class="ag-handle"></div>' +
        '<div class="ag-sheet-head"><div><h3></h3><p></p></div><button class="ag-x" aria-label="Fechar">✕</button></div>' +
        '<div class="ag-sheet-body"></div><div class="ag-sheet-foot"></div></div>';
    document.body.appendChild(ov);
    sheet = { ov, box: ov.querySelector('.ag-sheet'), h3: ov.querySelector('h3'), sub: ov.querySelector('.ag-sheet-head p'), body: ov.querySelector('.ag-sheet-body'), foot: ov.querySelector('.ag-sheet-foot'), aoFechar: null };
    ov.addEventListener('click', (e) => { if (e.target === ov) fecharSheet(); });
    ov.querySelector('.ag-x').addEventListener('click', fecharSheet);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ov.classList.contains('aberto')) fecharSheet(); });
    return sheet;
}
function abrirSheet(titulo, sub, corpoHtml, rodapeHtml, aoFechar) {
    montarSheet();
    sheet.h3.textContent = titulo;
    sheet.sub.textContent = sub || '';
    sheet.body.innerHTML = corpoHtml;
    sheet.foot.innerHTML = rodapeHtml || '';
    sheet.foot.style.display = rodapeHtml ? '' : 'none';
    sheet.aoFechar = aoFechar || null;
    sheet.ov.classList.add('aberto');
    document.body.classList.add('ag-travado');
    sheet.body.scrollTop = 0;
    return sheet;
}
function fecharSheet() {
    if (!sheet || !sheet.ov.classList.contains('aberto')) return;
    sheet.ov.classList.remove('aberto');
    document.body.classList.remove('ag-travado');
    const f = sheet.aoFechar; sheet.aoFechar = null;
    if (f) f();
}
const sheetAberto = () => !!(sheet && sheet.ov.classList.contains('aberto'));

/* ───────── "+ Rápido" ───────── */

const Q = { nome: '', data: '', tipo: 'tarefa', materia: 'Geral', manual: { data: false, tipo: false, materia: false }, auto: { data: false, tipo: false, materia: false }, dataPadrao: '' };

function chipsRapido() {
    const hoje = hojeStr(), amanha = Core.somarDias(hoje, 1), depois = Core.somarDias(hoje, 2);
    const rotDia = (d) => Core.NOMES_DIA[Core.diaDaSemana(d)].charAt(0) + Core.NOMES_DIA[Core.diaDaSemana(d)].slice(1).toLowerCase() + ' ' + (+d.split('-')[2]);
    const dc = (d, t) => '<button type="button" class="ag-fchip' + (Q.data === d ? ' on' : '') + '" data-q="data" data-val="' + d + '">' + t + '</button>';
    const outra = ![hoje, amanha, depois].includes(Q.data);
    const datas = dc(hoje, 'Hoje') + dc(amanha, 'Amanhã') + dc(depois, rotDia(depois)) +
        '<label class="ag-fchip ag-fdata' + (outra ? ' on' : '') + '">📅 ' + (outra ? esc(prazoTexto({ dataFim: Q.data })) : 'Outra') + '<input type="date" data-q="data-input" value="' + esc(Q.data) + '"></label>';
    const tipos = Object.keys(Core.TIPOS).map((k) => '<button type="button" class="ag-fchip' + (Q.tipo === k ? ' on' : '') + '" data-q="tipo" data-val="' + k + '">' + Core.TIPOS[k].emoji + ' ' + Core.TIPOS[k].label + '</button>').join('');
    const mats = nomesMaterias().map((m) => '<button type="button" class="ag-fchip' + (Q.materia === m ? ' on' : '') + '" data-q="materia" data-val="' + esc(m) + '"><i class="ag-dot" style="background:' + Core.corMateria(m) + '"></i>' + esc(m) + '</button>').join('');
    return '<div class="ag-q-rot">Prazo</div><div class="ag-filtros">' + datas + '</div><div class="ag-q-rot">Tipo</div><div class="ag-filtros">' + tipos + '</div><div class="ag-q-rot">Matéria</div><div class="ag-filtros">' + mats + '</div>';
}

function atualizarRapido() { const el = sheet && sheet.body.querySelector('#ag-q-chips'); if (el) el.innerHTML = chipsRapido(); }

function interpretarCampo(texto) {
    const hoje = hojeStr();
    const r = Core.interpretarRapido(texto, { hoje, materias: nomesMaterias().filter((m) => m !== 'Geral') });
    // só sobrescreve o que o aluno ainda não escolheu na mão; se o trecho foi apagado, volta ao padrão
    [['data', r.data, Q.dataPadrao], ['tipo', r.tipo, 'tarefa'], ['materia', r.materia, Q.materiaPadrao]].forEach(([k, v, padrao]) => {
        if (Q.manual[k]) return;
        if (v) { Q[k] = v; Q.auto[k] = true; }
        else if (Q.auto[k]) { Q[k] = padrao; Q.auto[k] = false; }
    });
    atualizarRapido();
    return r;
}

function nomeFinalRapido(texto) {
    const r = Core.interpretarRapido(texto, { hoje: hojeStr(), materias: nomesMaterias().filter((m) => m !== 'Geral') });
    const gen = (tipo, mat) => Core.TIPOS[tipo || 'tarefa'].label + ' de ' + (mat || 'Geral');
    if (r.nome === gen(r.tipo, r.materia) && r.nome !== texto.trim()) return gen(Q.tipo, Q.materia);   // nome gerado: acompanha os chips
    return r.nome || texto.trim();
}

function abrirRapido(opts) {
    opts = opts || {};
    Q.nome = opts.nome || '';
    Q.dataPadrao = opts.data || hojeStr();
    Q.data = Q.dataPadrao;
    Q.tipo = 'tarefa';
    Q.materiaPadrao = localStorage.getItem('hb_ag_ult_materia') || 'Geral';
    Q.materia = nomesMaterias().includes(Q.materiaPadrao) ? Q.materiaPadrao : 'Geral';
    Q.manual = { data: false, tipo: false, materia: false };
    Q.auto = { data: false, tipo: false, materia: false };
    abrirSheet('⚡ Adicionar rápido', opts.data && opts.data !== hojeStr() ? 'Para ' + prazoTexto({ dataFim: opts.data }) : 'Digite e pronto',
        '<input id="ag-q-nome" class="ag-input" type="text" maxlength="80" autocomplete="off" placeholder="Ex.: prova soc sexta" value="' + esc(Q.nome) + '">' +
        '<div class="ag-q-dica">Dica: escreva o dia, o tipo e a matéria que eu entendo (ex.: <i>trabalho mat quarta</i>).</div>' +
        '<div id="ag-q-chips">' + chipsRapido() + '</div>',
        '<button class="ag-bt ag-bt-sec" data-q="mais">Mais opções…</button><button class="ag-bt ag-bt-pri" data-q="add">Adicionar</button>');
    const inp = $('ag-q-nome');
    inp.addEventListener('input', () => interpretarCampo(inp.value));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmarRapido(); } });
    setTimeout(() => inp.focus(), 80);
}

async function confirmarRapido() {
    const inp = $('ag-q-nome');
    const texto = (inp && inp.value || '').trim();
    if (!texto) { if (inp) { inp.classList.add('erro'); inp.focus(); setTimeout(() => inp.classList.remove('erro'), 1200); } return; }
    const nome = nomeFinalRapido(texto);
    localStorage.setItem('hb_ag_ult_materia', Q.materia);
    fecharSheet();
    await criarTarefa({ nome, dataInicio: Q.data, dataFim: Q.data, materia: Q.materia, tipo: Q.tipo });
    toast('✓ ' + nome + ' · ' + prazoTexto({ dataFim: Q.data }));
}

/* ───────── detalhes da tarefa ───────── */

function abrirDetalhes(t) {
    const hoje = hojeStr(), u = Core.urgencia(t, hoje), tipo = tipoDe(t), id = esc(idDe(t));
    const periodo = t.dataInicio !== t.dataFim ? Core.formatCurto(t.dataInicio) + ' → ' + Core.formatCurto(t.dataFim) : Core.formatCurto(t.dataFim);
    const img = t.imagem && String(t.imagem).startsWith('data:image/') ? '<img class="ag-det-img" src="' + t.imagem + '" alt="">' : '';
    const corpo = '<div class="ag-det-tags"><span class="ag-fchip on">' + u.emoji + ' ' + esc(t.concluida ? 'Concluída' : u.rotulo) + '</span><span class="ag-fchip">' + tipo.emoji + ' ' + esc(tipo.label) + '</span>' +
        '<span class="ag-fchip"><i class="ag-dot" style="background:' + Core.corMateria(matDe(t)) + '"></i>' + esc(matDe(t)) + '</span>' + (t.bimestre ? '<span class="ag-fchip">' + esc(t.bimestre) + 'º BIM</span>' : '') + '</div>' +
        '<div class="ag-det-linha">📅 Prazo <b>' + esc(periodo) + '</b></div>' +
        (t.descricao ? '<div class="ag-det-desc">' + esc(t.descricao) + '</div>' : '') + img +
        (t.concluida ? '' :
            '<div class="ag-q-rot">Reagendar</div><div class="ag-filtros"><button class="ag-fchip" data-acao="reag" data-id="' + id + '" data-val="' + hoje + '">Hoje</button>' +
            '<button class="ag-fchip" data-acao="reag" data-id="' + id + '" data-val="' + Core.somarDias(hoje, 1) + '">Amanhã</button>' +
            '<button class="ag-fchip" data-acao="reag" data-id="' + id + '" data-val="' + Core.somarDias(hoje, 7) + '">+1 semana</button>' +
            '<label class="ag-fchip ag-fdata">📅 Outro dia<input type="date" data-acao-change="reag-data" data-id="' + id + '"></label></div>') +
        '<button class="ag-excluir" data-acao="excluir" data-id="' + id + '">🗑 Excluir atividade</button>';
    const rodape = t.concluida
        ? '<button class="ag-bt ag-bt-sec" data-acao="concluir" data-id="' + id + '" data-fechar="1">↩ Reabrir</button>'
        : '<button class="ag-bt ag-bt-sec" data-acao="focar" data-id="' + id + '">▶ Focar</button><button class="ag-bt ag-bt-sec" data-acao="explicar" data-id="' + id + '">🤖 Explicar</button><button class="ag-bt ag-bt-pri" data-acao="concluir" data-id="' + id + '" data-fechar="1">✓ Concluir</button>';
    abrirSheet(t.nome, tipo.label + ' · ' + matDe(t), corpo, rodape);
}

/* ───────── reagendar (lembrete das 21h e card de atrasadas) ───────── */

function abrirReagendar() {
    const hoje = hojeStr(), lista = Core.vencidasOuHoje(S.tarefas, hoje).sort((a, b) => (a.dataFim < b.dataFim ? -1 : 1));
    if (!lista.length) { toast('🎉 Nada pendente para reagendar'); return; }
    const corpo = '<div class="ag-q-dica">Marque o que você não conseguiu fazer. Eu movo o prazo para amanhã.</div><div class="ag-reag-lista">' +
        lista.map((t) => '<label class="ag-reag-item"><input type="checkbox" checked data-reag-id="' + esc(idDe(t)) + '"><span class="ag-reag-em">' + Core.urgencia(t, hoje).emoji + '</span><span class="ag-reag-txt"><b>' + esc(t.nome) + '</b><i>' + esc(matDe(t)) + ' · ' + esc(Core.urgencia(t, hoje).rotulo) + '</i></span></label>').join('') + '</div>';
    abrirSheet('🌙 Reagendar para amanhã', lista.length + (lista.length === 1 ? ' tarefa pendente' : ' tarefas pendentes'), corpo,
        '<button class="ag-bt ag-bt-sec" data-reag="cancelar">Agora não</button><button class="ag-bt ag-bt-pri" data-reag="ok">Reagendar</button>');
}

/* ═══════════════ LEMBRETE DAS 21h (banner dentro do app) ═══════════════ */

let banner = null;
function esconderBanner() { if (banner) { banner.classList.remove('on'); } }
function mostrarBanner(n) {
    if (!banner) {
        banner = document.createElement('div');
        banner.className = 'ag-banner';
        document.body.appendChild(banner);
        banner.addEventListener('click', (e) => {
            const b = e.target.closest('[data-banner]'); if (!b) return;
            esconderBanner();
            localStorage.setItem('hb_ag21_dispensado', hojeStr());
            if (b.dataset.banner === 'ok') abrirReagendar();
        });
    }
    banner.innerHTML = '<div class="ag-banner-txt"><b>🌙 ' + n + (n === 1 ? ' tarefa pendente' : ' tarefas pendentes') + '.</b><span>Reagendar pra amanhã?</span></div>' +
        '<div class="ag-banner-acoes"><button class="ag-btn ghost" data-banner="nao">Agora não</button><button class="ag-btn pri" data-banner="ok">Reagendar</button></div>';
    requestAnimationFrame(() => banner.classList.add('on'));
}

function checarLembrete21(forcar) {
    if (!S.carregou || (!forcar && (!lembreteAtivo() || sheetAberto()))) return;
    const hoje = hojeStr();
    if (!forcar && (!Core.jaPassouDas21(new Date()) || localStorage.getItem('hb_ag21_dispensado') === hoje)) return;
    const pend = Core.vencidasOuHoje(S.tarefas, hoje);
    if (pend.length) mostrarBanner(pend.length); else esconderBanner();
}

/* ───────── push (OneSignal): tags que o agendador das 21h usa ───────── */

function agendarSyncTags() { clearTimeout(agendarSyncTags._t); agendarSyncTags._t = setTimeout(sincronizarTags, 800); }
function sincronizarTags() {
    if (!window.OneSignalDeferred || isLocal() || !S.carregou) return;
    const ativo = lembreteAtivo(), r = Core.resumoParaTags(S.tarefas, hojeStr());
    const sig = [ativo, r.dia, r.pendentes > 0 ? r.tagN : 0].join('|');
    if (sig === S.tagSig) return;
    S.tagSig = sig;
    window.OneSignalDeferred.push(async (OS) => {
        try {
            await OS.User.addTags({ agenda21h: ativo ? '1' : '0' });
            if (ativo && r.pendentes > 0) await OS.User.addTags({ pend_dia: r.dia, pend_n: r.tagN });
            else await OS.User.removeTags(['pend_dia', 'pend_n']);
        } catch (e) { console.warn('[agenda] tags:', e); }
    });
}

function lerPermissaoPush() {
    if (!window.OneSignalDeferred) return;
    window.OneSignalDeferred.push(async (OS) => { try { S.pushOk = !!OS.Notifications.permission; } catch (e) {} if (S.view === 'hoje' && S.carregou) renderHoje(); });
}

async function alternarSino() {
    const on = lembreteAtivo();
    if (on && S.pushOk) {                       // ligado e com permissão → desliga
        localStorage.setItem('hb_ag21_ativo', '0');
        toast('🔕 Lembrete das 21h desligado');
    } else if (on && !S.pushOk) {               // ligado, falta permissão → pede
        pedirPermissaoPush();
    } else {                                    // desligado → liga e pede permissão
        localStorage.setItem('hb_ag21_ativo', '1');
        toast('🔔 Lembrete das 21h ligado');
        pedirPermissaoPush();
    }
    S.tagSig = '';
    renderView();
}
function pedirPermissaoPush() {
    if (!window.OneSignalDeferred) { toast('Notificações indisponíveis neste navegador'); return; }
    window.OneSignalDeferred.push(async (OS) => {
        try { await OS.Notifications.requestPermission(); S.pushOk = !!OS.Notifications.permission; } catch (e) {}
        toast(S.pushOk ? '🔔 Push ativado! Aviso às 21h' : 'Permita as notificações do navegador para receber o push');
        S.tagSig = ''; renderView();
    });
}

/* ═══════════════ DRAG & DROP DA SEMANA (pointer events: mouse e toque) ═══════════════ */

let drag = null;
const HOLD_MS = 300;

function dragLimpar() {
    if (!drag) return;
    clearTimeout(drag.timer); cancelAnimationFrame(drag.raf);
    if (drag.ghost) drag.ghost.remove();
    if (drag.el) drag.el.classList.remove('arrastando');
    document.querySelectorAll('.ag-dia.alvo').forEach((d) => d.classList.remove('alvo'));
    document.body.classList.remove('ag-dragging');
    drag = null;
}
function dragAtivar() {
    if (!drag || drag.ativo) return;
    drag.ativo = true;
    const r = drag.el.getBoundingClientRect();
    drag.dx = drag.x0 - r.left; drag.dy = drag.y0 - r.top;
    const g = drag.el.cloneNode(true);
    g.classList.add('ag-ghost');
    g.style.width = r.width + 'px';
    document.body.appendChild(g);
    drag.ghost = g;
    drag.el.classList.add('arrastando');
    document.body.classList.add('ag-dragging');
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
    dragFrame();
    dragPosicionar();
}
function dragPosicionar() {
    if (!drag || !drag.ativo) return;
    drag.ghost.style.transform = 'translate(' + (drag.x - drag.dx) + 'px,' + (drag.y - drag.dy) + 'px)';
    const sob = document.elementFromPoint(drag.x, drag.y);
    const dia = sob && sob.closest ? sob.closest('.ag-dia') : null;
    document.querySelectorAll('.ag-dia.alvo').forEach((d) => { if (d !== dia) d.classList.remove('alvo'); });
    if (dia) dia.classList.add('alvo');
    drag.alvo = dia ? dia.dataset.dia : null;
}
function dragFrame() {                          // rolagem automática perto das bordas
    if (!drag || !drag.ativo) return;
    const borda = 90, v = 14;
    if (drag.y < borda + 70) window.scrollBy(0, -v);
    else if (drag.y > window.innerHeight - borda) window.scrollBy(0, v);
    dragPosicionar();
    drag.raf = requestAnimationFrame(dragFrame);
}

document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest && e.target.closest('.ag-ct[data-drag="1"]');
    if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
    dragLimpar();
    drag = { el, id: el.dataset.id, origem: el.dataset.dia, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, pid: e.pointerId, tipo: e.pointerType, ativo: false, houve: false };
    if (e.pointerType !== 'mouse') drag.timer = setTimeout(dragAtivar, HOLD_MS);     // toque: segurar para arrastar (senão é rolagem)
});
document.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    drag.x = e.clientX; drag.y = e.clientY;
    if (!drag.ativo) {
        const dist = Math.hypot(drag.x - drag.x0, drag.y - drag.y0);
        if (drag.tipo === 'mouse') { if (dist > 5) dragAtivar(); }
        else if (dist > 10) dragLimpar();                                              // mexeu antes de segurar: era rolagem
        return;
    }
    dragPosicionar();
});
document.addEventListener('touchmove', (e) => { if (drag && drag.ativo && e.cancelable) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', (e) => { if (e.target.closest && e.target.closest('.ag-ct')) e.preventDefault(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drag) dragLimpar(); });
const dragFim = async (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    const d = drag, solto = e.type === 'pointerup';
    if (d.ativo) {
        d.houve = true;
        window.__agDragHouve = true; setTimeout(() => { window.__agDragHouve = false; }, 50);   // engole o click que vem logo depois
        const destino = d.alvo, origem = d.origem, id = d.id;
        dragLimpar();
        if (solto && destino && destino !== origem) {
            const t = acharPorId(id);
            if (t) {
                await salvarCampos(t, Core.moverDias(t, Core.diffDias(origem, destino)));
                renderView();
                toast('📅 Movida para ' + prazoTexto({ dataFim: destino }));
            }
        }
    } else dragLimpar();
};
document.addEventListener('pointerup', dragFim);
document.addEventListener('pointercancel', dragFim);

/* ═══════════════ CLIQUES (delegação) ═══════════════ */

document.addEventListener('click', (e) => {
    if (window.__agDragHouve) { e.preventDefault(); e.stopPropagation(); return; }

    // sheets: "+ Rápido"
    const q = e.target.closest('[data-q]');
    if (q && sheet && sheet.ov.contains(q)) {
        const k = q.dataset.q;
        if (k === 'add') confirmarRapido();
        else if (k === 'mais') {
            const texto = ($('ag-q-nome') || {}).value || '';
            const dados = { nome: nomeFinalRapido(texto), data: Q.data, tipo: Q.tipo, materia: Q.materia };
            fecharSheet(); window.abrirModalAgendaHoje(dados);
        } else if (k === 'data-input') { /* o change cuida */ }
        else { Q[k] = q.dataset.val; Q.manual[k] = true; atualizarRapido(); }
        return;
    }
    // sheet de reagendar
    const rg = e.target.closest('[data-reag]');
    if (rg) {
        if (rg.dataset.reag === 'cancelar') { localStorage.setItem('hb_ag21_dispensado', hojeStr()); fecharSheet(); }
        else {
            const ids = [...sheet.body.querySelectorAll('input[data-reag-id]:checked')].map((i) => i.dataset.reagId);
            fecharSheet();
            if (ids.length) reagendarVarias(ids, Core.somarDias(hojeStr(), 1));
            localStorage.setItem('hb_ag21_dispensado', hojeStr());
        }
        return;
    }

    // abas
    const tab = e.target.closest('.ag-tab');
    if (tab) { definirView(tab.dataset.view); return; }

    const el = e.target.closest('[data-acao]');
    if (!el) return;
    const acao = el.dataset.acao, id = el.dataset.id, val = el.dataset.val;
    const t = id ? acharPorId(id) : null;

    switch (acao) {
        case 'concluir': if (t) { if (el.dataset.fechar) fecharSheet(); alternarConcluida(t); } break;
        case 'abrir': if (t) abrirDetalhes(t); break;
        case 'focar': if (t) focarTarefa(t); break;
        case 'explicar': if (t) explicarTarefa(t); break;
        case 'excluir': if (t) { fecharSheet(); window.removerTarefa(idDe(t)); } break;
        case 'reag': if (t) { fecharSheet(); reagendarTarefa(t, val); } break;
        case 'rapido': abrirRapido(); break;
        case 'add-dia': abrirRapido({ data: el.dataset.dia }); break;
        case 'ver-tudo': definirView('tudo'); break;
        case 'reagendar-abrir': abrirReagendar(); break;
        case 'sino': alternarSino(); break;
        case 'share': window.abrirCompartilhar(); break;
        case 'sugestao': {
            const s = S.sugestoes[Number(el.dataset.i)]; if (!s || !s.acao) break;
            if (s.acao.tipo === 'criar') {
                const d = s.acao.tarefa;
                criarTarefa({ nome: d.nome, dataInicio: d.data, dataFim: d.data, materia: d.materia, tipo: d.tipo }).then(() => toast('✓ ' + d.nome));
            } else if (s.acao.tipo === 'focar') abrirFoco({ materia: s.acao.materia, minutos: s.acao.minutos });
            else abrirRapido();
            break;
        }
        case 'sem-ant': S.semana = Core.somarDias(S.semana, -7); renderView(); break;
        case 'sem-prox': S.semana = Core.somarDias(S.semana, 7); renderView(); break;
        case 'sem-hoje': S.semana = hojeStr(); renderView(); break;
        case 'filtro-status': S.tudo.status = val; renderView(); break;
        case 'filtro-bim': S.tudo.bim = S.tudo.bim === val ? 'todos' : val; renderView(); break;
        case 'filtro-mat': S.tudo.materia = val; renderView(); break;
        case 'grupo': S.fechados.has(val) ? S.fechados.delete(val) : S.fechados.add(val); renderView(); break;
    }
});

document.addEventListener('change', (e) => {
    const inp = e.target;
    if (inp.matches && inp.matches('input[data-q="data-input"]')) {               // "Outra" data do +Rápido
        if (inp.value) { Q.data = inp.value; Q.manual.data = true; atualizarRapido(); }
    } else if (inp.matches && inp.matches('input[data-acao-change="reag-data"]')) {  // reagendar para outro dia (detalhes)
        const t = acharPorId(inp.dataset.id);
        if (t && inp.value) { fecharSheet(); reagendarTarefa(t, inp.value); }
    }
});

/* ═══════════════ MODAL COMPLETO (nova atividade com todos os campos) ═══════════════ */

let imagemBase64 = '';

window.carregarMateriasNoSelect = function () {
    const sel = $('tarefa-materia'); if (!sel) return;
    sel.innerHTML = '<option value="Geral">📚 Geral / Outros</option>';
    lerMateriasObj().forEach((m) => { if (m && m.nome) { const o = document.createElement('option'); o.value = m.nome; o.textContent = m.nome; sel.appendChild(o); } });
};

window.abrirModalAgendaHoje = function (pre) {
    pre = pre || {};
    const hoje = hojeStr();
    window.carregarMateriasNoSelect();
    $('tarefa-nome').value = pre.nome || '';
    $('tarefa-data-inicio').value = pre.data || hoje;
    $('tarefa-data-fim').value = pre.data || hoje;
    $('tarefa-desc').value = pre.descricao || '';
    if (pre.tipo) $('tarefa-tipo').value = pre.tipo;
    if (pre.materia && [...$('tarefa-materia').options].some((o) => o.value === pre.materia)) $('tarefa-materia').value = pre.materia;
    $('modal-agenda').style.display = 'flex';
    if (window.lucide) window.lucide.createIcons();
};

window.fecharModalAgenda = function () {
    $('modal-agenda').style.display = 'none';
    $('tarefa-nome').value = ''; $('tarefa-desc').value = '';
    $('tarefa-materia').value = 'Geral'; $('tarefa-tipo').value = 'tarefa'; $('tarefa-bimestre').value = '';
    $('preview-container').innerHTML = ''; imagemBase64 = '';
};

window.adicionarTarefa = async function () {
    const nome = $('tarefa-nome').value.trim();
    const dataInicio = $('tarefa-data-inicio').value, dataFim = $('tarefa-data-fim').value;
    if (!nome || !dataInicio || !dataFim || (!userEmail && !isLocal())) return;
    const dados = { nome, descricao: $('tarefa-desc').value.trim(), dataInicio, dataFim: dataFim < dataInicio ? dataInicio : dataFim, materia: $('tarefa-materia').value, tipo: $('tarefa-tipo').value, bimestre: $('tarefa-bimestre').value, imagem: imagemBase64 };
    window.fecharModalAgenda();
    await criarTarefa(dados);
    toast('✓ Atividade agendada!');
};

window.previewImg = function (input) {
    if (input.files && input.files[0]) {
        const r = new FileReader();
        r.onload = (ev) => { imagemBase64 = ev.target.result; $('preview-container').innerHTML = '<img src="' + imagemBase64 + '" style="width:100%;border-radius:14px;margin-top:12px;">'; };
        r.readAsDataURL(input.files[0]);
    }
};

/* ───────── excluir ───────── */

let _excluirId = null;
window.removerTarefa = function (id) { _excluirId = id; $('modal-confirm-del').style.display = 'flex'; };
window.cancelarDelete = function () { $('modal-confirm-del').style.display = 'none'; _excluirId = null; };
window.confirmarDelete = async function () {
    $('modal-confirm-del').style.display = 'none';
    const t = acharPorId(_excluirId); _excluirId = null;
    if (!t) return;
    if (t.concluida) await atualizarXPRanking(-tipoDe(t).xp);
    S.tarefas = S.tarefas.filter((x) => x !== t);
    if (isLocal()) salvarLocalStorage();
    else if (t.id_firebase) { try { await deleteDoc(doc(db, 'agenda', t.id_firebase)); } catch (e) { toast('Não consegui excluir'); await carregar(); } }
    renderView();
    toast('✓ Atividade excluída');
};

/* ═══════════════ COMPARTILHAR (imagem / WhatsApp) ═══════════════ */

let _shareConcluidas = false;

function tarefasParaCompartilhar() {
    const m = $('share-filtro-materia'), b = $('share-filtro-bimestre');
    const f = { status: 'todas', materia: m ? m.value : 'todas', bim: b ? b.value : 'todos' };
    const arr = Core.filtrarTudo(S.tarefas, f, hojeStr(), Number(hojeStr().slice(0, 4)));
    arr.sort((a, b2) => {
        if (a.concluida !== b2.concluida) return a.concluida ? 1 : -1;
        const oA = a.ordem !== undefined ? a.ordem : 9999, oB = b2.ordem !== undefined ? b2.ordem : 9999;
        return oA !== oB ? oA - oB : (a.dataFim < b2.dataFim ? -1 : a.dataFim > b2.dataFim ? 1 : 0);
    });
    return { arr, f };
}
const tituloCompartilhar = (f, padrao) => [f.materia !== 'todas' ? f.materia : '', f.bim !== 'todos' ? (Core.BIMESTRES[f.bim] || {}).label : ''].filter(Boolean).join(' • ') || padrao;

window.abrirCompartilhar = function () {
    _shareConcluidas = false;
    const sm = $('share-filtro-materia'), sb = $('share-filtro-bimestre');
    if (sm) { sm.innerHTML = '<option value="todas">Todas as matérias</option>'; [...new Set(S.tarefas.map(matDe))].forEach((m) => { const o = document.createElement('option'); o.value = m; o.textContent = m; sm.appendChild(o); }); sm.value = S.tudo.materia; }
    if (sb) sb.value = S.tudo.bim;
    window._renderSharePreview();
    $('modal-compartilhar').style.display = 'flex';
    if (window.lucide) window.lucide.createIcons();
};
window.fecharCompartilhar = function () { $('modal-compartilhar').style.display = 'none'; };
window.toggleShareConcluidas = function () {
    _shareConcluidas = !_shareConcluidas;
    const btn = $('btn-toggle-concluidas');
    if (btn) { btn.innerHTML = '<i data-lucide="' + (_shareConcluidas ? 'eye-off' : 'eye') + '"></i> ' + (_shareConcluidas ? 'Ocultar concluídas' : 'Mostrar concluídas'); if (window.lucide) window.lucide.createIcons(); }
    window._renderSharePreview();
};
window._renderSharePreview = function () {
    const { arr, f } = tarefasParaCompartilhar(), hoje = hojeStr();
    const pend = arr.filter((t) => !t.concluida), conc = arr.filter((t) => t.concluida);
    const itens = (lista) => lista.map((t) => {
        const u = Core.urgencia(t, hoje), tipo = tipoDe(t);
        const cor = t.concluida ? '#00d2ff' : u.diff <= 3 ? '#ff4444' : u.diff <= 7 ? '#ffbb33' : '#00c851';
        return '<div class="share-item"><div class="share-dot" style="background:' + cor + ';box-shadow:0 0 5px ' + cor + ';"></div><div style="flex:1;min-width:0;">' +
            '<div style="font-size:13px;font-weight:700;color:' + (t.concluida ? '#555' : 'white') + ';text-decoration:' + (t.concluida ? 'line-through' : 'none') + ';">' + tipo.emoji + ' ' + esc(t.nome) + '</div>' +
            (t.descricao ? '<div style="font-size:11px;color:#555;margin-top:2px;line-height:1.4;">' + esc(t.descricao) + '</div>' : '') +
            '<div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap;"><span style="font-size:9px;color:#8a2be2;background:rgba(138,43,226,0.1);border:1px solid rgba(138,43,226,0.15);padding:1px 7px;border-radius:20px;">' + esc(matDe(t)) + '</span>' +
            (t.bimestre ? '<span style="font-size:9px;color:#333;">' + esc(t.bimestre) + '° BIM</span>' : '') +
            (t.concluida ? '<span style="font-size:9px;color:#00d2ff;">✓ Concluída</span>' : '<span style="font-size:9px;color:' + cor + ';">📅 ' + Core.formatCurto(t.dataFim) + '</span>') + '</div></div></div>';
    }).join('');
    let html = '';
    if (pend.length) html += '<div style="font-size:9px;font-weight:800;letter-spacing:2px;color:#555;margin-bottom:8px;">PENDENTES (' + pend.length + ')</div>' + itens(pend);
    if (_shareConcluidas && conc.length) html += '<div style="font-size:9px;font-weight:800;letter-spacing:2px;color:#555;margin:14px 0 8px;">CONCLUÍDAS (' + conc.length + ')</div>' + itens(conc);
    if (!html) html = '<p style="color:#555;text-align:center;padding:20px;font-size:13px;">' + (conc.length ? 'Todas concluídas! 🎉' : 'Nenhuma atividade 🎉') + '</p>';
    const prev = $('share-preview');
    if (prev) prev.innerHTML = '<div style="font-size:16px;font-weight:900;color:white;margin-bottom:4px;">📚 Hub Brain</div><div style="font-size:10px;color:#555;letter-spacing:1.5px;margin-bottom:16px;text-transform:uppercase;">' + esc(tituloCompartilhar(f, 'Agenda Completa')) + '</div>' + html +
        '<div style="text-align:center;margin-top:16px;font-size:9px;color:#333;letter-spacing:2px;">hubbrain.netlify.app</div>';
};
window.gerarImagem = async function () {
    try {
        const canvas = await html2canvas($('share-preview'), { backgroundColor: '#0a0a0e', scale: 2 });
        const a = document.createElement('a'); a.download = 'agenda-hubbrain.png'; a.href = canvas.toDataURL(); a.click();
        toast('✓ Imagem salva!');
    } catch (e) { toast('Erro ao gerar imagem'); }
};
window.compartilharWpp = function () {
    const { arr, f } = tarefasParaCompartilhar(), hoje = hojeStr();
    const pend = arr.filter((t) => !t.concluida), conc = arr.filter((t) => t.concluida);
    let txt = '📚 *Hub Brain — ' + tituloCompartilhar(f, 'Agenda') + '*\n━━━━━━━━━━━━━━━\n\n';
    if (pend.length) {
        txt += '*📌 PENDENTES (' + pend.length + ')*\n';
        pend.slice(0, 10).forEach((t) => {
            txt += '\n' + Core.urgencia(t, hoje).emoji + ' ' + tipoDe(t).emoji + ' *' + t.nome + '*\n   📚 ' + matDe(t) + (t.bimestre ? ' • ' + t.bimestre + '° BIM' : '') + '\n   📅 Prazo: ' + Core.formatCurto(t.dataFim) + '\n';
        });
    }
    if (conc.length) {
        txt += '\n*✅ CONCLUÍDAS (' + conc.length + ')*\n';
        conc.slice(0, 6).forEach((t) => { txt += '\n✓ ~' + tipoDe(t).emoji + ' ' + t.nome + '~\n   📚 ' + matDe(t) + (t.bimestre ? ' • ' + t.bimestre + '° BIM' : '') + '\n'; });
    }
    txt += '\n━━━━━━━━━━━━━━━\n_Hub Brain — hubbrain.netlify.app_';
    window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
};

/* ═══════════════ INICIALIZAÇÃO ═══════════════ */

function tratarDeepLink() {
    const p = new URLSearchParams(location.search);
    if (p.get('reagendar') === '1') {
        history.replaceState(null, '', location.pathname);
        abrirReagendar();
    }
}

async function iniciar() {
    window.carregarMateriasNoSelect();
    renderView();                                   // mostra "carregando" já na view certa
    await carregar();
    renderView();
    tratarDeepLink();
    salvarPlayerIdNasAgendas();
    lerPermissaoPush();
    checarLembrete21();
    setInterval(() => {                             // vira o dia / chega 21h com o app aberto
        if (hojeStr() !== S.diaRender) renderView();
        checarLembrete21();
    }, 60000);
    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState !== 'visible') return;
        if (Date.now() - (S.carregadoEm || 0) > 60000) { await carregar(); renderView(); }
        else if (hojeStr() !== S.diaRender) renderView();
        checarLembrete21();
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();

// utilitários expostos para testes e depuração
window.__agenda = { S, Core, abrirRapido, abrirReagendar, checarLembrete21, idDe };
