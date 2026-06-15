/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN CONCURSOS - JS com Firebase
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

// ── VARIÁVEIS ────────────────────────────────────────────────────────────────
let db, storage;
let todasProvas = [];
let modoEdicao = null; // ID do doc sendo editado
let uploadTipo = 'pdf'; // 'pdf', 'csv', 'url'

// ── INICIALIZAR ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        storage = firebase.storage();
        console.log('✅ Firebase admin conectado!');
        carregarStats();
        carregarTabela();
    } catch (e) {
        console.error('❌ Firebase:', e);
        mostrarErro('Erro ao conectar ao Firebase');
    }
});

// ── TABS ─────────────────────────────────────────────────────────────────────
function irParaAba(aba) {
    document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('ativo'));
    document.getElementById(`secao-${aba}`).classList.add('ativa');
    document.getElementById(`tab-${aba}`).classList.add('ativo');
    if (aba === 'gerenciar') carregarTabela();
    if (window.lucide) lucide.createIcons();
}

// ── UPLOAD TABS ──────────────────────────────────────────────────────────────
function trocarUpload(tipo) {
    uploadTipo = tipo;
    document.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('ativo'));
    document.querySelectorAll('.upload-section').forEach(s => s.classList.remove('ativa'));
    document.getElementById(`tab-${tipo}`).classList.add('ativo');
    document.getElementById(`upload-${tipo}`).classList.add('ativa');
}

// ── ARQUIVO SELECIONADO ───────────────────────────────────────────────────────
function arquivoSelecionado(input) {
    const f = input.files ? input.files[0] : input[0];
    if (!f) return;
    const mb = (f.size / 1024 / 1024).toFixed(1);
    document.getElementById('f-pdf-nome').textContent = `✅ ${f.name} (${mb} MB)`;
    // Preenche tamanho automático
    document.querySelector('#f-questoes') && null;
}

function csvSelecionado(input) {
    const f = input.files[0];
    if (!f) return;
    document.getElementById('f-csv-nome').textContent = `✅ ${f.name}`;
    lerCSV(f);
}

// ── LER CSV ───────────────────────────────────────────────────────────────────
async function lerCSV(file) {
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const header = lines[0].split(',');
    const questoes = lines.slice(1).map(line => {
        const cols = line.match(/(".*?"|[^,]+)/g) || [];
        const clean = cols.map(c => c.replace(/^"|"$/g, '').trim());
        return {
            titulo:     clean[0] || '',
            enunciado:  clean[1] || '',
            a:          clean[2] || '',
            b:          clean[3] || '',
            c:          clean[4] || '',
            d:          clean[5] || '',
            e:          clean[6] || '',
            gabarito:   clean[7] || '',
            disciplina: clean[8] || '',
            nivel:      clean[9] || 'medio'
        };
    });
    console.log(`📊 ${questoes.length} questões lidas do CSV`);
    mostrarSucesso(`${questoes.length} questões lidas! Clique em Salvar para importar.`);
    window._csvQuestoes = questoes;
}

// ── SALVAR ───────────────────────────────────────────────────────────────────
async function salvar() {
    const titulo  = document.getElementById('f-titulo').value.trim();
    const inst    = document.getElementById('f-inst').value;
    const tipo    = document.getElementById('f-tipo').value;
    const disc    = document.getElementById('f-disc').value;
    const ano     = document.getElementById('f-ano').value;
    const questoes = document.getElementById('f-questoes').value;
    const desc    = document.getElementById('f-desc').value.trim();

    if (!titulo || !inst || !tipo || !ano) {
        mostrarErro('Preencha todos os campos obrigatórios!');
        return;
    }

    const btn = document.getElementById('btn-salvar');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Salvando...';

    try {
        let urlFinal = '';
        let nomeArquivo = '';
        let tamanho = '';

        // ── UPLOAD PDF ──────────────────────────────────────────
        if (uploadTipo === 'pdf') {
            const file = document.getElementById('f-pdf').files[0];
            if (file) {
                const mb = (file.size / 1024 / 1024).toFixed(1);
                tamanho = `${mb} MB`;
                nomeArquivo = `${inst}-${ano}-${tipo}-${Date.now()}.pdf`;

                // Mostra barra de progresso
                document.getElementById('progress-wrap').style.display = 'block';
                const ref = storage.ref(`concursos/${nomeArquivo}`);
                const task = ref.put(file);

                urlFinal = await new Promise((resolve, reject) => {
                    task.on('state_changed',
                        snap => {
                            const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
                            document.getElementById('progress-fill').style.width = pct + '%';
                        },
                        reject,
                        async () => resolve(await ref.getDownloadURL())
                    );
                });
            }
        }

        // ── URL DIRETA ──────────────────────────────────────────
        if (uploadTipo === 'url') {
            urlFinal = document.getElementById('f-url').value.trim();
            if (!urlFinal) {
                mostrarErro('Insira uma URL válida!');
                resetBtn();
                return;
            }
        }

        // ── CSV (importar questões) ──────────────────────────────
        if (uploadTipo === 'csv' && window._csvQuestoes) {
            // Salva cada questão como sub-coleção depois
        }

        // ── SALVAR/ATUALIZAR FIRESTORE ───────────────────────────
        const dados = {
            titulo, instituicao: inst, tipo, disciplina: disc,
            ano: parseInt(ano), descricao: desc,
            questoes: questoes ? parseInt(questoes) : null,
            arquivo: nomeArquivo, url: urlFinal,
            tamanho, status: 'ativo',
            data: new Date().toISOString(),
            criadoPor: localStorage.getItem('dt_user_email') || 'admin'
        };

        if (modoEdicao) {
            await db.collection('concursos').doc(modoEdicao).update(dados);
            mostrarSucesso(`✅ "${titulo}" atualizado com sucesso!`);
            modoEdicao = null;
        } else {
            await db.collection('concursos').add(dados);
            mostrarSucesso(`✅ "${titulo}" adicionado com sucesso!`);
        }

        // Importa questões CSV se tiver
        if (uploadTipo === 'csv' && window._csvQuestoes?.length) {
            // (futuramente salva sub-coleção de questões)
            window._csvQuestoes = null;
        }

        limparForm();
        carregarStats();

    } catch (e) {
        console.error('❌ Erro ao salvar:', e);
        mostrarErro(`Erro: ${e.message}`);
    } finally {
        resetBtn();
        document.getElementById('progress-wrap').style.display = 'none';
        document.getElementById('progress-fill').style.width = '0%';
    }
}

function resetBtn() {
    const btn = document.getElementById('btn-salvar');
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="save" style="width:16px;height:16px;"></i> Salvar Prova';
    if (window.lucide) lucide.createIcons();
}

// ── LIMPAR FORM ───────────────────────────────────────────────────────────────
function limparForm() {
    document.getElementById('f-titulo').value = '';
    document.getElementById('f-inst').value = '';
    document.getElementById('f-tipo').value = '';
    document.getElementById('f-disc').value = 'Geral';
    document.getElementById('f-ano').value = '';
    document.getElementById('f-questoes').value = '';
    document.getElementById('f-desc').value = '';
    document.getElementById('f-pdf-nome').textContent = '';
    document.getElementById('f-url').value = '';
    modoEdicao = null;
}

// ── CARREGAR TABELA ───────────────────────────────────────────────────────────
async function carregarTabela() {
    const tbody = document.getElementById('tbl-body');
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty"><div class="spinner"></div></td></tr>';

    try {
        const snap = await db.collection('concursos').orderBy('data', 'desc').get();
        todasProvas = [];
        snap.forEach(doc => todasProvas.push({ id: doc.id, ...doc.data() }));
        renderizarTabela(todasProvas);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">❌ Erro ao carregar</td></tr>`;
        mostrarErro(`Erro: ${e.message}`);
    }
}

function renderizarTabela(lista) {
    const tbody = document.getElementById('tbl-body');
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">📭 Nenhuma prova ainda</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(p => `
        <tr>
            <td><strong style="color:#ddd;">${p.titulo}</strong></td>
            <td>${p.instituicao || '--'}</td>
            <td><span class="badge-tipo badge-${p.tipo}">${labelTipo(p.tipo)}</span></td>
            <td>${p.disciplina || '--'}</td>
            <td>${p.ano || '--'}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-tbl btn-edit" onclick="editar('${p.id}')">✏️ Editar</button>
                    <button class="btn-tbl btn-del" onclick="deletar('${p.id}', '${p.titulo?.replace(/'/g, '')}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ── FILTRAR TABELA ────────────────────────────────────────────────────────────
function filtrarTabela() {
    const termo = document.getElementById('tbl-busca').value.toLowerCase();
    const filtradas = todasProvas.filter(p =>
        p.titulo?.toLowerCase().includes(termo) ||
        p.instituicao?.toLowerCase().includes(termo) ||
        p.disciplina?.toLowerCase().includes(termo)
    );
    renderizarTabela(filtradas);
}

// ── EDITAR ───────────────────────────────────────────────────────────────────
async function editar(id) {
    const prova = todasProvas.find(p => p.id === id);
    if (!prova) return;

    modoEdicao = id;
    document.getElementById('f-titulo').value = prova.titulo || '';
    document.getElementById('f-inst').value = prova.instituicao || '';
    document.getElementById('f-tipo').value = prova.tipo || '';
    document.getElementById('f-disc').value = prova.disciplina || 'Geral';
    document.getElementById('f-ano').value = prova.ano || '';
    document.getElementById('f-questoes').value = prova.questoes || '';
    document.getElementById('f-desc').value = prova.descricao || '';

    if (prova.url) {
        trocarUpload('url');
        document.getElementById('f-url').value = prova.url;
    }

    irParaAba('adicionar');
    mostrarSucesso(`✏️ Editando: ${prova.titulo}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── DELETAR ───────────────────────────────────────────────────────────────────
async function deletar(id, titulo) {
    if (!confirm(`⚠️ Deletar "${titulo}"?\n\nEssa ação não pode ser desfeita.`)) return;
    try {
        await db.collection('concursos').doc(id).delete();
        mostrarSucesso(`✅ "${titulo}" deletado!`);
        carregarTabela();
        carregarStats();
    } catch (e) {
        mostrarErro(`Erro ao deletar: ${e.message}`);
    }
}

// ── STATS ─────────────────────────────────────────────────────────────────────
async function carregarStats() {
    try {
        const snap = await db.collection('concursos').get();
        let total = 0, provas = 0, sims = 0, outros = 0;
        snap.forEach(doc => {
            total++;
            const t = doc.data().tipo;
            if (t === 'prova') provas++;
            else if (t === 'simulado') sims++;
            else outros++;
        });
        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-provas').textContent = provas;
        document.getElementById('stat-simulados').textContent = sims;
        document.getElementById('stat-outros').textContent = outros;
    } catch (e) {
        console.error('Erro stats:', e);
    }
}

// ── ALERTAS ──────────────────────────────────────────────────────────────────
function mostrarSucesso(msg) {
    const el = document.getElementById('alert-ok');
    document.getElementById('alert-ok-msg').textContent = msg;
    el.classList.add('ativo');
    setTimeout(() => el.classList.remove('ativo'), 4000);
}

function mostrarErro(msg) {
    const el = document.getElementById('alert-err');
    document.getElementById('alert-err-msg').textContent = msg;
    el.classList.add('ativo');
    setTimeout(() => el.classList.remove('ativo'), 5000);
}

// ── UTILITÁRIOS ───────────────────────────────────────────────────────────────
function labelTipo(tipo) {
    const map = { prova:'Prova', simulado:'Simulado', gabarito:'Gabarito', questoes:'Questões', resumo:'Resumo', apostila:'Apostila', redacao:'Redação' };
    return map[tipo] || tipo;
}
