/* share-target.js — Hub Brain · Recebe imagem OU arquivo compartilhado
   Imagem → ImgBB · PDF/doc → catbox.moe · decide pelo NOME real do arquivo. */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const IMGBB_KEY = 'b329a89d2327b3957464d6d27a3c275b';
const CATBOX_URL = 'https://catbox.moe/user/api.php';

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

let arquivo = null;         // File pronto pra subir
let ehImg = false;          // decidido depois
let materiaSel = null;
let materias = ['Geral'];

const PALETA = ['#8a2be2','#00d2ff','#00e5a0','#ff8c32','#ff4455','#c084fc','#ffbb33','#3b82f6','#ec4899','#10b981'];
const corMateria = (n) => {
    if (!n || n === 'Geral') return '#8a2be2';
    let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) | 0;
    return PALETA[Math.abs(h) % PALETA.length];
};

/* ═══════════════ DETECÇÃO DE TIPO ═══════════════ */
const EXTS_IMG = ['jpg','jpeg','png','gif','webp','bmp','heic','heif','avif'];
const EXTS_ARQ = ['pdf','doc','docx','ppt','pptx','xls','xlsx','txt','csv','zip','rar','odt','ods','odp'];

function extDe(nome) {
    const m = String(nome || '').toLowerCase().match(/\.([a-z0-9]{1,6})$/);
    return m ? m[1] : '';
}
function decidirTipo(nome, mime) {
    const ext = extDe(nome);
    // 1) Extensão é a fonte da verdade
    if (EXTS_IMG.indexOf(ext) !== -1) return 'imagem';
    if (EXTS_ARQ.indexOf(ext) !== -1) return 'arquivo';
    // 2) Fallback: mime
    if (mime && mime.startsWith('image/')) return 'imagem';
    // 3) Padrão: arquivo
    return 'arquivo';
}
function emojiPorExt(ext) {
    const map = { pdf:'📕', doc:'📘', docx:'📘', txt:'📄', ppt:'📙', pptx:'📙',
                  xls:'📗', xlsx:'📗', csv:'📗', zip:'🗜️', rar:'🗜️' };
    return map[ext] || '📎';
}

/* ═══════════════ PEGAR ARQUIVO DO CACHE ═══════════════ */
async function pegarArquivo() {
    if (!('caches' in window)) return null;
    const cache = await caches.open('share-target-files');
    const resp = await cache.match('/shared-file');
    if (!resp) return null;

    const blob = await resp.blob();
    // Lê o nome original dos headers
    const nomeHeader = resp.headers.get('X-Nome-Original');
    let nome = 'compartilhado';
    if (nomeHeader) {
        try { nome = decodeURIComponent(nomeHeader); } catch (e) {}
    }
    const mime = resp.headers.get('Content-Type') || blob.type || '';

    await cache.delete('/shared-file');
    return { blob, nome, mime };
}

/* ═══════════════ CARREGAR MATÉRIAS ═══════════════ */
async function carregarMaterias() {
    try {
        const snap = await getDoc(doc(db, 'notas', userEmail));
        if (snap.exists() && Array.isArray(snap.data().materias)) {
            const nomes = snap.data().materias.map(m => m && m.nome).filter(Boolean);
            materias = ['Geral', ...new Set(nomes)];
        }
    } catch (e) {}
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
                c.toBlob(b => { URL.revokeObjectURL(url); b ? resolve(b) : reject(new Error('compress')); }, 'image/jpeg', Q);
            } catch (e) { URL.revokeObjectURL(url); reject(e); }
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img')); };
        img.src = url;
    });
}

/* ═══════════════ UPLOADS ═══════════════ */
async function uploadImgBB(blob) {
    const fd = new FormData();
    fd.append('image', blob);
    const r = await fetch('https://api.imgbb.com/1/upload?key=' + IMGBB_KEY, { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success || !d.data) throw new Error((d.error && d.error.message) || 'ImgBB falhou');
    return {
        url: d.data.url || (d.data.image && d.data.image.url) || '',
        thumb: (d.data.thumb && d.data.thumb.url) || d.data.url || '',
        medium: (d.data.medium && d.data.medium.url) || d.data.url || '',
        display_url: d.data.display_url || ''
    };
}

async function uploadCatbox(file) {
    const fd = new FormData();
    fd.append('reqtype', 'fileupload');
    fd.append('fileToUpload', file);
    const r = await fetch(CATBOX_URL, { method: 'POST', body: fd });
    if (!r.ok) throw new Error('catbox falhou (' + r.status + ')');
    const txt = (await r.text()).trim();
    if (!txt.startsWith('http')) throw new Error('catbox: ' + txt.slice(0, 80));
    return { url: txt, thumb: '', medium: '', display_url: '' };
}

/* ═══════════════ SALVAR ═══════════════ */
async function salvar() {
    if (!arquivo || !materiaSel) return;
    const btn = $('st-salvar');
    btn.disabled = true;
    btn.textContent = 'Enviando…';

    let erroEl = document.getElementById('st-erro');
    if (!erroEl) {
        erroEl = document.createElement('div');
        erroEl.id = 'st-erro';
        erroEl.style.cssText = 'width:100%;max-width:340px;margin-top:16px;padding:12px 14px;border-radius:12px;background:rgba(255,68,68,0.1);border:1px solid rgba(255,68,68,0.3);color:#ff9a9a;font-size:12px;font-weight:600;line-height:1.5;word-break:break-word;white-space:pre-wrap;';
        btn.parentNode.insertBefore(erroEl, btn.nextSibling);
    }
    erroEl.textContent = '';

    try {
        if (!IMGBB_KEY || IMGBB_KEY === 'COLE_SUA_CHAVE_AQUI') {
            throw new Error('Chave do ImgBB não colada no share-target.js');
        }
        if (!userEmail) throw new Error('Você não está logado');

        console.log('[share] tipo:', ehImg ? 'IMAGEM' : 'ARQUIVO', '| nome:', arquivo.name, '| size:', arquivo.size);

        let urls, tipoItem;
        if (ehImg) {
            const blob = await comprimir(arquivo);
            urls = await uploadImgBB(blob);
            tipoItem = 'imagem';
        } else {
            urls = await uploadCatbox(arquivo);
            tipoItem = 'arquivo';
        }
        if (!urls.url) throw new Error('Serviço não devolveu URL');

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

        btn.textContent = '✓ Salvo!';
        setTimeout(() => { window.location.href = 'conteudos.html'; }, 900);
    } catch (e) {
        console.error('[share] ERRO:', e);
        btn.textContent = 'Tentar de novo';
        btn.disabled = false;
        erroEl.textContent = '⚠️ ' + (e && e.message ? e.message : 'Erro desconhecido');
    }
}

/* ═══════════════ INIT ═══════════════ */
async function iniciar() {
    if (!userEmail) { window.location.href = 'login.html'; return; }
    await carregarMaterias();

    const info = await pegarArquivo();
    if (info) {
        // Monta o File preservando o nome E o mime originais
        arquivo = new File([info.blob], info.nome, { type: info.mime || info.blob.type || '' });
        ehImg = decidirTipo(info.nome, info.mime || info.blob.type) === 'imagem';

        console.log('[share] recebido:', info.nome, '| mime:', info.mime, '| decidido:', ehImg ? 'IMAGEM' : 'ARQUIVO');

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
        $('st-preview').innerHTML = `<div class="st-ico" style="opacity:0.3;">📭</div>`;
        $('st-sub').textContent = 'Nenhum arquivo recebido';
    }

    $('st-salvar').addEventListener('click', salvar);
}

iniciar();
