/* conteudos.js — Hub Brain · Página de Conteúdos
   Imagem → ImgBB · PDF/doc → catbox.moe · múltiplos · zoom · compartilhar. */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const IMGBB_KEY = 'COLE_SUA_CHAVE_AQUI';
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
let fotos = [];
let filtroMat = 'todas';
let materias = ['Geral'];
let viewerIdx = 0;
let confirmandoDel = false;
let confirmTimer = null;
let enviando = false;

const PALETA = ['#8a2be2','#00d2ff','#00e5a0','#ff8c32','#ff4455','#c084fc','#ffbb33','#3b82f6','#ec4899','#10b981'];
function corMateria(nome) {
    if (!nome || nome === 'Geral') return '#8a2be2';
    let h = 0;
    for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) | 0;
    return PALETA[Math.abs(h) % PALETA.length];
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function extArquivo(nome) {
    const m = String(nome || '').toLowerCase().match(/\.([a-z0-9]{1,6})$/);
    return m ? m[1] : '';
}
function emojiPorExt(ext) {
    const map = { pdf:'📕', doc:'📘', docx:'📘', txt:'📄', ppt:'📙', pptx:'📙',
                  xls:'📗', xlsx:'📗', csv:'📗', zip:'🗜️', rar:'🗜️', mp3:'🎵', mp4:'🎬' };
    return map[ext] || '📎';
}

function toast(msg, ms) {
    let el = document.querySelector('.ct-toast');
    if (!el) { el = document.createElement('div'); el.className = 'ct-toast'; document.body.appendChild(el); }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add('on'));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('on'), ms || 2400);
}

/* ZOOM */
const zoom = { scale: 1, min: 1, max: 5, x: 0, y: 0, ativo: false };
function resetZoom() { zoom.scale = 1; zoom.x = 0; zoom.y = 0; zoom.ativo = false; aplicarZoom(); }
function aplicarZoom(anim) {
    const img = $('ct-viewer-img'); if (!img) return;
    img.style.transition = anim ? 'transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none';
    img.style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`;
    img.style.cursor = zoom.ativo ? 'grab' : 'zoom-in';
    if (anim) setTimeout(() => { if (img) img.style.transition = 'none'; }, 260);
}
function clampXY() {
    if (zoom.scale <= 1) { zoom.x = 0; zoom.y = 0; return; }
    const img = $('ct-viewer-img'); if (!img) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const rect = img.getBoundingClientRect();
    const natW = img.naturalWidth || rect.width;
    const natH = img.naturalHeight || rect.height;
    const escalaContain = Math.min(vw / natW, vh / natH);
    const visW = natW * escalaContain * zoom.scale;
    const visH = natH * escalaContain * zoom.scale;
    const maxX = Math.max(0, (visW - vw) / 2);
    const maxY = Math.max(0, (visH - vh) / 2);
    zoom.x = Math.max(-maxX, Math.min(maxX, zoom.x));
    zoom.y = Math.max(-maxY, Math.min(maxY, zoom.y));
}

async function carregarMaterias() {
    if (!userEmail) return;
    try {
        const snap = await getDoc(doc(db, 'notas', userEmail));
        if (snap.exists() && Array.isArray(snap.data().materias)) {
            const nomes = snap.data().materias.map(m => m && m.nome).filter(Boolean);
            materias = ['Geral', ...new Set(nomes)];
        }
    } catch (e) {
        try {
            const local = JSON.parse(localStorage.getItem('materias') || '[]');
            if (local.length) materias = ['Geral', ...local.map(m => m.nome)];
        } catch (_) {}
    }
}
async function carregarFotos() {
    if (!userEmail) return;
    $('ct-loading').style.display = 'flex';
    $('ct-vazio').style.display = 'none';
    $('ct-lista').innerHTML = '';
    try {
        const q = query(collection(db, 'conteudos'), where('usuario', '==', userEmail));
        const snap = await getDocs(q);
        fotos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
    } catch (e) { console.error('[conteudos]', e); fotos = []; }
    $('ct-loading').style.display = 'none';
    render();
}

function render() {
    const lista = $('ct-lista');
    if (!fotos.length) { lista.innerHTML = ''; $('ct-vazio').style.display = 'flex'; return; }
    $('ct-vazio').style.display = 'none';

    const todasMats = [...new Set(fotos.map(f => f.materia || 'Geral'))].sort();
    let html = '<div class="ct-filtros">';
    html += `<button class="ct-chip ${filtroMat === 'todas' ? 'on' : ''}" data-mat="todas">Todas</button>`;
    todasMats.forEach(m => {
        const qtd = fotos.filter(f => (f.materia || 'Geral') === m).length;
        html += `<button class="ct-chip ${filtroMat === m ? 'on' : ''}" data-mat="${esc(m)}">
            <i style="background:${corMateria(m)}"></i>${esc(m)} <span style="opacity:0.6">${qtd}</span>
        </button>`;
    });
    html += '</div>';

    const grupos = filtroMat === 'todas' ? todasMats : [filtroMat];
    grupos.forEach(m => {
        const doGrupo = fotos.filter(f => (f.materia || 'Geral') === m);
        if (!doGrupo.length) return;
        html += `<div class="ct-grupo">
            <div class="ct-grupo-head">
                <i style="width:10px;height:10px;border-radius:50%;background:${corMateria(m)}"></i>
                <span class="ct-grupo-nome">${esc(m)}</span>
                <span class="ct-grupo-count">${doGrupo.length}</span>
            </div>
            <div class="ct-grid">`;
        doGrupo.forEach(f => {
            const dataCurta = (f.data || '').slice(5).replace('-', '/');
            if (f.tipo === 'arquivo') {
                const ext = extArquivo(f.nome);
                html += `<div class="ct-item ct-arquivo" data-id="${f.id}">
                    <span class="ct-ico">${emojiPorExt(ext)}</span>
                    <span class="ct-ext">${esc(ext || 'arquivo')}</span>
                    <span class="ct-nome-mini">${esc(f.nome || '')}</span>
                    <span class="ct-data">${esc(dataCurta)}</span>
                </div>`;
            } else {
                const src = f.thumb || f.url || f.medium || '';
                html += `<div class="ct-item" data-id="${f.id}">
                    <img src="${esc(src)}" alt="" loading="lazy" decoding="async"
                         onerror="console.warn('[grid]', this.src); this.onerror=null;">
                    <span class="ct-data">${esc(dataCurta)}</span>
                </div>`;
            }
        });
        html += '</div></div>';
    });

    lista.innerHTML = html;
    lista.querySelectorAll('.ct-chip').forEach(chip => {
        chip.addEventListener('click', () => { filtroMat = chip.dataset.mat; render(); });
    });
    lista.querySelectorAll('.ct-item').forEach(it => {
        it.addEventListener('click', () => abrirViewer(it.dataset.id));
    });
}

function abrirViewer(id) {
    const idx = fotos.findIndex(f => f.id === id);
    if (idx === -1) return;
    viewerIdx = idx;
    renderViewer();
    $('ct-viewer').classList.add('on');
    document.body.style.overflow = 'hidden';
}
function fecharViewer() {
    $('ct-viewer').classList.remove('on');
    document.body.style.overflow = '';
    resetConfirm();
    resetZoom();
}
function renderViewer() {
    const f = fotos[viewerIdx];
    if (!f) return fecharViewer();
    const img = $('ct-viewer-img');
    resetZoom();

    if (f.tipo === 'arquivo') {
        img.removeAttribute('src');
        img.style.display = 'none';
        let card = document.getElementById('ct-viewer-arquivo');
        if (!card) {
            card = document.createElement('div');
            card.id = 'ct-viewer-arquivo';
            card.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:40px;text-align:center;z-index:1;';
            $('ct-viewer').appendChild(card);
        }
        const ext = extArquivo(f.nome);
        card.style.display = 'flex';
        card.innerHTML = `
            <div style="font-size:80px;">${emojiPorExt(ext)}</div>
            <div style="font-size:16px;font-weight:800;color:#fff;word-break:break-word;max-width:280px;">${esc(f.nome || 'Arquivo')}</div>
            <div style="font-size:12px;color:#666;font-weight:600;letter-spacing:1px;text-transform:uppercase;">${esc(ext || 'arquivo')}</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px;">
                <a href="${esc(f.url)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:14px 22px;background:#8a2be2;color:#fff;text-decoration:none;border-radius:14px;font-weight:800;font-size:14px;box-shadow:0 6px 20px rgba(138,43,226,0.4);">
                    📄 Abrir
                </a>
                <a href="${esc(f.url)}" download="${esc(f.nome || 'arquivo')}" style="display:inline-flex;align-items:center;gap:8px;padding:14px 22px;background:rgba(255,255,255,0.06);color:#fff;text-decoration:none;border-radius:14px;font-weight:800;font-size:14px;border:1px solid rgba(255,255,255,0.1);">
                    ⬇️ Baixar
                </a>
            </div>
        `;
    } else {
        const card = document.getElementById('ct-viewer-arquivo');
        if (card) card.style.display = 'none';
        img.style.display = '';
        const fontes = [f.url, f.display_url, f.medium, f.thumb].filter(Boolean);
        img.removeAttribute('src'); img.onerror = null; img.onload = null;
        let idx = 0;
        const tentar = () => { if (idx >= fontes.length) return; img.src = fontes[idx]; };
        img.onerror = () => { idx++; tentar(); };
        img.onload = () => { aplicarZoom(false); };
        tentar();
    }

    const dataFmt = f.data ? f.data.split('-').reverse().join('/') : '';
    $('ct-viewer-info').innerHTML = esc(f.materia || 'Geral') + ' · ' + esc(f.nome || 'Arquivo') + `<small>${esc(dataFmt)} · ${viewerIdx + 1} de ${fotos.length}</small>`;
    const unica = fotos.length < 2;
    $('ct-viewer-ant').hidden = unica;
    $('ct-viewer-prox').hidden = unica;
}
function navViewer(delta) {
    if (!fotos.length || zoom.scale > 1) return;
    viewerIdx = (viewerIdx + delta + fotos.length) % fotos.length;
    resetConfirm();
    renderViewer();
}
function resetConfirm() {
    confirmandoDel = false;
    clearTimeout(confirmTimer);
    const btn = $('ct-viewer-del');
    if (!btn) return;
    btn.classList.remove('confirmar');
    btn.innerHTML = '<i data-lucide="trash-2" style="width:18px;height:18px;"></i>';
    if (window.lucide) lucide.createIcons();
}
async function excluirAtual() {
    const f = fotos[viewerIdx];
    if (!f) return;
    const btn = $('ct-viewer-del');
    if (!confirmandoDel) {
        confirmandoDel = true;
        btn.classList.add('confirmar');
        btn.innerHTML = '<span style="font-size:10px;font-weight:800;">Excluir?</span>';
        confirmTimer = setTimeout(resetConfirm, 3000);
        return;
    }
    try {
        await deleteDoc(doc(db, 'conteudos', f.id));
        toast('🗑 Excluído');
        fotos.splice(viewerIdx, 1);
        if (!fotos.length) { fecharViewer(); render(); return; }
        if (viewerIdx >= fotos.length) viewerIdx = fotos.length - 1;
        resetConfirm();
        renderViewer();
        render();
    } catch (e) { toast('Não consegui excluir'); resetConfirm(); }
}

async function compartilharAtual() {
    const f = fotos[viewerIdx];
    if (!f) return;
    const texto = '📚 Conteúdo — ' + (f.materia || 'Geral') + (f.data ? ' (' + f.data + ')' : '');

    if (f.tipo === 'arquivo') {
        if (navigator.share) {
            try { await navigator.share({ title: 'Hub Brain — Conteúdo', text: texto + '\n' + f.nome, url: f.url }); return; }
            catch (e) { if (e.name === 'AbortError') return; }
        }
        try { await navigator.clipboard.writeText(f.url); toast('✓ Link copiado'); } catch (e) {}
        return;
    }

    const fontes = [f.url, f.display_url, f.medium, f.thumb].filter(Boolean);
    if (navigator.canShare && navigator.share) {
        try {
            toast('Preparando imagem…');
            let blob = null;
            for (const u of fontes) {
                try {
                    const resp = await fetch(u, { mode: 'cors' });
                    if (!resp.ok) continue;
                    blob = await resp.blob();
                    if (blob && blob.size > 0) break;
                } catch (err) {}
            }
            if (!blob) throw new Error('não consegui baixar');
            const tipo = blob.type || 'image/jpeg';
            const ext = tipo.split('/')[1].replace('jpeg', 'jpg') || 'jpg';
            const nomeLimpo = (f.materia || 'Geral').replace(/[^\w\-]+/g, '-');
            const file = new File([blob], 'conteudo-' + nomeLimpo + '-' + Date.now() + '.' + ext, { type: tipo });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Hub Brain — Conteúdo', text: texto });
                return;
            }
        } catch (e) { if (e.name === 'AbortError') return; }
    }
    if (navigator.share) {
        try { await navigator.share({ title: 'Hub Brain — Conteúdo', text: texto, url: f.url }); return; }
        catch (e) { if (e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(f.url); toast('✓ Link copiado'); } catch (e) {}
}

function escolherTipo() {
    return new Promise((resolve) => {
        const modal = $('ct-tipo');
        modal.classList.add('on');
        const fechar = (valor) => {
            modal.classList.remove('on');
            setTimeout(() => resolve(valor), 250);
        };
        const h = (e) => {
            if (e.target === modal) { cleanup(); fechar(null); return; }
            const b = e.target.closest('.ct-tipo-btn');
            if (b) { cleanup(); fechar(b.dataset.tipo); return; }
            if (e.target.id === 'ct-tipo-cancel') { cleanup(); fechar(null); }
        };
        const cleanup = () => modal.removeEventListener('click', h);
        modal.addEventListener('click', h);
    });
}

function escolherMateria(qtd) {
    return new Promise((resolve) => {
        const modal = $('ct-modal');
        const matsBox = $('ct-mats');
        const sub = $('ct-modal-sub');
        if (sub) sub.textContent = qtd > 1 ? qtd + ' itens — escolha a matéria' : 'Do conteúdo';

        matsBox.innerHTML = materias.map(m =>
            `<button class="ct-mat" data-m="${esc(m)}">
                <span class="ct-mat-dot" style="background:${corMateria(m)}"></span>${esc(m)}
            </button>`).join('');
        modal.classList.add('on');
        const fechar = (valor) => {
            modal.classList.remove('on');
            setTimeout(() => resolve(valor), 250);
        };
        const h = (e) => {
            if (e.target === modal) { cleanup(); fechar(null); return; }
            const b = e.target.closest('.ct-mat');
            if (b) { cleanup(); fechar(b.dataset.m); return; }
            if (e.target.id === 'ct-cancelar') { cleanup(); fechar(null); }
        };
        const cleanup = () => modal.removeEventListener('click', h);
        modal.addEventListener('click', h);
    });
}

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

async function uploadImgBB(blob) {
    const fd = new FormData();
    fd.append('image', blob);
    const r = await fetch('https://api.imgbb.com/1/upload?key=' + IMGBB_KEY, { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success || !d.data) throw new Error((d.error && d.error.message) || 'ImgBB recusou');
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

async function processarArquivos(files, tipoForcado) {
    if (!files || !files.length || enviando) return;
    enviando = true;
    const btn = $('ct-add');
    btn.disabled = true; btn.style.opacity = '0.5';

    try {
        const materia = await escolherMateria(files.length);
        if (!materia) return;

        const hoje = new Date().toISOString().split('T')[0];
        let ok = 0, falha = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                toast('📤 Enviando ' + (i + 1) + '/' + files.length + '…', 5000);
                let urls, tipoItem;
                if (tipoForcado === 'arq' || !file.type.startsWith('image/')) {
                    urls = await uploadCatbox(file);
                    tipoItem = 'arquivo';
                } else {
                    const blob = await comprimir(file);
                    urls = await uploadImgBB(blob);
                    tipoItem = 'imagem';
                }
                if (!urls.url) throw new Error('sem URL');
                await addDoc(collection(db, 'conteudos'), {
                    usuario: userEmail,
                    materia: materia,
                    tipo: tipoItem,
                    url: urls.url,
                    thumb: urls.thumb || '',
                    medium: urls.medium || '',
                    display_url: urls.display_url || '',
                    nome: file.name || (tipoItem === 'imagem' ? 'Foto ' + (i + 1) : 'Arquivo'),
                    data: hoje,
                    criadoEm: Date.now() + i,
                    origem: 'conteudos'
                });
                ok++;
            } catch (err) {
                console.error('[ct] falha:', err);
                falha++;
            }
        }

        if (falha === 0) toast('✓ ' + ok + (ok === 1 ? ' item salvo' : ' itens salvos') + ' em ' + materia);
        else if (ok === 0) toast('❌ Nada foi salvo');
        else toast('✓ ' + ok + ' salvos · ' + falha + ' falharam', 3500);

        await carregarFotos();
    } catch (e) {
        console.error('[ct]', e);
        toast('Erro: ' + (e.message || 'tente de novo'));
    } finally {
        enviando = false;
        btn.disabled = false; btn.style.opacity = '';
    }
}

function instalarGestosZoom() {
    const viewer = $('ct-viewer');
    const img = $('ct-viewer-img');
    if (!viewer || !img) return;

    let pinchInicial = null, dragInicial = null, swipeInicial = null;
    let ultimoToque = 0, toqueRapidoTimer = null, suprimiuClick = false;
    const dist = (a, b) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    const meio = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });

    viewer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault(); swipeInicial = null;
            pinchInicial = {
                dist: dist(e.touches[0], e.touches[1]),
                scale: zoom.scale,
                meio: meio(e.touches[0], e.touches[1]),
                x0: zoom.x, y0: zoom.y
            };
        } else if (e.touches.length === 1) {
            const t = e.touches[0];
            if (zoom.scale > 1) dragInicial = { x: t.clientX, y: t.clientY, x0: zoom.x, y0: zoom.y };
            else swipeInicial = { x: t.clientX, y: t.clientY };
            const agora = Date.now();
            if (agora - ultimoToque < 300) {
                ultimoToque = 0; clearTimeout(toqueRapidoTimer);
                suprimiuClick = true;
                setTimeout(() => { suprimiuClick = false; }, 400);
                handleDoubleTap(t.clientX, t.clientY);
            } else {
                ultimoToque = agora;
                clearTimeout(toqueRapidoTimer);
                toqueRapidoTimer = setTimeout(() => { ultimoToque = 0; }, 320);
            }
        }
    }, { passive: false });

    viewer.addEventListener('touchmove', (e) => {
        if (pinchInicial && e.touches.length === 2) {
            e.preventDefault();
            const d = dist(e.touches[0], e.touches[1]);
            let novoScale = pinchInicial.scale * (d / pinchInicial.dist);
            novoScale = Math.max(zoom.min, Math.min(zoom.max, novoScale));
            const m = meio(e.touches[0], e.touches[1]);
            zoom.scale = novoScale;
            zoom.x = pinchInicial.x0 + (m.x - pinchInicial.meio.x);
            zoom.y = pinchInicial.y0 + (m.y - pinchInicial.meio.y);
            zoom.ativo = zoom.scale > 1.02;
            clampXY(); aplicarZoom(false);
            return;
        }
        if (dragInicial && e.touches.length === 1) {
            e.preventDefault();
            const t = e.touches[0];
            zoom.x = dragInicial.x0 + (t.clientX - dragInicial.x);
            zoom.y = dragInicial.y0 + (t.clientY - dragInicial.y);
            clampXY(); aplicarZoom(false);
            return;
        }
        if (swipeInicial && e.touches.length === 1) {
            const t = e.touches[0];
            const dx = t.clientX - swipeInicial.x;
            const dy = t.clientY - swipeInicial.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                navViewer(dx > 0 ? -1 : 1);
                swipeInicial = null;
            }
        }
    }, { passive: false });

    viewer.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            pinchInicial = dragInicial = swipeInicial = null;
            if (zoom.scale < 1.05) { zoom.scale = 1; zoom.x = 0; zoom.y = 0; zoom.ativo = false; aplicarZoom(true); }
        } else if (e.touches.length === 1 && pinchInicial) {
            pinchInicial = null;
            if (zoom.scale > 1) {
                const t = e.touches[0];
                dragInicial = { x: t.clientX, y: t.clientY, x0: zoom.x, y0: zoom.y };
            }
        }
    }, { passive: true });

    viewer.addEventListener('click', (e) => {
        if (suprimiuClick) { e.preventDefault(); e.stopPropagation(); return; }
        if (e.target === viewer && zoom.scale <= 1) fecharViewer();
    });

    viewer.addEventListener('wheel', (e) => {
        if (!viewer.classList.contains('on')) return;
        e.preventDefault();
        let novo = zoom.scale * (1 + (-e.deltaY * 0.002));
        novo = Math.max(zoom.min, Math.min(zoom.max, novo));
        zoom.scale = novo; zoom.ativo = zoom.scale > 1.02;
        clampXY(); aplicarZoom(false);
    }, { passive: false });

    img.addEventListener('dblclick', (e) => { e.preventDefault(); handleDoubleTap(e.clientX, e.clientY); });
}
function handleDoubleTap(x, y) {
    if (zoom.scale > 1.05) { resetZoom(); aplicarZoom(true); return; }
    const img = $('ct-viewer-img'); if (!img) return;
    const rect = img.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    zoom.scale = 2.5;
    zoom.x = (cx - x) * 1.5 / 2.5;
    zoom.y = (cy - y) * 1.5 / 2.5;
    zoom.ativo = true;
    clampXY(); aplicarZoom(true);
}

async function iniciar() {
    // Botão + abre o mini-menu de tipo
    $('ct-add').addEventListener('click', async () => {
        const tipo = await escolherTipo();
        if (tipo === 'img') $('ct-file-img').click();
        else if (tipo === 'arq') $('ct-file-arq').click();
    });
    $('ct-file-img').addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length) processarArquivos(files, 'img');
        e.target.value = '';
    });
    $('ct-file-arq').addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length) processarArquivos(files, 'arq');
        e.target.value = '';
    });

    $('ct-viewer-x').addEventListener('click', fecharViewer);
    $('ct-viewer-ant').addEventListener('click', () => navViewer(-1));
    $('ct-viewer-prox').addEventListener('click', () => navViewer(1));
    $('ct-viewer-del').addEventListener('click', excluirAtual);
    $('ct-viewer-share').addEventListener('click', compartilharAtual);
    document.addEventListener('keydown', (e) => {
        if (!$('ct-viewer').classList.contains('on')) return;
        if (e.key === 'Escape') fecharViewer();
        else if (e.key === 'ArrowLeft') navViewer(-1);
        else if (e.key === 'ArrowRight') navViewer(1);
    });

    instalarGestosZoom();
    await carregarMaterias();
    await carregarFotos();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
