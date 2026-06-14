/* ═══════════════════════════════════════════════════════════════════════════
   CONCURSOS - JAVASCRIPT COM FIREBASE
   Hub Brain Edition - Biblioteca de Provas e Simulados
   ═══════════════════════════════════════════════════════════════════════════ */

// ────────────────────────────────────────────────────────────────────────────
// FIREBASE CONFIG
// ────────────────────────────────────────────────────────────────────────────

const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a",
    measurementId: "G-F7TG23TBTL"
};

// Variáveis globais
let db;
let provasExibidas = [];
let bancoPRovas = [];
let provaSelecionada = null;
let favoritos = JSON.parse(localStorage.getItem('favoritos-concursos')) || [];

// ────────────────────────────────────────────────────────────────────────────
// INICIALIZAR FIREBASE E CARREGAR PROVAS
// ────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializa Firebase
        const app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore(app);
        
        console.log('✅ Firebase inicializado!');
        
        // Carrega favoritos do localStorage
        carregarFavoritos();
        
        // Carrega provas do Firestore
        await carregarProvasFirestore();
        
        // Renderiza na tela
        renderizarProvas();
        
        if (window.lucide) lucide.createIcons();
    } catch (erro) {
        console.error('❌ Erro ao inicializar:', erro);
        mostrarErroInicializacao(erro.message);
    }
});

// ────────────────────────────────────────────────────────────────────────────
// CARREGAR PROVAS DO FIRESTORE
// ────────────────────────────────────────────────────────────────────────────

async function carregarProvasFirestore() {
    try {
        const snapshot = await db.collection('concursos')
            .where('status', '==', 'ativo')
            .orderBy('data', 'desc')
            .get();

        bancoPRovas = [];

        snapshot.forEach(doc => {
            const prova = doc.data();
            bancoPRovas.push({
                id: doc.id,
                titulo: prova.titulo,
                instituicao: prova.instituicao,
                disciplina: prova.disciplina,
                tipo: prova.tipo,
                ano: prova.ano,
                data: prova.data,
                arquivo: prova.arquivo,
                tamanho: prova.tamanho,
                favorito: favoritos.includes(doc.id),
                descricao: prova.descricao || ''
            });
        });

        provasExibidas = [...bancoPRovas];
        console.log(`📚 ${bancoPRovas.length} provas carregadas do Firestore!`);

    } catch (erro) {
        console.error('❌ Erro ao carregar do Firestore:', erro);
        mostrarErroInicializacao('Erro ao carregar provas do banco de dados');
    }
}

function mostrarErroInicializacao(msg) {
    const grid = document.getElementById('provas-grid');
    const emptyState = document.getElementById('empty-state');
    grid.innerHTML = '';
    emptyState.innerHTML = `
        <div class="empty-state-icon">❌</div>
        <h2 class="empty-state-title">Erro ao carregar</h2>
        <p class="empty-state-text">${msg}</p>
    `;
    emptyState.style.display = 'block';
}

// ────────────────────────────────────────────────────────────────────────────
// RENDERIZAR PROVAS
// ────────────────────────────────────────────────────────────────────────────

function renderizarProvas() {
    const grid = document.getElementById('provas-grid');
    const emptyState = document.getElementById('empty-state');
    const totalProvas = document.getElementById('total-provas');

    // Atualiza contador
    totalProvas.textContent = provasExibidas.length;

    // Mostra empty state se não há provas
    if (provasExibidas.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    // Renderiza cards
    grid.innerHTML = provasExibidas.map(prova => `
        <div class="prova-card">
            <div class="prova-header">
                <div>
                    <div class="prova-icon">${getIconoPorTipo(prova.tipo)}</div>
                    <span class="prova-tipo ${prova.tipo}">${prova.tipo.toUpperCase()}</span>
                </div>
                <button class="btn-prova btn-favoritar ${prova.favorito ? 'favoritado' : ''}" 
                        onclick="toggleFavorito(${prova.id})"
                        title="Adicionar aos favoritos">
                    <i data-lucide="star" style="width: 16px; height: 16px;"></i>
                </button>
            </div>

            <h3 class="prova-title">${prova.titulo}</h3>

            <div class="prova-instituicao">
                <i data-lucide="building" style="width: 14px; height: 14px;"></i>
                <span>${prova.instituicao}</span>
            </div>

            <div class="prova-meta">
                <div class="prova-meta-item">
                    <i data-lucide="calendar" class="prova-meta-icon"></i>
                    <span class="prova-meta-value">${prova.ano}</span>
                </div>
                <div class="prova-meta-item">
                    <i data-lucide="book" class="prova-meta-icon"></i>
                    <span class="prova-meta-value">${prova.disciplina}</span>
                </div>
                <div class="prova-meta-item">
                    <i data-lucide="file" class="prova-meta-icon"></i>
                    <span class="prova-meta-value">${prova.tamanho}</span>
                </div>
            </div>

            <div class="prova-footer">
                <button class="btn-prova btn-abrir" onclick="abrirModal(${prova.id})">
                    <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                    Abrir
                </button>
                <button class="btn-prova btn-abrir" onclick="downloadProva(${prova.id})" style="flex: 1;">
                    <i data-lucide="download" style="width: 16px; height: 16px;"></i>
                    Download
                </button>
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

// ────────────────────────────────────────────────────────────────────────────
// BUSCAR PROVAS
// ────────────────────────────────────────────────────────────────────────────

function buscarProvas() {
    const termo = document.getElementById('input-busca').value.toLowerCase();

    if (!termo) {
        aplicarFiltros();
        return;
    }

    provasExibidas = bancoPRovas.filter(prova => {
        return (
            prova.titulo.toLowerCase().includes(termo) ||
            prova.instituicao.toLowerCase().includes(termo) ||
            prova.disciplina.toLowerCase().includes(termo) ||
            prova.descricao.toLowerCase().includes(termo)
        );
    });

    renderizarProvas();
    atualizarChips();
}

// ────────────────────────────────────────────────────────────────────────────
// APLICAR FILTROS
// ────────────────────────────────────────────────────────────────────────────

function aplicarFiltros() {
    const inst = document.getElementById('filtro-inst').value;
    const disc = document.getElementById('filtro-disc').value;
    const tipo = document.getElementById('filtro-tipo').value;
    const ano = document.getElementById('filtro-ano').value;

    provasExibidas = bancoPRovas.filter(prova => {
        return (
            (!inst || prova.instituicao === inst) &&
            (!disc || prova.disciplina === disc) &&
            (!tipo || prova.tipo === tipo) &&
            (!ano || prova.ano === parseInt(ano))
        );
    });

    renderizarProvas();
    atualizarChips();
}

// ────────────────────────────────────────────────────────────────────────────
// ATUALIZAR CHIPS ATIVOS
// ────────────────────────────────────────────────────────────────────────────

function atualizarChips() {
    const chipsContainer = document.getElementById('chips-container');
    const chips = [];

    const inst = document.getElementById('filtro-inst').value;
    const disc = document.getElementById('filtro-disc').value;
    const tipo = document.getElementById('filtro-tipo').value;
    const ano = document.getElementById('filtro-ano').value;

    if (inst) chips.push({ label: inst, id: 'inst' });
    if (disc) chips.push({ label: disc, id: 'disc' });
    if (tipo) chips.push({ label: tipo.toUpperCase(), id: 'tipo' });
    if (ano) chips.push({ label: `${ano}`, id: 'ano' });

    if (chips.length === 0) {
        chipsContainer.style.display = 'none';
    } else {
        chipsContainer.style.display = 'flex';
        chipsContainer.innerHTML = chips.map(chip => `
            <div class="chip">
                ${chip.label}
                <span class="chip-close" onclick="removerChip('${chip.id}')">×</span>
            </div>
        `).join('');
    }
}

function removerChip(id) {
    const selects = {
        'inst': 'filtro-inst',
        'disc': 'filtro-disc',
        'tipo': 'filtro-tipo',
        'ano': 'filtro-ano'
    };
    document.getElementById(selects[id]).value = '';
    aplicarFiltros();
}

// ────────────────────────────────────────────────────────────────────────────
// ORDENAR PROVAS
// ────────────────────────────────────────────────────────────────────────────

function ordenarProvas() {
    const ordem = document.getElementById('sort-select').value;

    provasExibidas.sort((a, b) => {
        if (ordem === 'recente') {
            return new Date(b.data) - new Date(a.data);
        } else if (ordem === 'antigo') {
            return new Date(a.data) - new Date(b.data);
        } else if (ordem === 'nome') {
            return a.titulo.localeCompare(b.titulo);
        }
    });

    renderizarProvas();
}

// ────────────────────────────────────────────────────────────────────────────
// MODAL PDF
// ────────────────────────────────────────────────────────────────────────────

function abrirModal(id) {
    provaSelecionada = bancoPRovas.find(p => p.id === id);
    
    if (!provaSelecionada) return;

    document.getElementById('modal-titulo').textContent = provaSelecionada.titulo;
    document.getElementById('modal-texto').textContent = `Arquivo: ${provaSelecionada.arquivo} (${provaSelecionada.tamanho})`;
    document.getElementById('modal-pdf').classList.add('ativo');
}

function fecharModal() {
    document.getElementById('modal-pdf').classList.remove('ativo');
    provaSelecionada = null;
}

// ────────────────────────────────────────────────────────────────────────────
// DOWNLOAD
// ────────────────────────────────────────────────────────────────────────────

function downloadProva(id) {
    const prova = bancoPRovas.find(p => p.id === id);
    if (!prova) return;

    // Simula download (você vai adicionar o URL real do PDF depois)
    console.log(`Baixando: ${prova.arquivo}`);
    alert(`📥 Download iniciado: ${prova.titulo}\n\nArquivo: ${prova.arquivo}`);
    
    // Quando tiver arquivos reais, descomente:
    // const link = document.createElement('a');
    // link.href = `/pdfs/${prova.arquivo}`;
    // link.download = prova.arquivo;
    // link.click();
}

function downloadPDF() {
    if (provaSelecionada) {
        downloadProva(provaSelecionada.id);
        fecharModal();
    }
}

// ────────────────────────────────────────────────────────────────────────────
// FAVORITOS
// ────────────────────────────────────────────────────────────────────────────

function toggleFavorito(id) {
    const prova = bancoPRovas.find(p => p.id === id);
    if (!prova) return;

    prova.favorito = !prova.favorito;

    if (prova.favorito) {
        if (!favoritos.includes(id)) favoritos.push(id);
    } else {
        favoritos = favoritos.filter(f => f !== id);
    }

    localStorage.setItem('favoritos-concursos', JSON.stringify(favoritos));
    renderizarProvas();
}

function carregarFavoritos() {
    favoritos.forEach(id => {
        const prova = bancoPRovas.find(p => p.id === id);
        if (prova) prova.favorito = true;
    });
}

// ────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ────────────────────────────────────────────────────────────────────────────

function getIconoPorTipo(tipo) {
    const icons = {
        'prova': '📝',
        'simulado': '✏️',
        'gabarito': '✅'
    };
    return icons[tipo] || '📄';
}

// ────────────────────────────────────────────────────────────────────────────
// FECHAR MODAL AO CLICAR FORA
// ────────────────────────────────────────────────────────────────────────────

document.addEventListener('click', (e) => {
    const modal = document.getElementById('modal-pdf');
    if (e.target === modal) {
        fecharModal();
    }
});

// ────────────────────────────────────────────────────────────────────────────
// ENTER NA BUSCA
// ────────────────────────────────────────────────────────────────────────────

document.getElementById('input-busca')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        buscarProvas();
    }
});
