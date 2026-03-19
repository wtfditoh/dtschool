// caderno-logica.js — SEM módulo ES6, funciona como script normal

const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a"
};

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
    const local = JSON.parse(localStorage.getItem('dt_caderno') || '[]');
    // Mostra local primeiro pra não ficar preso no "Carregando"
    todasNotas = local;
    renderizarLista(todasNotas);

    if (!userEmail || userType === 'local' || !db) return;

    try {
        const snap = await db.collection("caderno").where("usuario", "==", userEmail).get();
        todasNotas = [];
        snap.forEach(function(d) {
            const nota = Object.assign({ id: d.id }, d.data());
            const localNota = local.find(function(n) { return n.id === d.id; });
            if (localNota) {
                nota.fotoLocal = localNota.fotoLocal || null;
                nota.anexoNome = localNota.anexoNome || nota.anexoNome || null;
                nota.anexoBase64 = localNota.anexoBase64 || null;
                nota.rotinaDiaria = localNota.rotinaDiaria || nota.rotinaDiaria || false;
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
            (n.rotinaDiaria ? '<span class="nota-card-tag">🔄</span>' : '') +
            (n.fotoLocal ? '<span class="nota-card-tag">📸</span>' : '') +
            (n.anexoNome ? '<span class="nota-card-tag">📎</span>' : '') +
            (n.fixada ? '<span class="nota-card-tag">📌</span>' : '') +
            '</div></div></div>';
    }).join('');
}

// NOVA NOTA
window.novaNota = async function() {
    const nova = {
        titulo: '', corpo: '', fixada: false, rotinaDiaria: false,
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

function salvarLocal() {
    localStorage.setItem('dt_caderno', JSON.stringify(todasNotas));
}

window.abrirNota = function(id) {
    const nota = todasNotas.find(function(n) { return n.id === id; });
    if (nota) abrirEditor(nota);
};

function abrirEditor(nota) {
    notaAtual = nota;
    document.getElementById('tela-lista').style.display = 'none';
    document.getElementById('tela-editor').style.display = 'block';
    document.getElementById('titulo-nota').value = nota.titulo || '';

    // Carrega corpo e sincroniza checks com estado do dia
    var corpo = nota.corpo || '';
    if (nota.rotinaDiaria && corpo) {
        var hoje = new Date().toISOString().split('T')[0];
        var estadoHoje = JSON.parse(localStorage.getItem('dt_checklist_' + hoje) || '{}');
        var div = document.createElement('div');
        div.innerHTML = corpo;
        var checks = div.querySelectorAll('.check-item');
        for (var c = 0; c < checks.length; c++) {
            var itemId = nota.id + '_' + c;
            var input = checks[c].querySelector('input[type="checkbox"]');
            if (input) {
                input.checked = estadoHoje[itemId] || false;
                if (estadoHoje[itemId]) {
                    checks[c].classList.add('concluido');
                } else {
                    checks[c].classList.remove('concluido');
                }
            }
        }
        corpo = div.innerHTML;
    }
    document.getElementById('corpo-editor').innerHTML = corpo;

    const statusEl = document.getElementById('editor-status');
    if (statusEl) { statusEl.innerText = 'Salvo ✓'; statusEl.style.color = '#2ecc71'; }

    const btnFixar = document.getElementById('btn-fixar');
    if (btnFixar) btnFixar.style.color = nota.fixada ? '#8a2be2' : '#555';

    const btnRotina = document.getElementById('btn-rotina');
    if (btnRotina) btnRotina.style.color = nota.rotinaDiaria ? '#2ecc71' : '#555';

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

window.voltarLista = function() {
    if (autoSaveTimer) { clearTimeout(autoSaveTimer); salvarNota(); }
    document.getElementById('tela-editor').style.display = 'none';
    document.getElementById('tela-lista').style.display = 'block';
    notaAtual = null;
    carregarNotas();
};

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
                rotinaDiaria: notaAtual.rotinaDiaria || false,
                atualizadoEm: notaAtual.atualizadoEm,
                anexoNome: notaAtual.anexoNome || null
            });
        } catch(e) { console.error(e); }
    }

    const statusEl = document.getElementById('editor-status');
    if (statusEl) { statusEl.innerText = 'Salvo ✓'; statusEl.style.color = '#2ecc71'; }
}

window.toggleFixar = async function() {
    if (!notaAtual) return;
    notaAtual.fixada = !notaAtual.fixada;
    const btnFixar = document.getElementById('btn-fixar');
    if (btnFixar) btnFixar.style.color = notaAtual.fixada ? '#8a2be2' : '#555';
    toast(notaAtual.fixada ? '📌 Nota fixada!' : 'Nota desafixada');
    await salvarNota();
};

window.toggleRotina = async function() {
    if (!notaAtual) return;
    notaAtual.rotinaDiaria = !notaAtual.rotinaDiaria;
    const btnRotina = document.getElementById('btn-rotina');
    if (btnRotina) btnRotina.style.color = notaAtual.rotinaDiaria ? '#2ecc71' : '#555';
    toast(notaAtual.rotinaDiaria ? '🔄 Rotina diária ativada!' : 'Rotina desativada');
    await salvarNota();
};

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

// CHECKLIST — corrigido pra mobile
window.inserirChecklist = function() {
    const editor = document.getElementById('corpo-editor');
    editor.focus();
    const id = 'chk_' + Date.now();
    // Usa div separado pra não bugar o cursor no mobile
    const novoItem = document.createElement('div');
    novoItem.className = 'check-item';
    novoItem.id = id;
    novoItem.innerHTML = '<input type="checkbox" onchange="toggleCheck(\'' + id + '\')"><span contenteditable="true">Item</span>';

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.collapse(false);
        range.insertNode(novoItem);
        // Move cursor pro span
        const span = novoItem.querySelector('span');
        if (span) {
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            newRange.collapse(false);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
    } else {
        editor.appendChild(novoItem);
    }
    window.autoSave();
};

window.toggleCheck = function(id) {
    const item = document.getElementById(id);
    if (!item || !notaAtual) return;
    item.classList.toggle('concluido');

    // Se for rotina diária, salva estado no localStorage por data
    if (notaAtual.rotinaDiaria) {
        var hoje = new Date().toISOString().split('T')[0];
        var estado = JSON.parse(localStorage.getItem('dt_checklist_' + hoje) || '{}');
        // Encontra índice do item
        var editor = document.getElementById('corpo-editor');
        var checks = editor.querySelectorAll('.check-item');
        for (var c = 0; c < checks.length; c++) {
            if (checks[c].id === id) {
                var itemId = notaAtual.id + '_' + c;
                estado[itemId] = item.classList.contains('concluido');
                break;
            }
        }
        localStorage.setItem('dt_checklist_' + hoje, JSON.stringify(estado));
    }

    window.autoSave();
};

// ENTER no checklist — corrigido pra mobile
window.handleEditorKey = function(e) {
    if (e.key !== 'Enter') return;
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return;
    var node = sel.anchorNode;
    // Sobe na árvore até achar .check-item
    var checkItem = null;
    var current = node.nodeType === 3 ? node.parentNode : node;
    while (current && current !== document.getElementById('corpo-editor')) {
        if (current.classList && current.classList.contains('check-item')) {
            checkItem = current;
            break;
        }
        current = current.parentNode;
    }
    if (!checkItem) return;
    e.preventDefault();
    const id = 'chk_' + Date.now();
    const novoItem = document.createElement('div');
    novoItem.className = 'check-item';
    novoItem.id = id;
    novoItem.innerHTML = '<input type="checkbox" onchange="toggleCheck(\'' + id + '\')"><span contenteditable="true"></span>';
    checkItem.parentNode.insertBefore(novoItem, checkItem.nextSibling);
    const span = novoItem.querySelector('span');
    if (span) {
        const newRange = document.createRange();
        newRange.setStart(span, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        span.focus();
    }
    window.autoSave();
};

window.contarPalavras = function() {
    const texto = document.getElementById('corpo-editor').innerText || '';
    const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0;
    const el = document.getElementById('contador-palavras');
    if (el) el.innerText = palavras + ' palavra' + (palavras !== 1 ? 's' : '');
};

window.filtrarNotas = function() {
    const termo = document.getElementById('campo-busca').value.toLowerCase();
    if (!termo) { renderizarLista(todasNotas); return; }
    renderizarLista(todasNotas.filter(function(n) {
        return (n.titulo || '').toLowerCase().includes(termo) ||
               (n.corpo || '').replace(/<[^>]*>/g, '').toLowerCase().includes(termo);
    }));
};

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
    resultadoEl.innerHTML = '<div class="ia-loading"><div class="ia-d
