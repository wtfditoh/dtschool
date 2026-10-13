/* share-target.js — Hub Brain · Recebe imagem OU arquivo compartilhado
   Imagem → ImgBB · PDF/doc → catbox via Netlify Function (proxy)
   Log na tela pra debug sem Console. */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const IMGBB_KEY = 'b329a89d2327b3957464d6d27a3c275b';
const CATBOX_PROXY = '/.netlify/functions/catbox-upload';

const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a"
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const userEmail = localStorage.getItem('dt_user_email');
const $ = (id) => document.getElementById(id);

let arquivo = null;
let ehImg = false;
let materiaSel = null;
let materias = ['Geral'];

/* ═══════════════ LOG NA TELA ═══════════════ */
function log(msg, tipo) {
    console.log('[share]', msg);
    const box = $('st-log');
    if (!box) return;
    box.classList.add('on');
    const ln = document.createElement('div');
    ln.className = 'ln ' + (tipo || '');
    ln.textContent = msg;
    box.appendChild(ln);
    box.scrollTop = box.scrollHeight;
}

/* ═══════════════ DETECÇÃO DE TIPO ═══════════════ */
const EXTS_IMG = ['jpg','jpeg','png','gif','webp','bmp','heic','heif','avif'];
const EXTS_ARQ = ['pdf','doc','docx','ppt','pptx','xls','xlsx','txt','csv','zip','rar','odt','ods','odp'];

function extDe(nome) {
    const m = String(nome || '').toLowerCase().match(/\.([a-z0-9]{1,6})$/);
    return m ? m[1] : '';
}
function decidirTipo(nome, mime) {
    const ext = extDe(nome);
    if (EXTS_IMG.indexOf(ext) !== -1) return 'imagem';
    if (EXTS_ARQ.indexOf(ext) !== -1) return 'arquivo';
    if (mime && mime.startsWith('image/')) return 'imagem';
    return 'arquivo';
}
function emojiPorExt(ext) {
    const map = { pdf:'📕', doc:'📘', docx:'📘', txt:'📄', ppt:'📙', pptx:'📙',
                  xls:'📗', xlsx:'📗', csv:'📗', zip:'🗜️', rar:'🗜️' };
    return map[ext] || '📎';
}

const PALETA = ['#8a2be2','#00d2ff','#00e5a0','#ff8c32','#ff4455','#c084fc','#ffbb33','#3b82f6','#ec4899','#10b981'];
const corMateria = (n) => {
    if (!n || n === 'Geral') return '#8a2be2';
    let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) | 0;
    return PALETA[Math.abs(h) % PALETA.length];
};

/* ═══════════════ PEGAR ARQUIVO DO CACHE ═══════════════ */
async function pegarArquivo() {
    if (!('caches' in window)) { log('❌ caches API indisponível', 'err'); return null; }
    const cache = await caches.open('share-target-files');
    const resp = await cache.match('/shared-file');
    if (!resp) { log('⚠️ nada no cache do service worker', 'warn'); return null; }

    const blob = await resp.blob();
    const nomeHeader = resp.headers.get('X-Nome-Original');
    let nome = 'compartilhado';
    if (nomeHeader) { try { nome = decodeURIComponent(nomeHeader); } catch (e) {} }
    const mime = resp.headers.get('Content-Type') || blob.type || '';

    await cache.delete('/shared-file');
    log('✓ arquivo recuperado do cache', 'ok');
    return { blob, nome, mime };
}

/* ═══════════════ CARREGAR MATÉRIAS ═══════════════ */
async function carregarMaterias() {
    try {
        const snap = await getDoc(doc(db, 'notas', userEmail));
        if (snap.exists() && Array.isArray(snap.data().materias)) {
            const nomes = snap.data().materias.map(m => m && m.nome).filter(Boolean);
            materias = ['Geral', ...new Set(nomes)];
            log('✓ matérias carregadas: ' + materias.length, 'ok');
        } else {
            log('⚠️ sem matérias na conta, usando só "Geral"', 'warn');
        }
    } catch (e) {
        log('⚠️ erro ao carregar matérias: ' + e.message, 'warn');
    }
    $('st-mats').innerHTML = materias.map(m =>
        `<button class="st-mat" data-m="${m}">
            <span class="st-dot" style="background:${corMateria(m)}"></span>${m}
        </button>`).join('');
    $('st-mats').addEventListener('click', (e) => {
        const b = e.target.closest('.st-mat');
        if (!b) return;
        materiaSel = b.dataset.m;
        document.querySelectorAll('.st-mat').forEach(x => x.classList.toggle('on', x === b));
        $('st-salvar').disabled = false;
        log('matéria: ' + materiaSel, 'info');
    });
}

/* ═══════════════ COMPRIMIR IMAGEM ═══════════════ */
function comprimir(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            try {
                const MAX = 2400, Q = 0.92;
                let w = img.naturalWidth, h = img.naturalHeight;
                if (w >= h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                const ctx = c.getContext('2d');
                ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                c.toBlob(b => { URL.revokeObjectURL(url); b ? resolve(b) : reject(new Error('compress falhou')); }, 'image/jpeg', Q);
            } catch (e) { URL.revokeObjectURL(url); reject(e); }
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem inválida')); };
        img.src = url;
    });
}

/* ═══════════════ UPLOADS ═══════════════ */
async function uploadImgBB(blob) {
    log('📤 enviando pro ImgBB (' + Math.round(blob.size / 1024) + 'KB)…', 'info');
    const fd = new FormData();
    fd.append('image', blob);
    const r = await fetch('https://api.imgbb.com/1/upload?key=' + IMGBB_KEY, { method: 'POST', body: fd });
    log('ImgBB respondeu status ' + r.status, 'info');
    const d = await r.json();
    if (!d.success || !d.data) throw new Error('ImgBB: ' + ((d.error && d.error.message) || 'erro desconhecido'));
    log('✓ ImgBB OK', 'ok');
    return {
        url: d.data.url || (d.data.image && d.data.image.url) || '',
        thumb: (d.data.thumb && d.data.thumb.url) || d.data.url || '',
        medium: (d.data.medium && d.data.medium.url) || d.data.url || '',
        display_url: d.data.display_url || ''
    };
}

/* Upload do arquivo via função Netlify (proxy que contorna o CORS do catbox) */
async function uploadCatbox(file) {
    log('📤 enviando pro catbox via proxy (' + Math.round(file.size / 1024) + 'KB)…', 'info');
    const r = await fetch(CATBOX_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
    });
    log('proxy respondeu status ' + r.status, 'info');
    if (!r.ok) {
        let detalhe = '';
        try { detalhe = await r.text(); } catch (e) {}
        throw new Error('proxy falhou (' + r.status + ') ' + detalhe.slice(0, 120));
    }
    const txt = (await r.text()).trim();
    if (!txt.startsWith('http')) throw new Error('catbox: ' + txt.slice(0, 100));
    log('✓ catbox OK', 'ok');
    return { url: txt, thumb: '', medium: '', display_url: '' };
}

/* ═══════════════ SALVAR ═══════════════ */
async function salvar() {
    if (!arquivo) { log('❌ nenhum arquivo carregado', 'err'); return; }
    if (!materiaSel) { log('❌ escolha uma matéria primeiro', 'err'); return; }

    const btn = $('st-salvar');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    $('st-log').innerHTML = '';

    try {
        log('═══ INÍCIO ═══', 'info');
        log('tipo: ' + (ehImg ? 'IMAGEM' : 'ARQUIVO'), 'info');
        log('nome: ' + arquivo.name, 'info');
        log('tamanho: ' + Math.round(arquivo.size / 1024) + 'KB', 'info');
        log('mime: ' + (arquivo.type || 'vazio'), 'info');
        log('matéria: ' + materiaSel, 'info');

        if (!IMGBB_KEY || IMGBB_KEY === 'COLE_SUA_CHAVE_AQUI') {
            throw new Error('Chave do ImgBB não colada no share-target.js');
        }
        if (!userEmail) {
            throw new Error('Você não está logado (dt_user_email vazio)');
        }
        log('✓ chave e login OK', 'ok');

        let urls, tipoItem;
        if (ehImg) {
            log('→ comprimindo imagem…', 'info');
            const blob = await comprimir(arquivo);
            log('✓ comprimido: ' + Math.round(blob.size / 1024) + 'KB', 'ok');
            urls = await uploadImgBB(blob);
            tipoItem = 'imagem';
        } else {
            urls = await uploadCatbox(arquivo);
            tipoItem = 'arquivo';
        }
        if (!urls.url) throw new Error('Serviço não devolveu URL');
        log('URL: ' + urls.url.slice(0, 60) + '…', 'info');

        log('→ salvando no Firestore…', 'info');
        const hoje = new Date().toISOString().split('T')[0];
        await addDoc(collection(db, 'conteudos'), {
            usuario: userEmail,
            materia: materiaSel,
            tipo: tipoItem,
            url: urls.url,
            thumb: urls.thumb || '',
            medium: urls.medium || '',
            display_url: urls.display_url || '',
            nome: arquivo.name || (tipoItem === 'imagem' ? 'Compartilhado' : 'Arquivo'),
            data: hoje,
            criadoEm: Date.now(),
            origem: 'whatsapp'
        });
        log('✓ Firestore OK', 'ok');
        log('═══ SALVO COM SUCESSO ═══', 'ok');

        btn.textContent = '✓ Salvo!';
        setTimeout(() => { window.location.href = 'conteudos.html'; }, 1500);
    } catch (e) {
        console.error('[share] ERRO:', e);
        log('❌ ' + (e && e.message ? e.message : 'Erro desconhecido'), 'err');
        if (e && e.stack) log(e.stack.split('\n').slice(0, 2).join(' | '), 'err');
        btn.textContent = 'Tentar de novo';
        btn.disabled = false;
    }
}

/* ═══════════════ INIT ═══════════════ */
async function iniciar() {
    log('═══ INICIANDO ═══', 'info');

    if (!userEmail) {
        log('❌ não está logado, redirecionando…', 'err');
        window.location.href = 'login.html';
        return;
    }
    log('✓ usuário: ' + userEmail.slice(0, 20) + '…', 'ok');

    await carregarMaterias();

    const info = await pegarArquivo();
    if (info) {
        arquivo = new File([info.blob], info.nome, { type: info.mime || info.blob.type || '' });
        ehImg = decidirTipo(info.nome, info.mime || info.blob.type) === 'imagem';
        log('→ decidido: ' + (ehImg ? 'IMAGEM' : 'ARQUIVO'), 'ok');

        const preview = $('st-preview');
        if (ehImg) {
            preview.innerHTML = `<img id="st-img" alt="">`;
            $('st-img').src = URL.createObjectURL(arquivo);
            $('st-sub').textContent = 'Escolha a matéria da foto';
        } else {
            const ext = extDe(info.nome) || 'arquivo';
            preview.innerHTML = `
                <div class="st-ico">${emojiPorExt(ext)}</div>
                <div class="st-ext">${ext.toUpperCase()}</div>
                <div class="st-nome">${info.nome}</div>
            `;
            $('st-sub').textContent = 'Escolha a matéria do arquivo';
        }
    } else {
        log('⚠️ nenhum arquivo recebido do compartilhamento', 'warn');
        $('st-preview').innerHTML = `<div class="st-ico" style="opacity:0.3;">📭</div>`;
        $('st-sub').textContent = 'Nenhum arquivo recebido';
    }

    $('st-salvar').addEventListener('click', salvar);
}

iniciar();
