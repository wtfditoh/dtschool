/* hb-rapido.js — "Adicionar rápido" com IA + bimestre + relacionar com atividade + offline. */
import { collection, addDoc, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./hb-firebase.js";
import * as Core from "./agenda-core.js";
import { salvarItens, imgbbConfigurado, extArquivo, emojiPorExt } from "./conteudos-upload.js";
import * as Fila from "./offline-queue.js";

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
    if (!nomes.length && userEmail() && !isLocal()) {
        try {
            const snap = await getDoc(doc(db, 'notas', userEmail()));
            if (snap.exists() && Array.isArray(snap.data().materias)) nomes = snap.data().materias.map((m) => m && m.nome).filter(Boolean);
        } catch (e) {}
    }
    materiasCache = [...new Set(['Geral', ...nomes, ...(extra || [])])];
    return materiasCache;
}

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
        console.warn('[rapido] IA indisponível:', e && e.message);
        return null;
    }
}

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
        materia: d.materia || 'Geral', tipo: d.tipo || 'tarefa', bimestre: d.bimestre || '', imagem: '',
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
    return r && r.tarefa ? r : { tarefa: r, desfazer: null };
}

export async function enviarInline(texto, opts) {
    opts = opts || {};
    texto = String(texto || '').trim();
    if (!texto) return null;
    const materias = await carregarMaterias();
    const local = Core.interpretarRapido(texto, { hoje: hojeStr(), materias: materias.filter((m) => m !== 'Geral') });
    if (opts.onEstado) opts.onEstado('ia');
    const ia = await iaOrganizar(texto, materias);
    const f = Core.mesclarInterpretacao(local, ia);
    const dados = { 
        nome: f.nome || Core.capitalizar(texto), 
        tipo: f.tipo || 'tarefa', 
        materia: f.materia || 'Geral', 
        bimestre: '', 
        descricao: f.descricao || '' // 👈 AQUI VAI A DESCRIÇÃO DA IA
    };
    dados.dataInicio = dados.dataFim = f.data || hojeStr();
    if (opts.onEstado) opts.onEstado('salvando');
    const r = await salvar(opts, dados);
    if (opts.onSalvo) opts.onSalvo(r.tarefa);
    return { ...dados, data: dados.dataFim, usouIA: !!ia, tarefa: r.tarefa, desfazer: r.desfazer };
}

const st = {
    aba: 'tarefa', opts: {}, materias: ['Geral'], ocupado: false, iaTexto: '', nomeIA: null,
    q: { data: '', tipo: 'tarefa', materia: 'Geral', bimestre: '', dataPadrao: '', materiaPadrao: 'Geral', manual: {}, auto: {} },
    itens: [], matConteudo: 'Geral', bimConteudo: '', tarefaConteudo: null, tarefasDisponiveis: []
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
                    
                    // Campo de descrição escondido que a IA preenche
                    '<button type="button" class="hbr-add-desc" id="hbr-add-desc">➕ Adicionar descrição</button>' +
                    '<textarea id="hbr-desc" class="hbr-desc" style="display:none;" placeholder="Detalhes, capítulos, o que precisa..."></textarea>' +
                    
                    '<div class="hbr-prev" id="hbr-prev"></div>' +
                    '<label class="hbr-switch"><input type="checkbox" id="hbr-ia-auto"><i></i><span>IA automática ao adicionar</span></label>' +
                    '<div id="hbr-chips"></div>' +
                '</div>' +
                '<div class="hbr-painel" data-p="conteudo">' +
                    '<div class="hbr-rot">Matéria</div><div class="hbr-chips" id="hbr-mats"></div>' +
                    '<div class="hbr-rot">Bimestre <small style="opacity:0.5;text-transform:none;letter-spacing:0;">(opcional)</small></div><div class="hbr-chips" id="hbr-bims"></div>' +
                    '<div class="hbr-rot">Relacionar com atividade <small style="opacity:0.5;text-transform:none;letter-spacing:0;">(opcional)</small></div><div class="hbr-chips" id="hbr-tarefas"></div>' +
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
    ui = { ov, box: ov.querySelector('.hbr-sheet'), nome: ov.querySelector('#hbr-nome'), prev: ov.querySelector('#hbr-prev'), chips: ov.querySelector('#hbr-chips'), mats: ov.querySelector('#hbr-mats'), bims: ov.querySelector('#hbr-bims'), tarefas: ov.querySelector('#hbr-tarefas'), itens: ov.querySelector('#hbr-itens'), aviso: ov.querySelector('#hbr-aviso'), pe: ov.querySelector('#hbr-pe'), iaBtn: ov.querySelector('#hbr-ia'), iaAuto: ov.querySelector('#hbr-ia-auto'), desc: ov.querySelector('#hbr-desc'), addDesc: ov.querySelector('#hbr-add-desc') };

    ov.addEventListener('click', onClick);
    ov.addEventListener('change', onChange);
    ui.nome.addEventListener('input', () => interpretar());
    ui.nome.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmarTarefa(); } });
    
    // Abre e fecha o campo de descrição
    ui.addDesc.addEventListener('click', () => {
        const visivel = ui.desc.style.display !== 'none';
        ui.desc.style.display = visivel ? 'none' : 'block';
        ui.addDesc.textContent = visivel ? '➕ Adicionar descrição' : '➖ Ocultar descrição';
        if (!visivel) setTimeout(() => ui.desc.focus(), 100);
    });

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
    st.q = { data: opts.data || hojeStr(), dataPadrao: opts.data || hojeStr(), tipo: 'tarefa', materia: 'Geral', bimestre: opts.bimestre || '', materiaPadrao: 'Geral', manual: {}, auto: {} };
    ui.nome.value = opts.nome || '';
    
    ui.desc.value = opts.descricao || '';
    if (ui.desc.value.trim()) {
        ui.desc.style.display = 'block';
        ui.addDesc.textContent = '➖ Ocultar descrição';
    } else {
        ui.desc.style.display = 'none';
        ui.addDesc.textContent = '➕ Adicionar descrição';
    }

    ui.iaAuto.checked = iaLigada();
    ui.aviso.textContent = '';
    ui.ov.classList.add('aberto');
    document.body.classList.add('hbr-travado');
    garantirIA();
    renderAba();

    st.materias = await carregarMaterias(opts.materias);
    if (st.materias.includes(ultima)) { st.q.materia = st.q.materiaPadrao = ultima; st.matConteudo = ultima; } else st.matConteudo = 'Geral';
    if (ui.nome.value) interpretar(); else renderTarefa();
    renderConteudo(); renderPe();
    if (st.aba === 'tarefa') setTimeout(() => ui.nome.focus(), 60);
    if (st.aba === 'conteudo') carregarTarefasDisponiveis();
}

function renderAba() {
    const soConteudo = st.opts && st.opts.aba === 'conteudo';
    const abasEl = ui.ov.querySelector('.hbr-abas');
    if (abasEl) abasEl.style.display = soConteudo ? 'none' : '';

    ui.ov.querySelectorAll('[data-aba]').forEach((b) => { const on = b.dataset.aba === st.aba; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    ui.ov.querySelectorAll('.hbr-painel').forEach((p) => p.classList.toggle('on', p.dataset.p === st.aba));

    const titulo = ui.ov.querySelector('#hbr-titulo');
    if (titulo) titulo.textContent = (st.aba === 'conteudo' && soConteudo) ? '📸 Adicionar conteúdo' : '⚡ Adicionar rápido';

    renderTarefa(); renderConteudo(); renderPe();
}

function chipsTarefa() {
    const q = st.q, hoje = hojeStr(), amanha = Core.somarDias(hoje, 1), depois = Core.somarDias(hoje, 2);
    const rotDia = (d) => { const n = Core.NOMES_DIA[Core.diaDaSemana(d)]; return n.charAt(0) + n.slice(1).toLowerCase() + ' ' + (+d.split('-')[2]); };
    const dc = (d, t) => '<button type="button" class="hbr-chip' + (q.data === d ? ' on' : '') + '" data-q="data" data-val="' + d + '">' + t + '</button>';
    const outra = ![hoje, amanha, depois].includes(q.data);
    const datas = dc(hoje, 'Hoje') + dc(amanha, 'Amanhã') + dc(depois, rotDia(depois)) +
        '<label class="hbr-chip hbr-data' + (outra ? ' on' : '') + '">📅 ' + (outra ? esc(prazoTexto(q.data)) : 'Outra') + '<input type="date" data-q="data-input" value="' + esc(q.data) + '"></label>';
    const tipos = Object.keys(Core.TIPOS).map((k) => '<button type="button" class="hbr-chip' + (q.tipo === k ? ' on' : '') + '" data-q="tipo" data-val="' + k + '">' + Core.TIPOS[k].emoji + ' ' + Core.TIPOS[k].label + '</button>').join('');
    const mats = st.materias.map((m) => '<button type="button" class="hbr-chip' + (q.materia === m ? ' on' : '') + '" data-q="materia" data-val="' + esc(m) + '"><i class="hbr-dot" style="background:' + Core.corMateria(m) + '"></i>' + esc(m) + '</button>').join('');
    const bims = ['1','2','3','4'].map((b) => '<button type="button" class="hbr-chip' + (q.bimestre === b ? ' on' : '') + '" data-q="bimestre" data-val="' + b + '">' + b + 'º BIM</button>').join('');

    return '<div class="hbr-rot">Prazo</div><div class="hbr-chips">' + datas + '</div>'
         + '<div class="hbr-rot">Tipo</div><div class="hbr-chips">' + tipos + '</div>'
         + '<div class="hbr-rot">Matéria</div><div class="hbr-chips">' + mats + '</div>'
         + '<div class="hbr-rot">Bimestre <small style="opacity:0.5;text-transform:none;letter-spacing:0;">(opcional)</small></div><div class="hbr-chips">' + bims + '</div>';
}

function nomeParaMostrar() {
    const texto = ui.nome.value.trim();
    if (!texto) return '';
    if (st.nomeIA && st.iaTexto === texto) return st.nomeIA;
    const r = Core.interpretarRapido(texto, { hoje: hojeStr(), materias: st.materias.filter((m) => m !== 'Geral') });
    const gen = (tipo, mat) => Core.TIPOS[tipo || 'tarefa'].label + ' de ' + (mat || 'Geral');
    return r.nome === gen(r.tipo, r.materia) && r.nome !== Core.capitalizar(texto) ? gen(st.q.tipo, st.q.materia) : r.nome;
}

function renderPrev(statusIA) {
    const texto = ui.nome.value.trim();
    if (!texto) { ui.prev.innerHTML = '<span class="hbr-prev-vazio">Escreva o que precisa fazer — eu entendo o dia, o tipo e a matéria.</span>'; return; }
    const t = Core.TIPOS[st.q.tipo];
    const bimTxt = st.q.bimestre ? ' · ' + st.q.bimestre + 'º BIM' : '';
    ui.prev.innerHTML = '<span class="hbr-prev-em">' + t.emoji + '</span><div><b>' + esc(nomeParaMostrar()) + '</b><small>' + esc(st.q.materia) + bimTxt + ' · ' + esc(prazoTexto(st.q.data)) + (statusIA ? ' · ' + esc(statusIA) : '') + '</small></div>';
}

function renderTarefa(statusIA) { ui.chips.innerHTML = chipsTarefa(); renderPrev(statusIA); }

function aplicarCampos(r, origemIA) {
    [['data', r.data, st.q.dataPadrao], ['tipo', r.tipo, 'tipo'], ['materia', r.materia, st.q.materiaPadrao]].forEach(([k, v, padrao]) => {
        if (st.q.manual[k]) return;
        if (v) { st.q[k] = v; st.q.auto[k] = true; }
        else if (st.q.auto[k] && !origemIA) { st.q[k] = k === 'tipo' ? 'tarefa' : padrao; st.q.auto[k] = false; }
    });
    
    // Se a IA ou heurística local acharam uma descrição, preenche o campo e abre ele
    if (r.descricao && !ui.desc.value.trim()) {
        ui.desc.value = r.descricao;
        ui.desc.style.display = 'block';
        ui.addDesc.textContent = '➖ Ocultar descrição';
    }
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
    st.iaTexto = texto;
    if (ia) { 
        aplicarCampos(ia, true); 
        st.nomeIA = ia.nome || null; 
        renderTarefa('✨ IA'); 
        return true; 
    }
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
        if (iaLigada() && st.iaTexto !== texto) await rodarIA(true);
        const nome = nomeParaMostrar() || Core.capitalizar(texto);
        const dados = { 
            nome, 
            tipo: st.q.tipo, 
            materia: st.q.materia, 
            bimestre: st.q.bimestre, 
            dataInicio: st.q.data, 
            dataFim: st.q.data, 
            descricao: ui.desc.value.trim()
        };
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

async function carregarTarefasDisponiveis() {
    st.tarefaConteudo = null;
    st.tarefasDisponiveis = [];
    try {
        const email = userEmail();
        if (!email) return;
        const { query, where, getDocs, collection } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const q = query(collection(db, 'agenda'), where('usuario', '==', email), where('concluida', '==', false));
        let snap;
        try { snap = await getDocs(q); }
        catch (e) {
            const q2 = query(collection(db, 'agenda'), where('usuario', '==', email));
            snap = await getDocs(q2);
        }
        const arr = [];
        snap.forEach((d) => {
            const t = d.data();
            if (t.concluida) return;
            arr.push({ id: d.id, nome: t.nome, materia: t.materia, tipo: t.tipo, dataFim: t.dataFim });
        });
        arr.sort((a, b) => String(a.dataFim || '').localeCompare(String(b.dataFim || '')));
        st.tarefasDisponiveis = arr;
        renderConteudo();
    } catch (e) {
        console.warn('[rapido] tarefas indisponíveis:', e);
    }
}

function renderConteudo() {
    ui.mats.innerHTML = st.materias.map((m) => '<button type="button" class="hbr-chip' + (st.matConteudo === m ? ' on' : '') + '" data-mat-c="' + esc(m) + '"><i class="hbr-dot" style="background:' + Core.corMateria(m) + '"></i>' + esc(m) + '</button>').join('');
    const bims = ['1','2','3','4'].map((b) => '<button type="button" class="hbr-chip' + (st.bimConteudo === b ? ' on' : '') + '" data-bim-c="' + b + '">' + b + 'º BIM</button>').join('');
    ui.bims.innerHTML = bims;

    if (ui.tarefas) {
        if (!st.tarefasDisponiveis.length) {
            ui.tarefas.innerHTML = '<span style="font-size:11px;color:#555;font-weight:600;padding:6px 2px;">Nenhuma atividade pendente</span>';
        } else {
            ui.tarefas.innerHTML = st.tarefasDisponiveis.slice(0, 8).map((t) => {
                const on = st.tarefaConteudo && st.tarefaConteudo.id === t.id;
                return '<button type="button" class="hbr-chip' + (on ? ' on' : '') + '" data-tarefa-c="' + esc(t.id) + '">📌 ' + esc((t.nome || '').slice(0, 24)) + '</button>';
            }).join('');
        }
    }

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
    st.ocupado = true;

    // Offline: joga direto na fila
    if (!navigator.onLine) {
        try {
            await Fila.adicionar({
                tipo: 'conteudo',
                dados: {
                    materia: st.matConteudo,
                    bimestre: st.bimConteudo,
                    tarefaId: st.tarefaConteudo ? st.tarefaConteudo.id : '',
                    tarefaNome: st.tarefaConteudo ? st.tarefaConteudo.nome : '',
                    userEmail: userEmail() || ''
                },
                arquivos: st.itens.map((it) => ({ file: it.file, arq: it.arq }))
            });
            const opts = st.opts;
            fechar();
            toast('📶 Salvo offline · sincroniza quando voltar a net', 4000);
            if (opts.onConteudo) opts.onConteudo({ ok: 1, offline: true });
        } catch (e) {
            toast('Erro ao salvar offline');
        } finally {
            st.ocupado = false;
        }
        return;
    }

    renderPe('Enviando…');
    try {
        const r = await salvarItens({
            items: st.itens.map((it) => ({ file: it.file, arq: it.arq })),
            materia: st.matConteudo,
            bimestre: st.bimConteudo,
            tarefaId: st.tarefaConteudo ? st.tarefaConteudo.id : '',
            tarefaNome: st.tarefaConteudo ? st.tarefaConteudo.nome : '',
            userEmail: userEmail() || '',
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
        const msg = String(e && e.message || '').toLowerCase();
        const ehRede = msg.includes('fetch') || msg.includes('network') || msg.includes('failed');
        if (ehRede && st.itens.length) {
            try {
                await Fila.adicionar({
                    tipo: 'conteudo',
                    dados: {
                        materia: st.matConteudo,
                        bimestre: st.bimConteudo,
                        tarefaId: st.tarefaConteudo ? st.tarefaConteudo.id : '',
                        tarefaNome: st.tarefaConteudo ? st.tarefaConteudo.nome : '',
                        userEmail: userEmail() || ''
                    },
                    arquivos: st.itens.map((it) => ({ file: it.file, arq: it.arq }))
                });
                const opts = st.opts;
                fechar();
                toast('📶 Sem conexão · salvo pra sincronizar depois', 4000);
                if (opts.onConteudo) opts.onConteudo({ ok: 1, offline: true });
                return;
            } catch (e2) {
                console.error('[rapido] erro ao salvar offline:', e2);
            }
        }
        toast(e.message || 'Erro ao enviar', 4500);
    } finally { st.ocupado = false; if (aberto()) renderPe(); }
}

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
    if (q) {
        const k = q.dataset.q;
        if (k !== 'data-input') {
            if (k === 'bimestre' && st.q.bimestre === q.dataset.val) {
                st.q.bimestre = ''; st.q.manual.bimestre = true;
            } else {
                st.q[k] = q.dataset.val; st.q.manual[k] = true;
            }
            renderTarefa();
        }
        return;
    }
    const mc = t.closest('[data-mat-c]'); if (mc) { st.matConteudo = mc.dataset.matC; renderConteudo(); return; }
    const bc = t.closest('[data-bim-c]');
    if (bc) {
        const b = bc.dataset.bimC;
        st.bimConteudo = (st.bimConteudo === b) ? '' : b;
        renderConteudo();
        return;
    }
    const tc = t.closest('[data-tarefa-c]');
    if (tc) {
        const id = tc.dataset.tarefaC;
        if (st.tarefaConteudo && st.tarefaConteudo.id === id) {
            st.tarefaConteudo = null;
        } else {
            st.tarefaConteudo = st.tarefasDisponiveis.find((x) => x.id === id) || null;
        }
        renderConteudo();
        return;
    }
    const fo = t.closest('[data-fonte]'); if (fo) { ui.ov.querySelector('#hbr-f-' + fo.dataset.fonte).click(); return; }
    const rm = t.closest('[data-rm]'); if (rm) { const [it] = st.itens.splice(Number(rm.dataset.rm), 1); if (it && it.url) URL.revokeObjectURL(it.url); renderConteudo(); renderPe(); return; }
    const pe = t.closest('[data-pe]');
    if (pe) {
        if (pe.dataset.pe === 'add') confirmarTarefa();
        else if (pe.dataset.pe === 'enviar') enviarConteudo();
        else if (pe.dataset.pe === 'mais') { const d = { nome: nomeParaMostrar(), data: st.q.data, tipo: st.q.tipo, materia: st.q.materia, bimestre: st.q.bimestre, descricao: ui.desc.value.trim() }; const f = st.opts.maisOpcoes; fechar(); f(d); }
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
