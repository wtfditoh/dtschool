// caderno-logica.js — SEM módulo ES6, funciona como script normal

const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a"
};

// Inicializa Firebase via CDN global (não módulo)
let db;
function initFirebase() {
    if (!window.firebase) return;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
}

const HF_KEY = "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";
const HF_MODEL = "google/flan-t5-large";

const userEmail = (localStorage.getItem('dt_user_email') || '').toLowerCase();
const userType = localStorage.getItem('dt_user_type');

let notaAtual = null;
let autoSaveTimer = null;
let resultadoIA = '';
let todasNotas = [];

// TOAST
function toast(msg, cor) {
    cor = cor || '#8a2be2';
    const el = document.getElementById('toast-caderno');
    if (!el) return;
    el.innerText = msg;
    el.style.borderColor = cor + '66';
    el.style.display = 'block';
    el.style.opacity = '1';
    setTimeout(function() {
        el.style.opacity = '0';
        setTimeout(function() { el.style.display = 'none'; }, 300);
    }, 2500);
}

// CARREGAR NOTAS
async function carregarNotas() {
    // Sempre carrega do localStorage primeiro
    const local = JSON.parse(localStorage.getItem('dt_caderno') || '[]');
    
    if (!userEmail || userType === 'local' || !db) {
        todasNotas = local;
        renderizarLista(todasNotas);
        return;
    }

    try {
        const snap = await db.collection("caderno").where("usuario", "==", userEmail).get();
        todasNotas = [];
        snap.forEach(function(d) {
            const nota = Object.assign({ id: d.id }, d.data());
            // Recupera foto e arquivo do localStorage
            const localNota = local.find(function(n) { return n.id === d.id; });
            if (localNota) {
                nota.fotoLocal = localNota.fotoLocal || null;
                nota.anexoNome = localNota.anexoNome || nota.anexoNome || null;
                nota.anexoBase64 = localNota.anexoBase64 || null;
            }
            todasNotas.push(nota);
        });
        todasNotas.sort(function(a, b) { return (b.atualizadoEm || 0) - (a.atualizadoEm || 0); });
        renderizarLista(todasNotas);
    } catch(e) {
        console.error(e);
        todasNotas = local;
        renderizarLista(todasNotas);
    }
}

function renderizarLista(notas) {
    const lista = document.getElementById('lista-notas');
    const sub = document.getElementById('sub-contagem');
    if (!lista) return;
    if (sub) sub.innerText = notas.length === 0 ? 'Nenhuma nota' : notas.length + ' nota' + (notas.length > 1 ? 's' : '');

    if (notas.length === 0) {
        lista.innerHTML = '<div class="empty-caderno"><div class="empty-icon">📓</div><p>Nenhuma nota ainda</p><span>Toque no + para criar sua primeira nota</span></div>';
        return;
    }

    const fixadas = notas.filter(function(n) { return n.fixada; });
    const normais = notas.filter(function(n) { return !n.fixada; });
    const ordenadas = fixadas.concat(normais);

    lista.innerHTML = ordenadas.map(function(n) {
        const preview = n.corpo ? n.corpo.replace(/<[^>]*>/g, '').slice(0, 80) : '';
        const data = n.atualizadoEm ? new Date(n.atualizadoEm).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}) : '';
        return '<div class="nota-card ' + (n.fixada ? 'fixada' : '') + '" onclick="abrirNota(\'' + n.id + '\')">' +
            '<div class="nota-card-header"><span class="nota-card-titulo">' + (n.titulo || 'Sem título') + '</span>' +
            (n.fixada ? '<span>📌</span>' : '') + '</div>' +
            (preview ? '<p class="nota-card-preview">' + preview + '</p>' : '') +
            '<div class="nota-card-footer"><span class="nota-card-data">' + data + '</span>' +
            '<div style="display:flex;gap:6px;">' +
            (n.fotoLocal ? '<span class="nota-card-tag">📸</span>' : '') +
            (n.anexoNome ? '<span class="nota-card-tag">📎</span>' : '') +
            (n.fixada ? '<span class="nota-card-tag">📌</span>' : '') +
            '</div></div></div>';
    }).join('');
}

// NOVA NOTA
window.novaNota = async function() {
    const nova = {
        titulo: '', corpo: '', fixada: false,
        usuario: userEmail, fotoLocal: null, anexoNome: null, anexoBase64: null,
        criadoEm: Date.now(), atualizadoEm: Date.now()
    };

    if (!userEmail || userType === 'local' || !db) {
        nova.id = 'local_' + Date.now();
        todasNotas.unshift(nova);
        salvarLocal();
        abrirEditor(nova);
        return;
    }

    try {
        const ref = await db.collection("caderno").add(nova);
        nova.id = ref.id;
        todasNotas.unshift(nova);
        salvarLocal();
        abrirEditor(nova);
    } catch(e) {
        console.error(e);
        nova.id = 'local_' + Date.now();
        todasNotas.unshift(nova);
        salvarLocal();
        abrirEditor(nova);
    }
};

// SALVAR LOCAL
function salvarLocal() {
    localStorage.setItem('dt_caderno', JSON.stringify(todasNotas));
}

// ABRIR NOTA
window.abrirNota = function(id) {
    const nota = todasNotas.find(function(n) { return n.id === id; });
    if (nota) abrirEditor(nota);
};

function abrirEditor(nota) {
    notaAtual = nota;
    document.getElementById('tela-lista').style.display = 'none';
    document.getElementById('tela-editor').style.display = 'block';
    document.getElementById('titulo-nota').value = nota.titulo || '';
    document.getElementById('corpo-editor').innerHTML = nota.corpo || '';

    const statusEl = document.getElementById('editor-status');
    if (statusEl) { statusEl.innerText = 'Salvo ✓'; statusEl.style.color = '#2ecc71'; }

    const btnFixar = document.getElementById('btn-fixar');
    if (btnFixar) btnFixar.style.color = nota.fixada ? '#8a2be2' : '#555';

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

    const anexoInfo = document.getElementById('anexo-info');
    if (anexoInfo) {
        anexoInfo.style.display = nota.anexoNome ? 'flex' : 'none';
        const nomeEl = document.getElementById('anexo-nome');
        if (nomeEl) nomeEl.innerText = nota.anexoNome || '';
    }

    contarPalavras();
    window.scrollTo(0, 0);
    if (window.lucide) lucide.createIcons();
    setTimeout(function() { if (!nota.titulo) document.getElementById('titulo-nota').focus(); }, 100);
}

// VOLTAR
window.voltarLista = function() {
    if (autoSaveTimer) { clearTimeout(autoSaveTimer); salvarNota(); }
    document.getElementById('tela-editor').style.display = 'none';
    document.getElementById('tela-lista').style.display = 'block';
    notaAtual = null;
    carregarNotas();
};

// AUTO SAVE
window.autoSave = function() {
    const statusEl = document.getElementById('editor-status');
    if (statusEl) { statusEl.innerText = 'Salvando...'; statusEl.style.color = '#555'; }
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(salvarNota, 1500);
};

async function salvarNota() {
    if (!notaAtual) return;
    notaAtual.titulo = document.getElementById('titulo-nota').value;
    notaAtual.corpo = document.getElementById('corpo-editor').innerHTML;
    notaAtual.atualizadoEm = Date.now();

    const idx = todasNotas.findIndex(function(n) { return n.id === notaAtual.id; });
    if (idx !== -1) todasNotas[idx] = notaAtual;
    salvarLocal();

    if (userType !== 'local' && userEmail && db && !notaAtual.id.startsWith('local_')) {
        try {
            await db.collection("caderno").doc(notaAtual.id).update({
                titulo: notaAtual.titulo,
                corpo: notaAtual.corpo,
                fixada: notaAtual.fixada,
                atualizadoEm: notaAtual.atualizadoEm,
                anexoNome: notaAtual.anexoNome || null
            });
        } catch(e) { console.error(e); }
    }

    const statusEl = document.getElementById('editor-status');
    if (statusEl) { statusEl.innerText = 'Salvo ✓'; statusEl.style.color = '#2ecc71'; }
}

// FIXAR
window.toggleFixar = async function() {
    if (!notaAtual) return;
    notaAtual.fixada = !notaAtual.fixada;
    const btnFixar = document.getElementById('btn-fixar');
    if (btnFixar) btnFixar.style.color = notaAtual.fixada ? '#8a2be2' : '#555';
    toast(notaAtual.fixada ? '📌 Nota fixada!' : 'Nota desafixada');
    await salvarNota();
};

// ROTINA DIÁRIA
window.toggleRotina = async function() {
    if (!notaAtual) return;
    notaAtual.rotinaDiaria = !notaAtual.rotinaDiaria;
    var btnRotina = document.getElementById('btn-rotina');
    if (btnRotina) {
        btnRotina.style.color = notaAtual.rotinaDiaria ? '#2ecc71' : '#555';
        btnRotina.title = notaAtual.rotinaDiaria ? 'Rotina ativa' : 'Marcar como rotina diária';
    }
    toast(notaAtual.rotinaDiaria ? '🔄 Rotina diária ativada!' : 'Rotina desativada');
    await salvarNota();
};

// EXCLUIR
window.excluirNota = function() {
    document.getElementById('modal-excluir-nota').style.display = 'flex';
};

window.confirmarExcluirNota = async function() {
    document.getElementById('modal-excluir-nota').style.display = 'none';
    if (!notaAtual) return;
    todasNotas = todasNotas.filter(function(n) { return n.id !== notaAtual.id; });
    salvarLocal();
    if (userType !== 'local' && userEmail && db && !notaAtual.id.startsWith('local_')) {
        try { await db.collection("caderno").doc(notaAtual.id).delete(); } catch(e) { console.error(e); }
    }
    voltarLista();
    toast('Nota excluída');
};

window.cancelarExcluirNota = function() {
    document.getElementById('modal-excluir-nota').style.display = 'none';
};

// FOTO
window.abrirFoto = function() { document.getElementById('input-foto').click(); };

window.processarFoto = function(input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        if (!notaAtual) return;
        notaAtual.fotoLocal = e.target.result;
        const fotoPreview = document.getElementById('foto-preview');
        const fotoContainer = document.getElementById('foto-container');
        if (fotoPreview) { fotoPreview.src = e.target.result; fotoPreview.style.display = 'block'; }
        if (fotoContainer) fotoContainer.style.display = 'block';
        const idx = todasNotas.findIndex(function(n) { return n.id === notaAtual.id; });
        if (idx !== -1) todasNotas[idx] = notaAtual;
        salvarLocal();
        toast('📸 Foto adicionada!');
    };
    reader.readAsDataURL(input.files[0]);
};

window.removerFoto = function() {
    if (!notaAtual) return;
    notaAtual.fotoLocal = null;
    document.getElementById('foto-preview').style.display = 'none';
    document.getElementById('foto-container').style.display = 'none';
    const idx = todasNotas.findIndex(function(n) { return n.id === notaAtual.id; });
    if (idx !== -1) todasNotas[idx] = notaAtual;
    salvarLocal();
    toast('Foto removida');
};

// ARQUIVO
window.abrirArquivo = function() { document.getElementById('input-arquivo').click(); };

window.processarArquivo = function(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        if (!notaAtual) return;
        notaAtual.anexoNome = file.name;
        notaAtual.anexoTipo = file.type;
        notaAtual.anexoBase64 = e.target.result;
        const anexoInfo = document.getElementById('anexo-info');
        const nomeEl = document.getElementById('anexo-nome');
        if (anexoInfo) anexoInfo.style.display = 'flex';
        if (nomeEl) nomeEl.innerText = file.name;
        const idx = todasNotas.findIndex(function(n) { return n.id === notaAtual.id; });
        if (idx !== -1) todasNotas[idx] = notaAtual;
        salvarLocal();
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
    notaAtual.anexoBase64 = null;
    const anexoInfo = document.getElementById('anexo-info');
    if (anexoInfo) anexoInfo.style.display = 'none';
    const idx = todasNotas.findIndex(function(n) { return n.id === notaAtual.id; });
    if (idx !== -1) todasNotas[idx] = notaAtual;
    salvarLocal();
    toast('Arquivo removido');
};

// FORMATAÇÃO
window.formatar = function(cmd) {
    document.getElementById('corpo-editor').focus();
    document.execCommand(cmd, false, null);
    window.autoSave();
};

window.inserirSeparador = function() {
    document.getElementById('corpo-editor').focus();
    document.execCommand('insertHTML', false, '<hr>');
    window.autoSave();
};

window.inserirChecklist = function() {
    document.getElementById('corpo-editor').focus();
    const id = 'chk_' + Date.now();
    document.execCommand('insertHTML', false,
        '<div class="check-item" id="' + id + '"><input type="checkbox" onchange="toggleCheck(\'' + id + '\')"><span contenteditable="true">Item</span></div>');
    window.autoSave();
};

window.toggleCheck = function(id) {
    const item = document.getElementById(id);
    if (item) { item.classList.toggle('concluido'); window.autoSave(); }
};

window.handleEditorKey = function(e) {
    if (e.key === 'Enter') {
        const sel = window.getSelection();
        if (sel && sel.anchorNode && sel.anchorNode.closest) {
            const checkItem = sel.anchorNode.closest('.check-item');
            if (checkItem) {
                e.preventDefault();
                const id = 'chk_' + Date.now();
                document.execCommand('insertHTML', false,
                    '<div class="check-item" id="' + id + '"><input type="checkbox" onchange="toggleCheck(\'' + id + '\')"><span contenteditable="true"></span></div>');
                window.autoSave();
            }
        }
    }
};

window.contarPalavras = function() {
    const texto = document.getElementById('corpo-editor').innerText || '';
    const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0;
    const el = document.getElementById('contador-palavras');
    if (el) el.innerText = palavras + ' palavra' + (palavras !== 1 ? 's' : '');
};

// BUSCA
window.filtrarNotas = function() {
    const termo = document.getElementById('campo-busca').value.toLowerCase();
    if (!termo) { renderizarLista(todasNotas); return; }
    renderizarLista(todasNotas.filter(function(n) {
        return (n.titulo || '').toLowerCase().includes(termo) ||
               (n.corpo || '').replace(/<[^>]*>/g, '').toLowerCase().includes(termo);
    }));
};

// IA
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
    if (!corpo.trim() && !titulo.trim()) { toast('Escreva algo primeiro!', '#ff4444'); return; }

    const prompts = {
        resumir:  'Resuma em português: ' + titulo + ' ' + corpo,
        explicar: 'Explique de forma simples em português: ' + titulo + ' ' + corpo,
        lista:    'Transforme em lista de tópicos em português: ' + titulo + ' ' + corpo,
        questoes: 'Crie 3 questões de estudo em português sobre: ' + titulo + ' ' + corpo,
        melhorar: 'Melhore o texto em português: ' + corpo,
        informal: 'Reescreva de forma informal em português: ' + corpo
    };

    const resultadoEl = document.getElementById('ia-resultado');
    const acoesEl = document.getElementById('ia-acoes');
    resultadoEl.style.display = 'block';
    resultadoEl.innerHTML = '<div class="ia-loading"><div class="ia-dot"></div><div class="ia-dot"></div><div class="ia-dot"></div></div>';
    acoesEl.style.display = 'none';

    try {
        const response = await fetch('https://api-inference.huggingface.co/models/' + HF_MODEL, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + HF_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: prompts[acao], parameters: { max_new_tokens: 400 } })
        });

        if (!response.ok) {
            const err = await response.json();
            if (err.error && err.error.includes('loading')) {
                resultadoEl.innerText = '⏳ Modelo carregando, aguarde 20s e tente novamente.';
            } else {
                resultadoEl.innerText = 'IA indisponível. Tente novamente em breve.';
            }
            return;
        }

        const data = await response.json();
        resultadoIA = Array.isArray(data) ? (data[0].generated_text || '') : (data.generated_text || '');
        resultadoIA = resultadoIA.trim();
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
    window.fecharMenuIA();
    window.autoSave();
    toast('✓ Resultado aplicado!');
};

// INIT
document.addEventListener('DOMContentLoaded', function() {
    initFirebase();
    carregarNotas();
    if (window.lucide) lucide.createIcons();
});
        
