import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const userEmail = (localStorage.getItem('dt_user_email') || '').toLowerCase();
const userType = localStorage.getItem('dt_user_type');

// ⚠️ SUBSTITUA PELA SUA CHAVE DO HUGGING FACE
const HF_KEY = "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";
const HF_MODEL = "HuggingFaceH4/zephyr-7b-beta";

let notaAtual = null;
let autoSaveTimer = null;
let resultadoIA = '';
let todasNotas = [];

// ==========================================
// TOAST
// ==========================================
function toast(msg, cor = '#8a2be2') {
    const el = document.getElementById('toast-caderno');
    el.innerText = msg;
    el.style.borderColor = cor + '66';
    el.style.display = 'block';
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.style.display = 'none', 300); }, 2500);
}

// ==========================================
// CARREGAR NOTAS
// ==========================================
async function carregarNotas() {
    if (!userEmail || userType === 'local') {
        todasNotas = JSON.parse(localStorage.getItem('dt_caderno') || '[]');
        renderizarLista(todasNotas);
        return;
    }
    try {
        const q = query(collection(db, "caderno"), where("usuario", "==", userEmail));
        const snap = await getDocs(q);
        todasNotas = [];
        snap.forEach(d => todasNotas.push({ id: d.id, ...d.data() }));
        todasNotas.sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0));
        renderizarLista(todasNotas);
    } catch(e) { console.error(e); }
}

function renderizarLista(notas) {
    const lista = document.getElementById('lista-notas');
    const sub = document.getElementById('sub-contagem');
    sub.innerText = notas.length === 0 ? 'Nenhuma nota' : `${notas.length} nota${notas.length > 1 ? 's' : ''}`;

    if (notas.length === 0) {
        lista.innerHTML = `<div class="empty-caderno"><div class="empty-icon">📓</div><p>Nenhuma nota ainda</p><span>Toque no + para criar sua primeira nota</span></div>`;
        return;
    }

    const fixadas = notas.filter(n => n.fixada);
    const normais = notas.filter(n => !n.fixada);
    const ordenadas = [...fixadas, ...normais];

    lista.innerHTML = ordenadas.map(n => {
        const preview = n.corpo ? n.corpo.replace(/<[^>]*>/g, '').slice(0, 80) : '';
        const data = n.atualizadoEm ? new Date(n.atualizadoEm).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}) : '';
        const temAnexo = n.anexoNome || n.fotoLocal;
        return `
        <div class="nota-card ${n.fixada ? 'fixada' : ''}" onclick="abrirNota('${n.id}')">
            <div class="nota-card-header">
                <span class="nota-card-titulo">${n.titulo || 'Sem título'}</span>
                ${n.fixada ? '<span class="nota-card-pin">📌</span>' : ''}
            </div>
            ${preview ? `<p class="nota-card-preview">${preview}</p>` : ''}
            <div class="nota-card-footer">
                <span class="nota-card-data">${data}</span>
                <div style="display:flex; gap:6px; align-items:center;">
                    ${temAnexo ? '<span class="nota-card-tag">📎 ANEXO</span>' : ''}
                    ${n.fixada ? '<span class="nota-card-tag">📌 FIXADA</span>' : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// NOVA NOTA
// ==========================================
window.novaNota = async function() {
    const nova = {
        titulo: '', corpo: '', fixada: false,
        usuario: userEmail, fotoLocal: null, anexoNome: null,
        criadoEm: Date.now(), atualizadoEm: Date.now()
    };
    if (userType === 'local' || !userEmail) {
        nova.id = 'local_' + Date.now();
        todasNotas.unshift(nova);
        localStorage.setItem('dt_caderno', JSON.stringify(todasNotas));
        abrirEditor(nova);
    } else {
        try {
            const ref = await addDoc(collection(db, "caderno"), nova);
            nova.id = ref.id;
            todasNotas.unshift(nova);
            abrirEditor(nova);
        } catch(e) { console.error(e); }
    }
};

// ==========================================
// ABRIR NOTA
// ==========================================
window.abrirNota = function(id) {
    const nota = todasNotas.find(n => n.id === id);
    if (nota) abrirEditor(nota);
};

function abrirEditor(nota) {
    // Busca dados locais atualizados (foto/arquivo ficam só no localStorage)
    const local = JSON.parse(localStorage.getItem('dt_caderno') || '[]');
    const localNota = local.find(n => n.id === nota.id);
    if (localNota) {
        nota.fotoLocal = localNota.fotoLocal || nota.fotoLocal;
        nota.anexoNome = localNota.anexoNome || nota.anexoNome;
        nota.anexoBase64 = localNota.anexoBase64 || nota.anexoBase64;
    }

    notaAtual = nota;
    document.getElementById('tela-lista').style.display = 'none';
    document.getElementById('tela-editor').style.display = 'block';
    document.getElementById('titulo-nota').value = nota.titulo || '';
    document.getElementById('corpo-editor').innerHTML = nota.corpo || '';
    document.getElementById('editor-status').innerText = 'Salvo ✓';
    document.getElementById('editor-status').style.color = '#2ecc71';

    // Botão de fixar
    const btnFixar = document.getElementById('btn-fixar');
    if (btnFixar) btnFixar.style.color = nota.fixada ? '#8a2be2' : '#555';

    // Foto
    const fotoPreview = document.getElementById('foto-preview');
    const fotoContainer = document.getElementById('foto-container');
    if (fotoPreview) {
        if (nota.fotoLocal) {
            fotoPreview.src = nota.fotoLocal;
            fotoPreview.style.display = 'block';
            if (fotoContainer) fotoContainer.style.display = 'block';
        } else {
            fotoPreview.style.display = 'none';
            if (fotoContainer) fotoContainer.style.display = 'none';
        }
    }

    // Arquivo
    const anexoInfo = document.getElementById('anexo-info');
    if (anexoInfo) {
        anexoInfo.style.display = nota.anexoNome ? 'flex' : 'none';
        const nomeEl = document.getElementById('anexo-nome');
        if (nomeEl) nomeEl.innerText = nota.anexoNome || '';
    }

    contarPalavras();
    window.scrollTo(0, 0);
    setTimeout(() => { if (!nota.titulo) document.getElementById('titulo-nota').focus(); }, 100);
}

// ==========================================
// VOLTAR
// ==========================================
window.voltarLista = function() {
    if (autoSaveTimer) { clearTimeout(autoSaveTimer); salvarNota(); }
    document.getElementById('tela-editor').style.display = 'none';
    document.getElementById('tela-lista').style.display = 'block';
    notaAtual = null;
    carregarNotas();
};

// ==========================================
// AUTO SAVE
// ==========================================
window.autoSave = function() {
    const statusEl = document.getElementById('editor-status');
    statusEl.innerText = 'Editando...';
    statusEl.style.color = '#555';
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(salvarNota, 1500);
};

async function salvarNota() {
    if (!notaAtual) return;
    const titulo = document.getElementById('titulo-nota').value;
    const corpo = document.getElementById('corpo-editor').innerHTML;
    notaAtual.titulo = titulo;
    notaAtual.corpo = corpo;
    notaAtual.atualizadoEm = Date.now();

    const statusEl = document.getElementById('editor-status');

    if (userType === 'local' || !userEmail) {
        const idx = todasNotas.findIndex(n => n.id === notaAtual.id);
        if (idx !== -1) todasNotas[idx] = notaAtual;
        localStorage.setItem('dt_caderno', JSON.stringify(todasNotas));
    } else {
        try {
            await updateDoc(doc(db, "caderno", notaAtual.id), {
                titulo, corpo, atualizadoEm: Date.now(),
                fixada: notaAtual.fixada,
                anexoNome: notaAtual.anexoNome || null
            });
        } catch(e) { console.error(e); }
    }
    statusEl.innerText = 'Salvo ✓';
    statusEl.style.color = '#2ecc71';
}

// ==========================================
// FIXAR NOTA
// ==========================================
window.toggleFixar = async function() {
    if (!notaAtual) return;
    notaAtual.fixada = !notaAtual.fixada;
    const btnFixar = document.getElementById('btn-fixar');
    if (btnFixar) btnFixar.style.color = notaAtual.fixada ? '#8a2be2' : '#555';
    toast(notaAtual.fixada ? '📌 Nota fixada!' : 'Nota desafixada');
    await salvarNota();
};

// ==========================================
// EXCLUIR NOTA (modal bonito)
// ==========================================
window.excluirNota = function() {
    document.getElementById('modal-excluir-nota').style.display = 'flex';
};

window.confirmarExcluirNota = async function() {
    document.getElementById('modal-excluir-nota').style.display = 'none';
    if (!notaAtual) return;
    if (userType === 'local' || !userEmail) {
        todasNotas = todasNotas.filter(n => n.id !== notaAtual.id);
        localStorage.setItem('dt_caderno', JSON.stringify(todasNotas));
    } else {
        try { await deleteDoc(doc(db, "caderno", notaAtual.id)); } catch(e) { console.error(e); }
    }
    voltarLista();
    toast('Nota excluída');
};

window.cancelarExcluirNota = function() {
    document.getElementById('modal-excluir-nota').style.display = 'none';
};

// ==========================================
// FOTO
// ==========================================
window.abrirFoto = function() {
    document.getElementById('input-foto').click();
};

window.processarFoto = function(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        if (!notaAtual) return;
        notaAtual.fotoLocal = e.target.result;
        const fotoPreview = document.getElementById('foto-preview');
        const fotoContainer = document.getElementById('foto-container');
        if (fotoPreview) { fotoPreview.src = e.target.result; fotoPreview.style.display = 'block'; }
        if (fotoContainer) fotoContainer.style.display = 'block';
        // Salva localmente E no Firebase
        const idx = todasNotas.findIndex(n => n.id === notaAtual.id);
        if (idx !== -1) todasNotas[idx] = notaAtual;
        localStorage.setItem('dt_caderno', JSON.stringify(todasNotas));
        if (userType !== 'local' && userEmail && notaAtual.id && !notaAtual.id.startsWith('local_')) {
            try { await updateDoc(doc(db, "caderno", notaAtual.id), { fotoLocal: e.target.result, atualizadoEm: Date.now() }); } catch(e) { console.error(e); }
        }
        toast('📸 Foto adicionada!');
    };
    reader.readAsDataURL(file);
};

window.removerFoto = async function() {
    if (!notaAtual) return;
    notaAtual.fotoLocal = null;
    const fotoPreview = document.getElementById('foto-preview');
    const fotoContainer = document.getElementById('foto-container');
    if (fotoPreview) fotoPreview.style.display = 'none';
    if (fotoContainer) fotoContainer.style.display = 'none';
    const idx = todasNotas.findIndex(n => n.id === notaAtual.id);
    if (idx !== -1) todasNotas[idx] = notaAtual;
    localStorage.setItem('dt_caderno', JSON.stringify(todasNotas));
    if (userType !== 'local' && userEmail && notaAtual.id && !notaAtual.id.startsWith('local_')) {
        try { await updateDoc(doc(db, "caderno", notaAtual.id), { fotoLocal: null, atualizadoEm: Date.now() }); } catch(e) { console.error(e); }
    }
    toast('Foto removida');
};

// ==========================================
// ARQUIVO
// ==========================================
window.abrirArquivo = function() {
    document.getElementById('input-arquivo').click();
};

window.processarArquivo = function(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    if (!notaAtual) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        notaAtual.anexoNome = file.name;
        notaAtual.anexoTipo = file.type;
        notaAtual.anexoBase64 = e.target.result;
        const anexoInfo = document.getElementById('anexo-info');
        const nomeEl = document.getElementById('anexo-nome');
        if (anexoInfo) anexoInfo.style.display = 'flex';
        if (nomeEl) nomeEl.innerText = file.name;
        // Salva localmente
        const idx = todasNotas.findIndex(n => n.id === notaAtual.id);
        if (idx !== -1) todasNotas[idx] = notaAtual;
        localStorage.setItem('dt_caderno', JSON.stringify(todasNotas));
        toast('📎 Arquivo anexado!');
    };
    reader.readAsDataURL(file);
};

window.abrirAnexo = function() {
    if (!notaAtual || !notaAtual.anexoBase64) { toast('Arquivo não disponível', '#ff4444'); return; }
    const link = document.createElement('a');
    link.href = notaAtual.anexoBase64;
    link.download = notaAtual.anexoNome || 'arquivo';
    link.click();
};

window.removerArquivo = function() {
    if (!notaAtual) return;
    notaAtual.anexoNome = null;
    notaAtual.anexoTipo = null;
    const anexoInfo = document.getElementById('anexo-info');
    if (anexoInfo) anexoInfo.style.display = 'none';
    autoSave();
    toast('Arquivo removido');
};

// ==========================================
// FORMATAÇÃO
// ==========================================
window.formatar = function(cmd) {
    document.getElementById('corpo-editor').focus();
    document.execCommand(cmd, false, null);
    autoSave();
};

window.inserirSeparador = function() {
    document.getElementById('corpo-editor').focus();
    document.execCommand('insertHTML', false, '<hr>');
    autoSave();
};

window.inserirChecklist = function() {
    document.getElementById('corpo-editor').focus();
    const id = 'chk_' + Date.now();
    const html = `<div class="check-item" id="${id}"><input type="checkbox" onchange="toggleCheck('${id}')"><span contenteditable="true">Item</span></div>`;
    document.execCommand('insertHTML', false, html);
    autoSave();
};

window.toggleCheck = function(id) {
    const item = document.getElementById(id);
    if (item) { item.classList.toggle('concluido'); autoSave(); }
};

window.handleEditorKey = function(e) {
    if (e.key === 'Enter') {
        const sel = window.getSelection();
        if (sel?.anchorNode) {
            const checkItem = sel.anchorNode.closest?.('.check-item');
            if (checkItem) {
                e.preventDefault();
                const id = 'chk_' + Date.now();
                const html = `<div class="check-item" id="${id}"><input type="checkbox" onchange="toggleCheck('${id}')"><span contenteditable="true"></span></div>`;
                document.execCommand('insertHTML', false, html);
                autoSave();
            }
        }
    }
};

// ==========================================
// CONTADOR DE PALAVRAS
// ==========================================
window.contarPalavras = function() {
    const texto = document.getElementById('corpo-editor').innerText || '';
    const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0;
    document.getElementById('contador-palavras').innerText = palavras + ' palavra' + (palavras !== 1 ? 's' : '');
};

// ==========================================
// BUSCA
// ==========================================
window.filtrarNotas = function() {
    const termo = document.getElementById('campo-busca').value.toLowerCase();
    if (!termo) { renderizarLista(todasNotas); return; }
    const filtradas = todasNotas.filter(n =>
        (n.titulo || '').toLowerCase().includes(termo) ||
        (n.corpo || '').replace(/<[^>]*>/g, '').toLowerCase().includes(termo)
    );
    renderizarLista(filtradas);
};

// ==========================================
// IA DO CADERNO (Hugging Face)
// ==========================================
window.abrirMenuIA = function() {
    document.getElementById('menu-ia').style.display = 'flex';
    document.getElementById('ia-resultado').style.display = 'none';
    document.getElementById('ia-acoes').style.display = 'none';
    if (window.lucide) lucide.createIcons();
};

window.fecharMenuIA = function() {
    document.getElementById('menu-ia').style.display = 'none';
    resultadoIA = '';
};

window.usarIA = async function(acao) {
    const corpo = document.getElementById('corpo-editor').innerText || '';
    const titulo = document.getElementById('titulo-nota').value || '';

    if (!corpo.trim() && !titulo.trim()) {
        toast('Escreva algo primeiro!', '#ff4444');
        return;
    }

    const prompts = {
        resumir:  `Resuma a seguinte nota de estudo em tópicos principais, em português brasileiro. Seja conciso:\n\n${titulo}\n${corpo}`,
        explicar: `Explique o conteúdo abaixo de forma simples e clara para um estudante do ensino médio, em português brasileiro:\n\n${titulo}\n${corpo}`,
        lista:    `Transforme o texto abaixo em uma lista de bullet points bem organizada, em português brasileiro:\n\n${titulo}\n${corpo}`,
        questoes: `Crie 5 questões de estudo com respostas curtas baseadas no conteúdo abaixo, em português brasileiro:\n\n${titulo}\n${corpo}`,
        melhorar: `Melhore a escrita do texto abaixo, tornando-o mais claro e bem estruturado. Mantenha o conteúdo original, em português brasileiro:\n\n${corpo}`,
        informal: `Reescreva o texto abaixo de forma mais casual e informal, como explicando para um amigo, em português brasileiro:\n\n${corpo}`
    };

    const resultadoEl = document.getElementById('ia-resultado');
    const acoesEl = document.getElementById('ia-acoes');

    resultadoEl.style.display = 'block';
    resultadoEl.innerHTML = `<div class="ia-loading"><div class="ia-dot"></div><div class="ia-dot"></div><div class="ia-dot"></div></div>`;
    acoesEl.style.display = 'none';

    try {
        const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: `<|system|>\nVocê é um assistente de estudos útil que responde em português brasileiro.</s>\n<|user|>\n${prompts[acao]}</s>\n<|assistant|>`,
                parameters: { max_new_tokens: 500, temperature: 0.7, return_full_text: false }
            })
        });

        const data = await response.json();
        
        if (data.error) {
            resultadoEl.innerText = 'IA indisponível no momento. Tente novamente.';
            return;
        }

        resultadoIA = Array.isArray(data) ? data[0]?.generated_text || '' : data?.generated_text || '';
        resultadoIA = resultadoIA.replace(/\[\/INST\]/g, '').trim();
        
        resultadoEl.innerText = resultadoIA;
        acoesEl.style.display = 'flex';
    } catch(e) {
        resultadoEl.innerText = 'Erro ao conectar com a IA.';
        console.error(e);
    }
};

window.aceitarIA = function() {
    if (!resultadoIA) return;
    const editor = document.getElementById('corpo-editor');
    editor.innerHTML += '<hr><p>' + resultadoIA.replace(/\n/g, '<br>') + '</p>';
    fecharMenuIA();
    autoSave();
    toast('✓ Resultado aplicado!');
};

// ======================================
