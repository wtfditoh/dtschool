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
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => { el.style.display = 'none'; }, 300); }, 2000);
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
        const q = query(collection(db, "caderno"), where("usuario", "==", userEmail), orderBy("atualizadoEm", "desc"));
        const snap = await getDocs(q);
        todasNotas = [];
        snap.forEach(d => todasNotas.push({ id: d.id, ...d.data() }));
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
        return `
        <div class="nota-card ${n.fixada ? 'fixada' : ''}" onclick="abrirNota('${n.id}')">
            <div class="nota-card-header">
                <span class="nota-card-titulo">${n.titulo || 'Sem título'}</span>
                ${n.fixada ? '<span class="nota-card-pin">📌</span>' : ''}
            </div>
            ${preview ? `<p class="nota-card-preview">${preview}</p>` : ''}
            <div class="nota-card-footer">
                <span class="nota-card-data">${data}</span>
                ${n.fixada ? '<span class="nota-card-tag">FIXADA</span>' : ''}
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// NOVA NOTA
// ==========================================
window.novaNota = async function() {
    const nova = {
        titulo: '',
        corpo: '',
        fixada: false,
        usuario: userEmail,
        criadoEm: Date.now(),
        atualizadoEm: Date.now()
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
// ABRIR NOTA EXISTENTE
// ==========================================
window.abrirNota = function(id) {
    const nota = todasNotas.find(n => n.id === id);
    if (nota) abrirEditor(nota);
};

function abrirEditor(nota) {
    notaAtual = nota;
    document.getElementById('tela-lista').style.display = 'none';
    document.getElementById('tela-editor').style.display = 'block';
    document.getElementById('titulo-nota').value = nota.titulo || '';
    document.getElementById('corpo-editor').innerHTML = nota.corpo || '';
    document.getElementById('editor-status').innerText = 'Salvo';
    contarPalavras();
    window.scrollTo(0, 0);
    setTimeout(() => {
        if (!nota.titulo) document.getElementById('titulo-nota').focus();
    }, 100);
}

// ==========================================
// VOLTAR PRA LISTA
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
    document.getElementById('editor-status').innerText = 'Editando...';
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

    document.getElementById('editor-status').innerText = 'Salvando...';

    if (userType === 'local' || !userEmail) {
        const idx = todasNotas.findIndex(n => n.id === notaAtual.id);
        if (idx !== -1) todasNotas[idx] = notaAtual;
        localStorage.setItem('dt_caderno', JSON.stringify(todasNotas));
    } else {
        try {
            await updateDoc(doc(db, "caderno", notaAtual.id), { titulo, corpo, atualizadoEm: Date.now() });
        } catch(e) { console.error(e); }
    }
    document.getElementById('editor-status').innerText = 'Salvo ✓';
}

// ==========================================
// EXCLUIR NOTA
// ==========================================
window.excluirNota = async function() {
    if (!notaAtual) return;
    if (!confirm('Excluir essa nota?')) return;

    if (userType === 'local' || !userEmail) {
        todasNotas = todasNotas.filter(n => n.id !== notaAtual.id);
        localStorage.setItem('dt_caderno', JSON.stringify(todasNotas));
    } else {
        try { await deleteDoc(doc(db, "caderno", notaAtual.id)); } catch(e) { console.error(e); }
    }
    voltarLista();
    toast('Nota excluída');
};

// ==========================================
// FORMATAÇÃO
// ==========================================
window.formatar = function(cmd) {
    document.getElementById('corpo-editor').focus();
    document.execCommand(cmd, false, null);
};

window.inserirSeparador = function() {
    document.getElementById('corpo-editor').focus();
    document.execCommand('insertHTML', false, '<hr>');
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
    if (item) {
        item.classList.toggle('concluido');
        autoSave();
    }
};

window.handleEditorKey = function(e) {
    if (e.key === 'Enter') {
        const sel = window.getSelection();
        if (sel && sel.anchorNode) {
            const checkItem = sel.anchorNode.closest && sel.anchorNode.closest('.check-item');
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
// IA DO CADERNO
// ==========================================
window.abrirMenuIA = function() {
    const menu = document.getElementById('menu-ia');
    menu.style.display = 'flex';
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

    if (!corpo && !titulo) {
        toast('Escreva algo primeiro!', '#ff4444');
        return;
    }

    const prompts = {
        resumir:  `Resuma a seguinte nota de estudo em poucos pontos principais, em português:\n\n${titulo}\n${corpo}`,
        explicar: `Explique o conteúdo abaixo de forma simples e clara, como se fosse pra um estudante do ensino médio, em português:\n\n${titulo}\n${corpo}`,
        lista:    `Transforme o texto abaixo em uma lista de bullet points organizada, em português:\n\n${titulo}\n${corpo}`,
        questoes: `Crie 5 questões de estudo baseadas no conteúdo abaixo, com respostas curtas, em português:\n\n${titulo}\n${corpo}`,
        melhorar: `Melhore a escrita do texto abaixo, tornando-o mais claro e bem estruturado, mantendo o conteúdo original, em português:\n\n${corpo}`,
        informal: `Reescreva o texto abaixo de forma mais casual e informal, como se estivesse explicando pra um amigo, em português:\n\n${corpo}`
    };

    const resultadoEl = document.getElementById('ia-resultado');
    const acoesEl = document.getElementById('ia-acoes');

    resultadoEl.style.display = 'block';
    resultadoEl.innerHTML = `<div class="ia-loading"><div class="ia-dot"></div><div class="ia-dot"></div><div class="ia-dot"></div></div>`;
    acoesEl.style.display = 'none';

    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                messages: [{ role: "user", content: prompts[acao] }]
            })
        });
        const data = await response.json();
        resultadoIA = data.content?.[0]?.text || 'Erro ao gerar resposta.';
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
    editor.innerHTML += '<hr>' + resultadoIA.replace(/\n/g, '<br>');
    fecharMenuIA();
    autoSave();
    toast('Resultado aplicado ✓');
};

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    carregarNotas();
    if (window.lucide) lucide.createIcons();
});
