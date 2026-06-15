/* ═══════════════════════════════════════════════════════════════════════════
   CONCURSOS - JS com Firebase
   Hub Brain Edition
   ═══════════════════════════════════════════════════════════════════════════ */

// ── FIREBASE CONFIG ──────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a"
};

// ── VARIÁVEIS GLOBAIS ─────────────────────────────────────────────────────────
let db, storage;
let todasProvas = [];
let provasExibidas = [];
let provaSelecionada = null;
let favoritos = JSON.parse(localStorage.getItem('hb-favoritos-concursos')) || [];
let filtrosAtivos = { inst: '', tipo: '', disc: '', ano: '', busca: '' };

// ── INICIALIZAR ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        storage = firebase.storage();
        console.log('✅ Firebase conectado!');
        await carregarProvas();
    } catch (e) {
        console.error('❌ Firebase:', e);
        mostrarErro();
    }
});

// ── CARREGAR DO FIRESTORE ────────────────────────────────────────────────────
async function carregarProvas() {
    mostrarLoading(true);
    try {
        const snap = await db.collection('concursos').orderBy('data', 'desc').get();
        todasProvas = [];
        snap.forEach(doc => {
            todasProvas.push({ id: doc.id, ...doc.data(), favorito: favoritos.includes(doc.id) });
        });
        provasExibidas = [...todasProvas];
        atualizarStats();
        renderizar();
    } catch (e) {
        console.error('❌ Erro ao carregar:', e);
        mostrarErro();
    } finally {
        mostrarLoading(false);
    }
}

// ── RENDERIZAR CARDS ─────────────────────────────────────────────────────────
function renderizar() {
    const grid = document.getElementById('cards-grid');
    const empty = document.getElementById('empty-state');
    const count = document.getElementById('total-count');
    const sort = document.getElementById('sort-select').value;

    // Ordena
    const sorted = [...provasExibidas].sort((a, b) => {
        if (sort === 'recente') return new Date(b.data) - new Date(a.data);
        if (sort === 'antigo')  return new Date(a.data) - new Date(b.data);
        if (sort === 'nome')    return a.titulo.localeCompare(b.titulo);
        return 0;
    });

    count.textContent = sorted.length;

    if (sorted.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = sorted.map(p => `
        <div class="prova-card">
            <div class="card-top">
                <div class="card-badges">
                    <span class="badge badge-${p.tipo}">${labelTipo(p.tipo)}</span>
                    ${p.disciplina ? `<span class="badge badge-questoes" style="background:none;border-color:rgba(255,255,255,0.1);color:#666;">${p.disciplina}</span>` : ''}
                </div>
                <button class="btn-fav ${p.favorito ? 'ativo' : ''}" onclick="toggleFav('${p.id}', event)">
                    <i data-lucide="star" style="width:16px;height:16px;${p.favorito ? 'fill:#ffb800;' : ''}"></i>
                </button>
            </div>
            <div class="card-title">${p.titulo}</div>
            <div class="card-inst">
                <i data-lucide="building-2" style="width:13px;height:13px;"></i>
                ${p.instituicao} · ${p.ano || ''}
            </div>
            <div class="card-meta">
                <div class="meta-item">
                    <i data-lucide="file" style="width:12px;height:12px;"></i>
                    <strong>${p.tamanho || '--'}</strong>
                </div>
                ${p.questoes ? `<div class="meta-item"><i data-lucide="list" style="width:12px;height:12px;"></i><strong>${p.questoes} questões</strong></div>` : ''}
            </div>
            <div class="card-actions">
                <button class="btn-card btn-card-primary" onclick="abrirModal('${p.id}')">
                    <i data-lucide="eye" style="width:14px;height:14px;"></i>
                    Ver detalhes
                </button>
                <button class="btn-card btn-card-secondary" onclick="download('${p.id}')">
                    <i data-lucide="download" style="width:14px;height:14px;"></i>
                </button>
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

// ── BUSCAR ───────────────────────────────────────────────────────────────────
function buscar() {
    filtrosAtivos.busca = document.getElementById('input-busca').value.toLowerCase().trim();
    aplicarFiltros();
}

// ── FILTROS ───────────────────────────────────────────────────────────────────
function togglePill(e, id) {
    e.stopPropagation();
    const pill = document.getElementById(id);
    const aberto = pill.classList.contains('aberto');
    document.querySelectorAll('.filtro-pill').forEach(p => p.classList.remove('aberto'));
    if (!aberto) pill.classList.add('aberto');
}

function selecionarFiltro(e, tipo, valor) {
    e.stopPropagation();
    filtrosAtivos[tipo] = valor;

    // Atualiza label do pill
    const labels = { inst: 'Instituição', tipo: 'Tipo', disc: 'Disciplina', ano: 'Ano' };
    const lbl = document.getElementById(`lbl-${tipo}`);
    lbl.textContent = valor || labels[tipo];

    // Marca opção selecionada
    const dd = document.getElementById(`dd-${tipo}`);
    dd.querySelectorAll('.filtro-opt').forEach(opt => {
        opt.classList.toggle('selecionado', opt.textContent.trim().endsWith(valor) && valor !== '');
    });

    // Fecha dropdown
    document.querySelectorAll('.filtro-pill').forEach(p => p.classList.remove('aberto'));

    aplicarFiltros();
    atualizarChips();
}

function aplicarFiltros() {
    const { inst, tipo, disc, ano, busca } = filtrosAtivos;

    provasExibidas = todasProvas.filter(p => {
        const matchInst  = !inst  || p.instituicao === inst;
        const matchTipo  = !tipo  || p.tipo === tipo;
        const matchDisc  = !disc  || p.disciplina === disc;
        const matchAno   = !ano   || String(p.ano) === ano;
        const matchBusca = !busca || 
            p.titulo.toLowerCase().includes(busca) ||
            (p.instituicao || '').toLowerCase().includes(busca) ||
            (p.disciplina  || '').toLowerCase().includes(busca) ||
            (p.descricao   || '').toLowerCase().includes(busca);
        return matchInst && matchTipo && matchDisc && matchAno && matchBusca;
    });

    renderizar();
    atualizarBotaoLimpar();
}

function atualizarChips() {
    const labels = { inst: 'Instituição', tipo: 'Tipo', disc: 'Disciplina', ano: 'Ano' };
    const row = document.getElementById('chips-row');
    const chips = Object.entries(filtrosAtivos)
        .filter(([k, v]) => v && k !== 'busca')
        .map(([k, v]) => `
            <div class="chip">
                ${v}
                <span class="chip-x" onclick="selecionarFiltro(event,'${k}','')">✕</span>
            </div>
        `).join('');
    row.innerHTML = chips;
}

function limparFiltros() {
    filtrosAtivos = { inst: '', tipo: '', disc: '', ano: '', busca: '' };
    document.getElementById('input-busca').value = '';
    const labels = { inst: 'Instituição', tipo: 'Tipo', disc: 'Disciplina', ano: 'Ano' };
    Object.keys(labels).forEach(k => {
        document.getElementById(`lbl-${k}`).textContent = labels[k];
        document.getElementById(`dd-${k}`).querySelectorAll('.filtro-opt').forEach(o => o.classList.remove('selecionado'));
        document.getElementById(`pill-${k}`).classList.remove('ativo');
    });
    document.getElementById('chips-row').innerHTML = '';
    provasExibidas = [...todasProvas];
    renderizar();
    atualizarBotaoLimpar();
}

function atualizarBotaoLimpar() {
    const temFiltro = Object.values(filtrosAtivos).some(v => v);
    const btn = document.getElementById('btn-limpar');
    btn.classList.toggle('visivel', temFiltro);
}

// ── MODAL ────────────────────────────────────────────────────────────────────
function abrirModal(id) {
    provaSelecionada = todasProvas.find(p => p.id === id);
    if (!provaSelecionada) return;
    const p = provaSelecionada;

    document.getElementById('modal-titulo').textContent = p.titulo;
    document.getElementById('modal-sub').textContent = `${p.instituicao} · ${labelTipo(p.tipo)}`;
    document.getElementById('modal-inst').textContent = p.instituicao || '--';
    document.getElementById('modal-ano').textContent = p.ano || '--';
    document.getElementById('modal-disc').textContent = p.disciplina || 'Geral';
    document.getElementById('modal-tam').textContent = p.tamanho || '--';
    document.getElementById('modal-desc').textContent = p.descricao || 'Sem descrição.';
    document.getElementById('modal').classList.add('ativo');
}

function fecharModal() {
    document.getElementById('modal').classList.remove('ativo');
    provaSelecionada = null;
}

// ── DOWNLOAD ─────────────────────────────────────────────────────────────────
async function download(id) {
    const prova = todasProvas.find(p => p.id === id);
    if (!prova) return;
    if (prova.url) {
        window.open(prova.url, '_blank');
    } else {
        try {
            const url = await storage.ref(`concursos/${prova.arquivo}`).getDownloadURL();
            window.open(url, '_blank');
        } catch (e) {
            alert('Arquivo ainda não disponível para download.');
        }
    }
}

function downloadAtual() {
    if (provaSelecionada) {
        download(provaSelecionada.id);
    }
}

// ── FAVORITOS ────────────────────────────────────────────────────────────────
function toggleFav(id, e) {
    e.stopPropagation();
    const prova = todasProvas.find(p => p.id === id);
    if (!prova) return;
    prova.favorito = !prova.favorito;
    if (prova.favorito) {
        if (!favoritos.includes(id)) favoritos.push(id);
    } else {
        favoritos = favoritos.filter(f => f !== id);
    }
    localStorage.setItem('hb-favoritos-concursos', JSON.stringify(favoritos));
    document.getElementById('stat-favs').textContent = favoritos.length;
    renderizar();
}

// ── STATS ────────────────────────────────────────────────────────────────────
function atualizarStats() {
    document.getElementById('stat-total').textContent = todasProvas.length;
    const insts = new Set(todasProvas.map(p => p.instituicao).filter(Boolean));
    document.getElementById('stat-inst').textContent = insts.size;
    document.getElementById('stat-favs').textContent = favoritos.length;
}

// ── UTILITÁRIOS ───────────────────────────────────────────────────────────────
function labelTipo(tipo) {
    const map = {
        'prova': 'Prova', 'simulado': 'Simulado', 'gabarito': 'Gabarito',
        'questoes': 'Questões', 'resumo': 'Resumo', 'apostila': 'Apostila', 'redacao': 'Redação'
    };
    return map[tipo] || tipo;
}

function mostrarLoading(show) {
    document.getElementById('loading-state').classList.toggle('ativo', show);
    document.getElementById('cards-grid').style.display = show ? 'none' : 'grid';
}

function mostrarErro() {
    mostrarLoading(false);
    const empty = document.getElementById('empty-state');
    empty.innerHTML = '<div class="empty-icon">❌</div><h2 class="empty-title">Erro ao carregar</h2><p class="empty-text">Verifique a conexão e tente novamente</p>';
    empty.style.display = 'block';
}
