/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN CONCURSOS - JAVASCRIPT COM FIREBASE
   Hub Brain Edition
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

// ────────────────────────────────────────────────────────────────────────────
// INICIALIZAR
// ────────────────────────────────────────────────────────────────────────────

let db, storage, auth;
let provasCache = [];
let usuarioAtual = null;

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa Firebase
    inicializarFirebase();
    // Verifica autenticação
    verificarAutenticacao();
    // Carrega provas
    carregarProvasAdmin();
    // Listeners
    const searchInput = document.getElementById('input-busca-admin');
    if (searchInput) {
        searchInput.addEventListener('keyup', filtrarProvasAdmin);
    }
});

// ────────────────────────────────────────────────────────────────────────────
// INICIALIZAR FIREBASE
// ────────────────────────────────────────────────────────────────────────────

function inicializarFirebase() {
    try {
        const app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore(app);
        storage = firebase.storage(app);
        auth = firebase.auth(app);
        
        console.log('✅ Firebase inicializado com sucesso!');
        console.log(`📦 Projeto: dt-scho0l`);
    } catch (erro) {
        console.error('❌ Erro ao inicializar Firebase:', erro);
        mostrarErro('Erro ao conectar ao Firebase');
    }
}

// ────────────────────────────────────────────────────────────────────────────
// VERIFICAR AUTENTICAÇÃO
// ────────────────────────────────────────────────────────────────────────────

function verificarAutenticacao() {
    // Verifica se usuario está logado
    const user = localStorage.getItem('dt_user_email');
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Verifica se é admin (você pode add uma lista de admins no Firebase)
    usuarioAtual = user;
    console.log(`🔐 Admin logado: ${usuarioAtual}`);
}

// ────────────────────────────────────────────────────────────────────────────
// SALVAR PROVA
// ────────────────────────────────────────────────────────────────────────────

async function salvarProva(event) {
    event.preventDefault();

    const titulo = document.getElementById('input-titulo').value;
    const inst = document.getElementById('input-inst').value;
    const disc = document.getElementById('input-disc').value;
    const tipo = document.getElementById('input-tipo').value;
    const ano = parseInt(document.getElementById('input-ano').value);
    const tamanho = parseFloat(document.getElementById('input-tamanho').value);
    const desc = document.getElementById('input-desc').value;
    const filePDF = document.getElementById('input-pdf').files[0];

    if (!filePDF) {
        mostrarErro('Selecione um arquivo PDF!');
        return;
    }

    // Valida tamanho do arquivo (máx 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (filePDF.size > maxSize) {
        mostrarErro('Arquivo muito grande! Máximo 50MB');
        return;
    }

    mostrarCarregando('Salvando prova...');

    try {
        // Simula upload do PDF (você vai integrar Firebase Storage)
        // Por enquanto, vamos salvar só os dados no Firestore

        const nomeArquivo = `${inst}-${ano}-${tipo}-${Date.now()}.pdf`;

        // Cria documento no Firestore
        const docRef = await db.collection('concursos').add({
            titulo: titulo,
            instituicao: inst,
            disciplina: disc,
            tipo: tipo,
            ano: ano,
            tamanho: `${tamanho} MB`,
            descricao: desc,
            arquivo: nomeArquivo,
            data: new Date().toISOString(),
            criadoPor: usuarioAtual,
            status: 'ativo'
        });

        // AQUI VOCÊ VAI FAZER UPLOAD DO PDF PRO FIREBASE STORAGE
        // Por enquanto, vamos simular:
        console.log('📄 PDF seria enviado para Firebase Storage');
        console.log(`Arquivo: ${nomeArquivo} (${filePDF.size} bytes)`);

        mostrarSucesso(`✅ Prova "${titulo}" adicionada com sucesso!`);
        document.getElementById('form-prova').reset();
        document.getElementById('file-name').textContent = '';

        // Recarrega tabela
        setTimeout(() => {
            carregarProvasAdmin();
        }, 1500);

    } catch (erro) {
        console.error('❌ Erro ao salvar prova:', erro);
        mostrarErro(`Erro: ${erro.message}`);
    }
}

// ────────────────────────────────────────────────────────────────────────────
// CARREGARPROVASS (ADMIN)
// ────────────────────────────────────────────────────────────────────────────

async function carregarProvasAdmin() {
    try {
        const snapshot = await db.collection('concursos').orderBy('data', 'desc').get();
        provasCache = [];

        snapshot.forEach(doc => {
            provasCache.push({
                id: doc.id,
                ...doc.data()
            });
        });

        renderizarTabelaProvas(provasCache);

    } catch (erro) {
        console.error('❌ Erro ao carregar provas:', erro);
        mostrarErro('Erro ao carregar provas');
    }
}

// ────────────────────────────────────────────────────────────────────────────
// RENDERIZAR TABELA
// ────────────────────────────────────────────────────────────────────────────

function renderizarTabelaProvas(provas) {
    const tbody = document.getElementById('table-provas');

    if (provas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    📭 Nenhuma prova adicionada ainda
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = provas.map(prova => `
        <tr>
            <td><strong>${prova.titulo}</strong></td>
            <td>${prova.instituicao}</td>
            <td>${prova.disciplina}</td>
            <td>
                <span class="prova-status ${prova.tipo === 'prova' ? 'status-ativo' : 'status-ativo'}">
                    ${prova.tipo}
                </span>
            </td>
            <td>${prova.ano}</td>
            <td>
                <span class="prova-status status-ativo">
                    ${prova.status || 'Ativo'}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-action btn-editar" onclick="editarProva('${prova.id}')">
                        ✏️ Editar
                    </button>
                    <button class="btn-action btn-deletar" onclick="deletarProva('${prova.id}')">
                        🗑️ Deletar
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

// ────────────────────────────────────────────────────────────────────────────
// DELETAR PROVA
// ────────────────────────────────────────────────────────────────────────────

async function deletarProva(id) {
    if (!confirm('⚠️ Tem certeza que quer deletar esta prova?')) {
        return;
    }

    try {
        await db.collection('concursos').doc(id).delete();
        mostrarSucesso('✅ Prova deletada com sucesso!');
        carregarProvasAdmin();
    } catch (erro) {
        mostrarErro(`Erro ao deletar: ${erro.message}`);
    }
}

// ────────────────────────────────────────────────────────────────────────────
// EDITAR PROVA
// ────────────────────────────────────────────────────────────────────────────

async function editarProva(id) {
    const prova = provasCache.find(p => p.id === id);
    if (!prova) return;

    // Preenche form com dados
    document.getElementById('input-titulo').value = prova.titulo;
    document.getElementById('input-inst').value = prova.instituicao;
    document.getElementById('input-disc').value = prova.disciplina;
    document.getElementById('input-tipo').value = prova.tipo;
    document.getElementById('input-ano').value = prova.ano;
    document.getElementById('input-tamanho').value = prova.tamanho.replace(' MB', '');
    document.getElementById('input-desc').value = prova.descricao || '';

    // Scroll pro form
    document.getElementById('adicionar').scrollIntoView({ behavior: 'smooth' });
    mudarTab('adicionar');

    mostrarInfo(`📝 Editando: ${prova.titulo}`);
}

// ────────────────────────────────────────────────────────────────────────────
// FILTRAR PROVAS
// ────────────────────────────────────────────────────────────────────────────

function filtrarProvasAdmin() {
    const termo = document.getElementById('input-busca-admin').value.toLowerCase();

    if (!termo) {
        renderizarTabelaProvas(provasCache);
        return;
    }

    const filtradas = provasCache.filter(prova => {
        return (
            prova.titulo.toLowerCase().includes(termo) ||
            prova.instituicao.toLowerCase().includes(termo) ||
            prova.disciplina.toLowerCase().includes(termo)
        );
    });

    renderizarTabelaProvas(filtradas);
}

// ────────────────────────────────────────────────────────────────────────────
// ATUALIZAR NOME DO ARQUIVO
// ────────────────────────────────────────────────────────────────────────────

function atualizarNomeArquivo() {
    const file = document.getElementById('input-pdf').files[0];
    if (file) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        document.getElementById('file-name').textContent = `${file.name} (${sizeMB} MB)`;
    }
}

// ────────────────────────────────────────────────────────────────────────────
// ABRIR/FECHAR FORMULÁRIO
// ────────────────────────────────────────────────────────────────────────────

function abrirFormulario() {
    mudarTab('adicionar');
    document.getElementById('form-prova').reset();
    document.getElementById('file-name').textContent = '';
}

// ────────────────────────────────────────────────────────────────────────────
// MUDAR ABA
// ────────────────────────────────────────────────────────────────────────────

function mudarTab(nome) {
    // Esconde todas
    document.querySelectorAll('.form-section').forEach(s => {
        s.classList.remove('ativo');
    });

    // Remove ativo dos botões
    document.querySelectorAll('.tab-admin').forEach(t => {
        t.classList.remove('ativo');
    });

    // Mostra selecionada
    document.getElementById(nome).classList.add('ativo');

    // Marca botão como ativo
    event?.target?.classList.add('ativo');

    // Recarrega se for a aba gerenciar
    if (nome === 'gerenciar') {
        carregarProvasAdmin();
    }
}

// ────────────────────────────────────────────────────────────────────────────
// ALERTAS
// ────────────────────────────────────────────────────────────────────────────

function mostrarSucesso(mensagem) {
    const alert = document.getElementById('alert-sucesso');
    document.getElementById('alert-msg').textContent = mensagem;
    alert.classList.add('ativo');

    setTimeout(() => {
        alert.classList.remove('ativo');
    }, 4000);
}

function mostrarErro(mensagem) {
    const alert = document.getElementById('alert-erro');
    document.getElementById('alert-erro-msg').textContent = mensagem;
    alert.classList.add('ativo');

    setTimeout(() => {
        alert.classList.remove('ativo');
    }, 4000);
}

function mostrarCarregando(mensagem) {
    console.log(`⏳ ${mensagem}`);
}

function mostrarInfo(mensagem) {
    console.log(`ℹ️ ${mensagem}`);
}
