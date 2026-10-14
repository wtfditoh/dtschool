/* hb-rapido.js — "Adicionar rápido" compartilhado pela Agenda e pela Home.
   Duas abas: 📝 Tarefa (com IA que entende frase livre) e 📸 Conteúdo (foto/arquivo por matéria).

   IA: usa a MESMA do Estudos (window.HBIA, de ia-config.js — carregado sob demanda), sem nunca abrir o
   modal de chave: se não houver login/chave ou a IA demorar mais de 9 s, cai no leitor local (agenda-core.js).

   API:
     abrirRapido({ aba, data, nome, salvarTarefa, onTarefa, onConteudo, maisOpcoes })
     enviarInline(texto, { onEstado })   → cria a tarefa direto, sem abrir o sheet (usado no card da Home) */
import { collection, addDoc, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./hb-firebase.js";
import * as Core from "./agenda-core.js";
import { salvarItens, imgbbConfigurado, extArquivo, emojiPorExt } from "./conteudos-upload.js";

/* ═══════════════ BÁSICO ═══════════════ */

const userEmail = () => localStorage.getItem('dt_user_email');
const isLocal = () => localStorage.getItem('dt_user_type') === 'local';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hojeStr = () => Core.dataLocal();
const lerJSON = (k, p) => { try { return JSON.parse(localStorage.getItem(k)) ?? p; } catch (e) { return p; } };
const prazoTexto = (d) => Core.NOMES_DIA[Core.diaDaSemana(d)] + ' ' + Core.formatCurto(d);
const MAX_ITENS = 15;

export function toast(msg, ms) {
    let el = document.querySelector('.hbr-toast');
    if (!el) { el = document.createElement('div'); el.className = 'hbr-toast'; document.body.appendChild(el); }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add('on'));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('on'), ms || 2600);
}

let materiasCache = null;
async function carregarMaterias(extra) {
    let nomes = [];
    const local = lerJSON('materias_db', null) || lerJSON('materias', []);
    if (Array.isArray(local)) nomes = local.map((m) => m && m.nome).filter(Boolean);
    if (!nomes.length && userEmail() && !isLocal()) {                 // aparelho que nunca abriu as Notas: busca no Firebase
        try {
            const snap = await getDoc(doc(db, 'notas', userEmail()));
            if (snap.exists() && Array.isArray(snap.data().materias)) nomes = snap.data().materias.map((m) => m && m.nome).filter(Boolean);
        } catch (e) {}
    }
    materiasCache = [...new Set(['Geral', ...nomes, ...(extra || [])])];
    return materiasCache;
}

/* ═══════════════ IA (a mesma do Estudos) ═══════════════ */

let iaCarregando = null;
function garantirIA() {
    if (window.HBIA) return Promise.resolve(true);
    if (iaCarregando) return iaCarregando;
    iaCarregando = new Promise((res) => {
        const s = document.createElement('script');
        s.src = 'ia-config.js';
        s.onload = () => res(!!window.HBIA);
        s.onerror = () => res(false);
        document.head.appendChild(s);
    });
    return iaCarregando;
}
export const iaLigada = () => localStorage.getItem('hb_ag_ia') !== '0';

/** Pede à IA para organizar o texto. Nunca lança: devolve null se não der (aí vale o leitor local). */
async function iaOrganizar(texto, materias) {
    if (!iaLigada() || !(await garantirIA())) return null;
    const ctx = { hoje: hojeStr(), materias: materias.filter((m) => m !== 'Geral') };
    try {
        const resp = await Promise.race([
            window.HBIA.chat({ messages: [{ role: 'user', content: Core.promptRapidoIA(texto, ctx) }], json: true, temperature: 0.1, maxTokens: 700, esforco: 'low' }, true),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 9000))
        ]);
        return Core.normalizarRespostaIA(window.HBIA.parseJSONRobusto(resp), ctx);
    } catch (e) {
        console.warn('[rapido] IA indisponível, usando o leitor local:', e && e.message);
        return null;
    }
}

/* ═══════════════ SALVAR TAREFA (padrão: coleção `agenda`, igual à Agenda) ═══════════════ */

function obterPlayerId() {
    return new Promise((res) => {
        if (!window.OneSignalDeferred) return res(null);
        const limite = setTimeout(() => res(null), 1500);
        window.OneSignalDeferred.push(async (OS) => {
            let id = null;
            try { id = OS.User.PushSubscription.id; } catch (e) {}
            if (!id) { try { id = OS.User.PushSubscription.token; } catch (e) {} }
            clearTimeout(limite); res(id || null);
        });
    });
}

async function salvarTarefaPadrao(d) {
    const nova = {
        nome: d.nome, descricao: d.descricao || '', dataInicio: d.dataInicio, dataFim: d.dataFim,
        materia: d.materia || 'Geral', tipo: d.tipo || 'tarefa', bimestre: '', imagem: '',
        concluida: false, usuario: userEmail() || '', onesignal_player_id: await obterPlayerId(), criadoEm: Date.now()
    };
    if (isLocal()) {
        const arr = lerJSON('dt_agenda', []); arr.push(nova);
        localStorage.setItem('dt_agenda', JSON.stringify(arr));
        return { tarefa: nova, desfazer: async () => localStorage.setItem('dt_agenda', JSON.stringify(lerJSON('dt_agenda', []).filter((t) => t.criadoEm !== nova.criadoEm))) };
    }
    const ref = await addDoc(collection(db, 'agenda'), nova);
    return { tarefa: { id_firebase: ref.id, ...nova }, desfazer: async () => deleteDoc(doc(db, 'agenda', ref.id)) };
}

async function salvar(opts, dados) {
    const r = await (opts.salvarTarefa || salvarTarefaPadrao)(dados);
    return r && r.tarefa ? r : { tarefa: r, desfazer: null };       // salvarTarefa da Agenda devolve só a tarefa
}

/* ═══════════════ INLINE (card da Home): digita → Enter → pronto ═══════════════ */

export async function enviarInline(texto, opts) {
    opts = opts || {};
    texto = String(texto || '').trim();
    if (!texto) return null;
    const materias = await carregarMaterias();
    const local = Core.interpretarRapido(texto, { hoje: hojeStr(), materias: materias.filter((m) => m !== 'Geral') });
    if (opts.onEstado) opts.onEstado('ia');
    const ia = await iaOrganizar(texto, materias);
    const f = Core.mesclarInterpretacao(local, ia);
    const dados = { nome: f.nome || Core.capitalizar(texto), tipo: f.tipo || 'tarefa', materia: f.materia || 'Geral' };
    dados.dataInicio = dados.dataFim = f.data || hojeStr();
    if (opts.onEstado) opts.onEstado('salvando');
    const r = await salvar(opts, dados);
    if (opts.onSalvo) opts.onSalvo(r.tarefa);
    return { ...dados, data: dados.dataFim, usouIA: !!ia, tarefa: r.tarefa, desfazer: r.desfazer };
}

/* ═══════════════ SHEET ═══════════════ */

const st = {
    aba: 'tarefa', opts: {}, materias: ['Geral'], ocupado: false, iaTexto: '', nomeIA: null,
    q: { data: '', tipo: 'tarefa', materia: 'Geral', dataPadrao: '', materiaPadrao: 'Geral', manual: {}, auto: {} },
    itens: [], matConteudo: 'Geral'
};
let ui = null;

function montar() {
    if (ui) return ui;
    const ov = document.createElement('div');
    ov.className = 'hbr-ov';
    ov.innerHTML =
        '<div class="hbr-sheet" role="dialog" aria-modal="true" aria-labelledby="hbr-titulo" tabindex="-1">' +
            '<div class="hbr-handle"></div>' +
            '<div class="hbr-head"><h3 id="hbr-titulo">⚡ Adicionar rápido</h3><button class="hbr-x" data-hbr="fechar" aria-label="Fechar">✕</button></div>' +
            '<div class="hbr-abas" role="tablist"><button data-aba="tarefa" role="tab">📝 Tarefa</button><button data-aba="conteudo" role="tab">📸 Conteúdo</button></div>' +
            '<div class="hbr-corpo">' +
                '<div class="hbr-painel" data-p="tarefa">' +
                    '<div class="hbr-linha-input"><input id="hbr-nome" class="hbr-input" type="text" maxlength="80" autocomplete="off" placeholder="Ex.: prova de filosofia segunda feira">' +
                    '<button class="hbr-ia" id="hbr-ia" data-hbr="ia" aria-label="Organizar com IA" title="Organizar com IA">✨</button></div>' +
                    '<div class="hbr-prev" id="hbr-prev"></div>' +
                    '<label class="hbr-switch"><input type="checkbox" id="hbr-ia-auto"><i></i><span>IA automática ao adicionar</span></label>' +
                    '<div id="hbr-chips"></div>' +
                '</div>' +
                '<div class="hbr-painel" data-p="conteudo">' +
                    '<div class="hbr-rot">Matéria</div><div class="hbr-chips" id="hbr-mats"></div>' +
                    '<div class="hbr-rot">Adicionar</div>' +
                    '<div class="hbr-fontes">' +
                        '<button data-fonte="camera"><span>📷</span><b>Tirar foto</b></button>' +
                        '<button data-fonte="galeria"><span>🖼️</span><b>Galeria</b></button>' +
                        '<button data-fonte="arquivo"><span>📎</span><b>Arquivo</b><small>PDF, Word…</small></button>' +
                    '</div>' +
                    '<div class="hbr-itens" id="hbr-itens"></div><div class="hbr-aviso" id="hbr-aviso"></div>' +
                    '<input type="file" hidden id="hbr-f-camera" accept="image/*" capture="environment">' +
                    '<input type="file" hidden id="hbr-f-galeria" accept="image/*" multiple>' +
                    '<input type="file" hidden id="hbr-f-arquivo" accept="application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar" multiple>' +
                '</div>' +
            '</div>' +
            '<div class="hbr-pe" id="hbr-pe"></div>' +
        '</div>';
    document.body.appendChild(ov);
    ui = { ov, box: ov.querySelector('.hbr-sheet'), nome: ov.querySelector('#hbr-nome'), prev: ov.querySelector('#hbr-prev'), chips: ov.querySelector('#hbr-chips'), mats: ov.querySelector('#hbr-mats'), itens: ov.querySelector('#hbr-itens'), aviso: ov.querySelector('#hbr-aviso'), pe: ov.querySelector('#hbr-pe'), iaBtn: ov.querySelector('#hbr-ia'), iaAuto: ov.querySelector('#hbr-ia-auto') };

    ov.addEventListener('click', onClick);
    ov.addEventListener('change', onChange);
    ui.nome.addEventListener('input', () => interpretar());
    ui.nome.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmarTarefa(); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ov.classList.contains('aberto') && !st.ocupado) fechar(); });
    return ui;
}

export function fechar() {
    if (!ui) return;
    ui.ov.classList.remove('aberto');
    document.body.classList.remove('hbr-travado');
    st.itens.forEach((it) => it.url && URL.revokeObjectURL(it.url));
    st.itens = [];
}
const aberto = () => !!(ui && ui.ov.classList.contains('aberto'));

export async function abrirRapido(opts) {
    opts = opts || {};
    montar();
    st.opts = opts;
    st.ocupado = false; st.iaTexto = ''; st.nomeIA = null;
    st.itens = []; st.aba = opts.aba === 'conteudo' ? 'conteudo' : 'tarefa';
    st.materias = materiasCache || ['Geral', ...(opts.materias || [])];
    const ultima = localStorage.getItem('hb_ag_ult_materia') || 'Geral';
    st.q = { data: opts.data || hojeStr(), dataPadrao: opts.data || hojeStr(), tipo: 'tarefa', materia: 'Geral', materiaPadrao: 'Geral', manual: {}, auto: {} };
    ui.nome.value = opts.nome || '';
    ui.iaAuto.checked = iaLigada();
    ui.aviso.textContent = '';
    ui.ov.classList.add('aberto');
    document.body.classList.add('hbr-travado');
    garantirIA();                                                    // já aquece a IA enquanto o aluno digita
    renderAba();

    st.materias = await carregarMaterias(opts.materias);
    if (st.materias.includes(ultima)) { st.q.materia = st.q.materiaPadrao = ultima; st.matConteudo = ultima; } else st.matConteudo = 'Geral';
    if (ui.nome.value) interpretar(); else renderTarefa();
    renderConteudo(); renderPe();
    if (st.aba === 'tarefa') setTimeout(() => ui.nome.focus(), 60);
}

function renderAba() {
    ui.ov.querySelectorAll('[data-aba]').forEach((b) => { const on = b.dataset.aba === st.aba; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    ui.ov.querySelectorAll('.hbr-painel').forEach((p) => p.classList.toggle('on', p.dataset.p === st.aba));
    renderTarefa(); renderConteudo(); renderPe();
}

/* ───────── aba TAREFA ───────── */

function chipsTarefa() {
    const q = st.q, hoje = hojeStr(), amanha = Core.somarDias(hoje, 1), depois = Core.somarDias(hoje, 2);
    const rotDia = (d) => { const n = Core.NOMES_DIA[Core.diaDaSemana(d)]; return n.charAt(0) + n.slice(1).toLowerCase() + ' ' + (+d.split('-')[2]); };
    const dc = (d, t) => '<button type="button" class="hbr-chip' + (q.data === d ? ' on' : '') + '" data-q="data" data-val="' + d + '">' + t + '</button>';
    const outra = ![hoje, amanha, depois].includes(q.data);
    const datas = dc(hoje, 'Hoje') + dc(amanha, 'Amanhã') + dc(depois, rotDia(depois)) +
        '<label class="hbr-chip hbr-data' + (outra ? ' on' : '') + '">📅 ' + (outra ? esc(prazoTexto(q.data)) : 'Outra') + '<input type="date" data-q="data-input" value="' + esc(q.data) + '"></label>';
    const tipos = Object.keys(Core.TIPOS).map((k) => '<button type="button" class="hbr-chip' + (q.tipo === k ? ' on' : '') + '" data-q="tipo" data-val="' + k + '">' + Core.TIPOS[k].emoji + ' ' + Core.TIPOS[k].label + '</button>').join('');
    const mats = st.materias.map((m) => '<button type="button" class="hbr-chip' + (q.materia === m ? ' on' : '') + '" data-q="materia" data-val="' + esc(m) + '"><i class="hbr-dot" style="background:' + Core.corMateria(m) + '"></i>' + esc(m) + '</button>').join('');
    return '<div class="hbr-rot">Prazo</div><div class="hbr-chips">' + datas + '</div><div class="hbr-rot">Tipo</div><div class="hbr-chips">' + tipos + '</div><div class="hbr-rot">Matéria</div><div class="hbr-chips">' + mats + '</div>';
}

function nomeParaMostrar() {
    const texto = ui.nome.value.trim();
    if (!texto) return '';
    if (st.nomeIA && st.iaTexto === texto) return st.nomeIA;
    const r = Core.interpretarRapido(texto, { hoje: hojeStr(), materias: st.materias.filter((m) => m !== 'Geral') });
    const gen = (tipo, mat) => Core.TIPOS[tipo || 'tarefa'].label + ' de ' + (mat || 'Geral');
    return r.nome === gen(r.tipo, r.materia) && r.nome !== Core.capitalizar(texto) ? gen(st.q.tipo, st.q.materia) : r.nome;   // nome gerado acompanha os chips
}

function renderPrev(statusIA) {
    const texto = ui.nome.value.trim();
    if (!texto) { ui.prev.innerHTML = '<span class="hbr-prev-vazio">Escreva o que precisa fazer — eu entendo o dia, o tipo e a matéria.</span>'; return; }
    const t = Core.TIPOS[st.q.tipo];
    ui.prev.innerHTML = '<span class="hbr-prev-em">' + t.emoji + '</span><div><b>' + esc(nomeParaMostrar()) + '</b><small>' + esc(st.q.materia) + ' · ' + esc(prazoTexto(st.q.data)) + (statusIA ? ' · ' + esc(statusIA) : '') + '</small></div>';
}

function renderTarefa(statusIA) { ui.chips.innerHTML = chipsTarefa(); renderPrev(statusIA); }

function aplicarCampos(r, origemIA) {                               // só mexe no que o aluno não escolheu na mão
    [['data', r.data, st.q.dataPadrao], ['tipo', r.tipo, 'tipo'], ['materia', r.materia, st.q.materiaPadrao]].forEach(([k, v, padrao]) => {
        if (st.q.manual[k]) return;
        if (v) { st.q[k] = v; st.q.auto[k] = true; }
        else if (st.q.auto[k] && !origemIA) { st.q[k] = k === 'tipo' ? 'tarefa' : padrao; st.q.auto[k] = false; }   // trecho apagado: volta ao padrão
    });
}

function interpretar() {
    const texto = ui.nome.value;
    aplicarCampos(Core.interpretarRapido(texto, { hoje: hojeStr(), materias: st.materias.filter((m) => m !== 'Geral') }), false);
    renderTarefa();
}

async function rodarIA(silencioso) {
    const texto = ui.nome.value.trim();
    if (!texto) { shake(ui.nome); return false; }
    ui.iaBtn.classList.add('girando'); ui.iaBtn.disabled = true;
    renderPrev('✨ entendendo…');
    const ia = await iaOrganizar(texto, st.materias);
    ui.iaBtn.classList.remove('girando'); ui.iaBtn.disabled = false;
    st.iaTexto = texto;                                              // não tenta de novo para o mesmo texto
    if (ia) { aplicarCampos(ia, true); st.nomeIA = ia.nome || null; renderTarefa('✨ IA'); return true; }
    st.nomeIA = null; renderTarefa();
    if (!silencioso) toast('IA indisponível agora — usei o leitor automático');
    return false;
}

function shake(el) { el.classList.add('erro'); el.focus(); setTimeout(() => el.classList.remove('erro'), 900); }

async function confirmarTarefa() {
    if (st.ocupado) return;
    const texto = ui.nome.value.trim();
    if (!texto) { shake(ui.nome); return; }
    st.ocupado = true; renderPe();
    try {
        if (iaLigada() && st.iaTexto !== texto) await rodarIA(true);   // automático: organiza com IA antes de salvar
        const nome = nomeParaMostrar() || Core.capitalizar(texto);
        const dados = { nome, tipo: st.q.tipo, materia: st.q.materia, dataInicio: st.q.data, dataFim: st.q.data };
        localStorage.setItem('hb_ag_ult_materia', st.q.materia);
        const r = await salvar(st.opts, dados);
        const opts = st.opts;
        fechar();
        toast('✓ ' + nome + ' · ' + prazoTexto(dados.dataFim));
        if (opts.onTarefa) opts.onTarefa(r.tarefa);
    } catch (e) {
        console.error('[rapido] salvar:', e);
        toast('Não consegui salvar. Tente de novo.');
    } finally { st.ocupado = false; if (aberto()) renderPe(); }
}

/* ───────── aba CONTEÚDO ───────── */

function renderConteudo() {
    ui.mats.innerHTML = st.materias.map((m) => '<button type="button" class="hbr-chip' + (st.matConteudo === m ? ' on' : '') + '" data-mat-c="' + esc(m) + '"><i class="hbr-dot" style="background:' + Core.corMateria(m) + '"></i>' + esc(m) + '</button>').join('');
    ui.itens.innerHTML = st.itens.map((it, i) =>
        '<div class="hbr-item">' + (it.url ? '<img src="' + it.url + '" alt="">' : '<span class="hbr-item-ico">' + emojiPorExt(extArquivo(it.file.name)) + '</span>') +
        '<span class="hbr-item-nome">' + esc(it.file.name || 'Foto') + '</span><button type="button" data-rm="' + i + '" aria-label="Remover">✕</button></div>').join('');
    const temImg = st.itens.some((it) => !it.arq);
    ui.aviso.textContent = temImg && !imgbbConfigurado() ? '⚠️ Fotos precisam da chave do ImgBB (veja conteudos-upload.js). Arquivos PDF/Word funcionam sem ela.' : '';
}

function adicionarArquivos(files, arq) {
    let n = 0;
    for (const f of files) {
        if (st.itens.length >= MAX_ITENS) { toast('Máximo de ' + MAX_ITENS + ' itens por vez'); break; }
        st.itens.push({ file: f, arq, url: !arq && f.type.startsWith('image/') ? URL.createObjectURL(f) : '' });
        n++;
    }
    if (n) { renderConteudo(); renderPe(); }
}

async function enviarConteudo() {
    if (st.ocupado || !st.itens.length) return;
    st.ocupado = true; renderPe('Enviando…');
    try {
        const r = await salvarItens({
            items: st.itens.map((it) => ({ file: it.file, arq: it.arq })), materia: st.matConteudo, userEmail: userEmail() || '',
            onProgresso: (i, n) => renderPe('Enviando ' + i + '/' + n + '…')
        });
        localStorage.setItem('hb_ag_ult_materia', st.matConteudo);
        const opts = st.opts, mat = st.matConteudo;
        if (r.ok) fechar();
        if (!r.falha) toast('✓ ' + r.ok + (r.ok === 1 ? ' item salvo' : ' itens salvos') + ' em ' + mat);
        else if (!r.ok) toast('❌ Nada foi salvo' + (r.erros[0] ? ': ' + r.erros[0] : ''), 4000);
        else toast('✓ ' + r.ok + ' salvos · ' + r.falha + ' falharam', 3800);
        if (r.ok && opts.onConteudo) opts.onConteudo(r);
    } catch (e) {
        toast(e.message || 'Erro ao enviar', 4500);
    } finally { st.ocupado = false; if (aberto()) renderPe(); }
}

/* ───────── rodapé e eventos ───────── */

function renderPe(textoOcupado) {
    if (!ui) return;
    if (st.aba === 'tarefa') {
        ui.pe.innerHTML = (st.opts.maisOpcoes ? '<button class="hbr-bt hbr-bt-sec" data-pe="mais"' + (st.ocupado ? ' disabled' : '') + '>Mais opções…</button>' : '') +
            '<button class="hbr-bt hbr-bt-pri" data-pe="add"' + (st.ocupado ? ' disabled' : '') + '>' + (st.ocupado ? '✨ Organizando…' : 'Adicionar') + '</button>';
    } else {
        const n = st.itens.length;
        ui.pe.innerHTML = '<button class="hbr-bt hbr-bt-sec" data-hbr="fechar"' + (st.ocupado ? ' disabled' : '') + '>Cancelar</button>' +
            '<button class="hbr-bt hbr-bt-pri" data-pe="enviar"' + (st.ocupado || !n ? ' disabled' : '') + '>' + (textoOcupado || (n ? 'Enviar ' + n + (n === 1 ? ' item' : ' itens') : 'Escolha um item')) + '</button>';
    }
}

function onClick(e) {
    const t = e.target;
    if (t === ui.ov) { if (!st.ocupado) fechar(); return; }
    const ab = t.closest('[data-aba]'); if (ab) { st.aba = ab.dataset.aba; renderAba(); if (st.aba === 'tarefa') ui.nome.focus(); return; }
    const q = t.closest('[data-q]');
    if (q) { const k = q.dataset.q; if (k !== 'data-input') { st.q[k] = q.dataset.val; st.q.manual[k] = true; renderTarefa(); } return; }
    const mc = t.closest('[data-mat-c]'); if (mc) { st.matConteudo = mc.dataset.matC; renderConteudo(); return; }
    const fo = t.closest('[data-fonte]'); if (fo) { ui.ov.querySelector('#hbr-f-' + fo.dataset.fonte).click(); return; }
    const rm = t.closest('[data-rm]'); if (rm) { const [it] = st.itens.splice(Number(rm.dataset.rm), 1); if (it && it.url) URL.revokeObjectURL(it.url); renderConteudo(); renderPe(); return; }
    const pe = t.closest('[data-pe]');
    if (pe) {
        if (pe.dataset.pe === 'add') confirmarTarefa();
        else if (pe.dataset.pe === 'enviar') enviarConteudo();
        else if (pe.dataset.pe === 'mais') { const d = { nome: nomeParaMostrar(), data: st.q.data, tipo: st.q.tipo, materia: st.q.materia }; const f = st.opts.maisOpcoes; fechar(); f(d); }
        return;
    }
    const h = t.closest('[data-hbr]');
    if (h) { if (h.dataset.hbr === 'fechar' && !st.ocupado) fechar(); else if (h.dataset.hbr === 'ia') rodarIA(false); }
}

function onChange(e) {
    const t = e.target;
    if (t.matches('input[data-q="data-input"]')) { if (t.value) { st.q.data = t.value; st.q.manual.data = true; renderTarefa(); } }
    else if (t.id === 'hbr-ia-auto') { localStorage.setItem('hb_ag_ia', t.checked ? '1' : '0'); }
    else if (t.id === 'hbr-f-camera') { adicionarArquivos([...t.files], false); t.value = ''; }
    else if (t.id === 'hbr-f-galeria') { adicionarArquivos([...t.files], false); t.value = ''; }
    else if (t.id === 'hbr-f-arquivo') { adicionarArquivos([...t.files], true); t.value = ''; }
}

window.HBRapido = { abrirRapido, enviarInline, toast, fechar, iaLigada };
