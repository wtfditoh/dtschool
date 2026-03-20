var firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a"
};

var db = null;
var userEmail = (localStorage.getItem('dt_user_email') || '').toLowerCase();
var userType = localStorage.getItem('dt_user_type');
var HF_KEY = "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";
var HF_MODEL = "google/flan-t5-large";
var notaAtual = null;
var autoSaveTimer = null;
var resultadoIA = '';
var todasNotas = [];

function toast(msg, cor) {
    cor = cor || '#8a2be2';
    var el = document.getElementById('toast-caderno');
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

function salvarLocal() {
    localStorage.setItem('dt_caderno', JSON.stringify(todasNotas));
}

function renderizarLista(notas) {
    var lista = document.getElementById('lista-notas');
    var sub = document.getElementById('sub-contagem');
    if (!lista) return;
    if (sub) sub.innerText = notas.length === 0 ? 'Nenhuma nota' : notas.length + ' nota' + (notas.length > 1 ? 's' : '');
    if (notas.length === 0) {
        lista.innerHTML = '<div class="empty-caderno"><div class="empty-icon">📓</div><p>Nenhuma nota ainda</p><span>Toque no + para criar</span></div>';
        return;
    }
    var fixadas = notas.filter(function(n) { return n.fixada; });
    var normais = notas.filter(function(n) { return !n.fixada; });
    var ordenadas = fixadas.concat(normais);
    lista.innerHTML = ordenadas.map(function(n) {
        var preview = n.corpo ? n.corpo.replace(/<[^>]*>/g, '').slice(0, 80) : '';
        var data = n.atualizadoEm ? new Date(n.atualizadoEm).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}) : '';
        return '<div class="nota-card ' + (n.fixada ? 'fixada' : '') + '" onclick="abrirNota(\'' + n.id + '\')">' +
            '<div class="nota-card-header"><span class="nota-card-titulo">' + (n.titulo || 'Sem título') + '</span>' +
            (n.fixada ? '<span>📌</span>' : '') + '</div>' +
            (preview ? '<p class="nota-card-preview">' + preview + '</p>' : '') +
            '<div class="nota-card-footer"><span class="nota-card-data">' + data + '</span>' +
            '<div style="display:flex;gap:6px;">' +
            (n.rotinaDiaria ? '<span class="nota-card-tag">🔄</span>' : '') +
            (n.fotoLocal ? '<span class="nota-card-tag">📸</span>' : '') +
            (n.anexoNome ? '<span class="nota-card-tag">📎</span>' : '') +
            '</div></div></div>';
    }).join('');
}

function carregarNotas() {
    var local = JSON.parse(localStorage.getItem('dt_caderno') || '[]');
    todasNotas = local;
    renderizarLista(todasNotas);
    if (!userEmail || userType === 'local' || !db) return;
    db.collection("caderno").where("usuario", "==", userEmail).get()
    .then(function(snap) {
        todasNotas = [];
        snap.forEach(function(d) {
            var nota = Object.assign({ id: d.id }, d.data());
            var localNota = local.find(function(n) { return n.id === d.id; });
            if (localNota) {
                nota.fotoLocal = localNota.fotoLocal || null;
                nota.anexoBase64 = localNota.anexoBase64 || null;
                nota.rotinaDiaria = localNota.rotinaDiaria || nota.rotinaDiaria || false;
            }
            todasNotas.push(nota);
        });
        todasNotas.sort(function(a, b) { return (b.atualizadoEm || 0) - (a.atualizadoEm || 0); });
        renderizarLista(todasNotas);
    }).catch(function(e) { console.error(e); });
}

function abrirEditor(nota) {
    notaAtual = nota;
    document.getElementById('tela-lista').style.display = 'none';
    document.getElementById('tela-editor').style.display = 'block';
    document.getElementById('titulo-nota').value = nota.titulo || '';

    // Sincroniza estado dos checks do dia
    var corpo = nota.corpo || '';
    if (nota.rotinaDiaria && corpo) {
        var hoje = new Date().toISOString().split('T')[0];
        var estadoHoje = JSON.parse(localStorage.getItem('dt_checklist_' + hoje) || '{}');
        var tmpDiv = document.createElement('div');
        tmpDiv.innerHTML = corpo;
        var checks = tmpDiv.querySelectorAll('.check-item');
        for (var c = 0; c < checks.length; c++) {
            var inp = checks[c].querySelector('input[type="checkbox"]');
            if (inp) {
                var feito = estadoHoje[nota.id + '_' + c] || false;
                inp.checked = feito;
                if (feito) checks[c].classList.add('concluido');
                else checks[c].classList.remove('concluido');
            }
        }
        corpo = tmpDiv.innerHTML;
    }
    document.getElementById('corpo-editor').innerHTML = corpo;
    var statusEl = document.getElementById('editor-status');
    if (statusEl) { statusEl.innerText = 'Salvo ✓'; statusEl.style.color = '#2ecc71'; }
    var btnFixar = document.getElementById('btn-fixar');
    if (btnFixar) btnFixar.style.color = nota.fixada ? '#8a2be2' : '#555';
    var btnRotina = document.getElementById('btn-rotina');
    if (btnRotina) btnRotina.style.color = nota.rotinaDiaria ? '#2ecc71' : '#555';
    var fotoPreview = document.getElementById('foto-preview');
    var fotoContainer = document.getElementById('foto-container');
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
    var anexoInfo = document.getElementById('anexo-info');
    if (anexoInfo) {
        anexoInfo.style.display = nota.anexoNome ? 'flex' : 'none';
        var nomeEl = document.getElementById('anexo-nome');
        if (nomeEl) nomeEl.innerText = nota.anexoNome || '';
    }
    contarPalavras();
    window.scrollTo(0, 0);
    if (window.lucide) lucide.createIcons();
}

window.novaNota = function() {
    var nova = {
        id: 'local_' + Date.now(),
        titulo: '', corpo: '', fixada: false, rotinaDiaria: false,
        usuario: userEmail, fotoLocal: null, anexoNome: null, anexoBase64: null,
        criadoEm: Date.now(), atualizadoEm: Date.now()
    };
    todasNotas.unshift(nova);
    salvarLocal();
    abrirEditor(nova);
    if (db && userEmail && userType !== 'local') {
        db.collection("caderno").add({
            titulo: '', corpo: '', fixada: false, rotinaDiaria: false,
            usuario: userEmail, criadoEm: nova.criadoEm, atualizadoEm: nova.atualizadoEm
        }).then(function(ref) {
            var idx = todasNotas.indexOf(nova);
            if (idx !== -1) todasNotas[idx].id = ref.id;
            salvarLocal();
        }).catch(function(e) { console.error(e); });
    }
};

window.abrirNota = function(id) {
    var nota = todasNotas.find(function(n) { return n.id === id; });
    if (nota) abrirEditor(nota);
};

window.voltarLista = function() {
    if (autoSaveTimer) { clearTimeout(autoSaveTimer); salvarNota(); }
    document.getElementById('tela-editor').style.display = 'none';
    document.getElementById('tela-lista').style.display = 'block';
    notaAtual = null;
    carregarNotas();
};

window.autoSave = function() {
    var statusEl = document.getElementById('editor-status');
    if (statusEl) { statusEl.innerText = 'Salvando...'; statusEl.style.color = '#555'; }
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(salvarNota, 1500);
};

function salvarNota() {
    if (!notaAtual) return;
    notaAtual.titulo = document.getElementById('titulo-nota').value;
    notaAtual.corpo = document.getElementById('corpo-editor').innerHTML;
    notaAtual.atualizadoEm = Date.now();
    var idx = todasNotas.findIndex(function(n) { return n.id === notaAtual.id; });
    if (idx !== -1) todasNotas[idx] = notaAtual;
    salvarLocal();
    if (db && userEmail && userType !== 'local' && !notaAtual.id.startsWith('local_')) {
        db.collection("caderno").doc(notaAtual.id).update({
            titulo: notaAtual.titulo, corpo: notaAtual.corpo,
            fixada: notaAtual.fixada, rotinaDiaria: notaAtual.rotinaDiaria || false,
            atualizadoEm: notaAtual.atualizadoEm, anexoNome: notaAtual.anexoNome || null
        }).catch(function(e) { console.error(e); });
    }
    var statusEl = document.getElementById('editor-status');
    if (statusEl) { statusEl.innerText = 'Salvo ✓'; statusEl.style.color = '#2ecc71'; }
}

window.toggleFixar = function() {
    if (!notaAtual) return;
    notaAtual.fixada = !notaAtual.fixada;
    var btnFixar = document.getElementById('btn-fixar');
    if (btnFixar) btnFixar.style.color = notaAtual.fixada ? '#8a2be2' : '#555';
    toast(notaAtual.fixada ? '📌 Nota fixada!' : 'Nota desafixada');
    salvarNota();
};

window.toggleRotina = function() {
    if (!notaAtual) return;
    notaAtual.rotinaDiaria = !notaAtual.rotinaDiaria;
    var btnRotina = document.getElementById('btn-rotina');
    if (btnRotina) btnRotina.style.color = notaAtual.rotinaDiaria ? '#2ecc71' : '#555';
    toast(notaAtual.rotinaDiaria ? '🔄 Rotina ativada!' : 'Rotina desativada');
    salvarNota();
};

window.excluirNota = function() {
    document.getElementById('modal-excluir-nota').style.display = 'flex';
};

window.confirmarExcluirNota = function() {
    document.getElementById('modal-excluir-nota').style.display = 'none';
    if (!notaAtual) return;
    var idParaExcluir = notaAtual.id;
    todasNotas = todasNotas.filter(function(n) { return n.id !== idParaExcluir; });
    salvarLocal();
    if (db && userEmail && userType !== 'local' && !idParaExcluir.startsWith('local_')) {
        db.collection("caderno").doc(idParaExcluir).delete().catch(function(e) { console.error(e); });
    }
    // Volta sem recarregar do Firebase pra não buscar a nota deletada
    notaAtual = null;
    document.getElementById('tela-editor').style.display = 'none';
    document.getElementById('tela-lista').style.display = 'block';
    renderizarLista(todasNotas);
    toast('Nota excluída');
};

window.cancelarExcluirNota = function() {
    document.getElementById('modal-excluir-nota').style.display = 'none';
};

window.abrirFoto = function() { document.getElementById('input-foto').click(); };

window.processarFoto = function(input) {
    if (!input.files || !input.files[0]) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        if (!notaAtual) return;
        notaAtual.fotoLocal = e.target.result;
        var fotoPreview = document.getElementById('foto-preview');
        var fotoContainer = document.getElementById('foto-container');
        if (fotoPreview) { fotoPreview.src = e.target.result; fotoPreview.style.display = 'block'; }
        if (fotoContainer) fotoContainer.style.display = 'block';
        var idx = todasNotas.findIndex(function(n) { return n.id === notaAtual.id; });
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
    var idx = todasNotas.findIndex(function(n) { return n.id === notaAtual.id; });
    if (idx !== -1) todasNotas[idx] = notaAtual;
    salvarLocal();
    toast('Foto removida');
};

window.abrirFotoFullscreen = function() {
    var preview = document.getElementById('foto-preview');
    var modal = document.getElementById('modal-foto');
    var fullscreen = document.getElementById('foto-fullscreen');
    if (!preview || !modal || !fullscreen) return;
    fullscreen.src = preview.src;
    modal.style.display = 'flex';
};

window.fecharFotoFullscreen = function() {
    var modal = document.getElementById('modal-foto');
    if (modal) modal.style.display = 'none';
};

window.abrirArquivo = function() { document.getElementById('input-arquivo').click(); };

window.processarArquivo = function(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
        if (!notaAtual) return;
        notaAtual.anexoNome = file.name;
        notaAtual.anexoBase64 = e.target.result;
        var anexoInfo = document.getElementById('anexo-info');
        var nomeEl = document.getElementById('anexo-nome');
        if (anexoInfo) anexoInfo.style.display = 'flex';
        if (nomeEl) nomeEl.innerText = file.name;
        var idx = todasNotas.findIndex(function(n) { return n.id === notaAtual.id; });
        if (idx !== -1) todasNotas[idx] = notaAtual;
        salvarLocal();
        toast('📎 Arquivo anexado!');
    };
    reader.readAsDataURL(file);
};

window.abrirAnexo = function() {
    if (!notaAtual || !notaAtual.anexoBase64) { toast('Arquivo não disponível', '#ff4444'); return; }
    var link = document.createElement('a');
    link.href = notaAtual.anexoBase64;
    link.download = notaAtual.anexoNome || 'arquivo';
    link.click();
};

window.removerArquivo = function() {
    if (!notaAtual) return;
    notaAtual.anexoNome = null;
    notaAtual.anexoBase64 = null;
    var anexoInfo = document.getElementById('anexo-info');
    if (anexoInfo) anexoInfo.style.display = 'none';
    var idx = todasNotas.findIndex(function(n) { return n.id === notaAtual.id; });
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

window.inserirChecklist = function() {
    var editor = document.getElementById('corpo-editor');
    editor.focus();
    var id = 'chk_' + Date.now();
    var novoItem = document.createElement('div');
    novoItem.className = 'check-item';
    novoItem.id = id;
    novoItem.innerHTML = '<input type="checkbox" onchange="toggleCheck(\'' + id + '\')"><span contenteditable="true">Item</span>';
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        var range = sel.getRangeAt(0);
        range.collapse(false);
        range.insertNode(novoItem);
        var span = novoItem.querySelector('span');
        if (span) {
            var newRange = document.createRange();
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
    var item = document.getElementById(id);
    if (!item) return;
    item.classList.toggle('concluido');
    if (notaAtual && notaAtual.rotinaDiaria) {
        var hoje = new Date().toISOString().split('T')[0];
        var estado = JSON.parse(localStorage.getItem('dt_checklist_' + hoje) || '{}');
        var editor = document.getElementById('corpo-editor');
        var checks = editor.querySelectorAll('.check-item');
        for (var c = 0; c < checks.length; c++) {
            if (checks[c].id === id) {
                estado[notaAtual.id + '_' + c] = item.classList.contains('concluido');
                break;
            }
        }
        localStorage.setItem('dt_checklist_' + hoje, JSON.stringify(estado));
    }
    window.autoSave();
};

window.handleEditorKey = function(e) {
    if (e.key !== 'Enter') return;
    var sel = window.getSelection();
    if (!sel || !sel.anchorNode) return;
    var current = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentNode : sel.anchorNode;
    var checkItem = null;
    while (current && current !== document.getElementById('corpo-editor')) {
        if (current.classList && current.classList.contains('check-item')) { checkItem = current; break; }
        current = current.parentNode;
    }
    if (!checkItem) return;
    e.preventDefault();
    var id = 'chk_' + Date.now();
    var novoItem = document.createElement('div');
    novoItem.className = 'check-item';
    novoItem.id = id;
    novoItem.innerHTML = '<input type="checkbox" onchange="toggleCheck(\'' + id + '\')"><span contenteditable="true"></span>';
    checkItem.parentNode.insertBefore(novoItem, checkItem.nextSibling);
    var span = novoItem.querySelector('span');
    if (span) {
        var newRange = document.createRange();
        newRange.setStart(span, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
    }
    window.autoSave();
};

window.contarPalavras = function() {
    var texto = document.getElementById('corpo-editor').innerText || '';
    var palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0;
    var el = document.getElementById('contador-palavras');
    if (el) el.innerText = palavras + ' palavra' + (palavras !== 1 ? 's' : '');
};

window.filtrarNotas = function() {
    var termo = document.getElementById('campo-busca').value.toLowerCase();
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

window.usarIA = function(acao) {
    var corpo = document.getElementById('corpo-editor').innerText || '';
    var titulo = document.getElementById('titulo-nota').value || '';
    if (!corpo.trim() && !titulo.trim()) { toast('Escreva algo primeiro!', '#ff4444'); return; }
    var prompts = {
        resumir: 'Resuma em português: ' + titulo + ' ' + corpo,
        explicar: 'Explique de forma simples em português: ' + titulo + ' ' + corpo,
        lista: 'Transforme em lista de tópicos em português: ' + titulo + ' ' + corpo,
        questoes: 'Crie 3 questões de estudo em português sobre: ' + titulo + ' ' + corpo,
        melhorar: 'Melhore o texto em português: ' + corpo,
        informal: 'Reescreva de forma informal em português: ' + corpo
    };
    var resultadoEl = document.getElementById('ia-resultado');
    var acoesEl = document.getElementById('ia-acoes');
    resultadoEl.style.display = 'block';
    resultadoEl.innerHTML = '<div class="ia-loading"><div class="ia-dot"></div><div class="ia-dot"></div><div class="ia-dot"></div></div>';
    acoesEl.style.display = 'none';
    fetch('https://api-inference.huggingface.co/models/' + HF_MODEL, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + HF_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompts[acao], parameters: { max_new_tokens: 400 } })
    }).then(function(response) {
        return response.json();
    }).then(function(data) {
        resultadoIA = Array.isArray(data) ? (data[0].generated_text || '') : (data.generated_text || data.error || 'Erro');
        resultadoEl.innerText = resultadoIA.trim();
        acoesEl.style.display = 'flex';
    }).catch(function(e) {
        resultadoEl.innerText = 'Erro ao conectar com a IA.';
    });
};

window.aceitarIA = function() {
    if (!resultadoIA) return;
    var editor = document.getElementById('corpo-editor');
    editor.innerHTML += '<hr><p>' + resultadoIA.replace(/\n/g, '<br>') + '</p>';
    window.fecharMenuIA();
    window.autoSave();
    toast('✓ Resultado aplicado!');
};

// INIT
document.addEventListener('DOMContentLoaded', function() {
    if (window.firebase) {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
    }
    carregarNotas();
    if (window.lucide) lucide.createIcons();
});
