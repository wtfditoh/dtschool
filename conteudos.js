/* conteudos.js — Hub Brain · Página de Conteúdos
   Lê a coleção `conteudos` do Firestore, agrupa por matéria, mostra grid,
   permite ver em tela cheia, excluir e adicionar novas fotos. */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const IMGBB_KEY = 'COLE_SUA_CHAVE_AQUI';

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
let fotos = [];          // todas as fotos do usuário
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

function toast(msg) {
    let el = document.querySelector('.ct-toast');
    if (!el) { el = document.createElement('div'); el.className = 'ct-toast'; document.body.appendChild(el); }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add('on'));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('on'), 2400);
}

/* ───────── Carrega matérias ───────── */
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

/* ───────── Carrega fotos ───────── */
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
    } catch (e) {
        console.error('[conteudos]', e);
        fotos = [];
    }
    $('ct-loading').style.display = 'none';
    render();
}

/* ───────── Render ───────── */
function render() {
    const lista = $('ct-lista');
    if (!fotos.length) {
        lista.innerHTML = '';
        $('ct-vazio').style.display = 'flex';
        return;
    }
    $('ct-vazio').style.display = 'none';

    const todasMats = [...new Set(fotos.map(f => f.materia || 'Geral'))].sort();

    // chips
    let html = '<div class="ct-filtros">';
    html += `<button class="ct-chip ${filtroMat === 'todas' ? 'on' : ''}" data-mat="todas">Todas</button>`;
    todasMats.forEach(m => {
        const qtd = fotos.filter(f => (f.materia || 'Geral') === m).length;
        html += `<button class="ct-chip ${filtroMat === m ? 'on' : ''}" data-mat="${esc(m)}">
            <i style="background:${corMateria(m)}"></i>${esc(m)} <span style="opacity:0.6">${qtd}</span>
        </button>`;
    });
    html += '</div>';

    // grupos
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
            html += `<div class="ct-item" data-id="${f.id}">
                <img src="${esc(f.thumb || f.url)}" alt="" loading="lazy" decoding="async">
                <span class="ct-data">${esc(dataCurta)}</span>
            </div>`;
        });
        html += '</div></div>';
    });

    lista.innerHTML = html;

    // listeners chips
    lista.querySelectorAll('.ct-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            filtroMat = chip.dataset.mat;
            render();
        });
    });
    // listeners fotos
    lista.querySelectorAll('.ct-item').forEach(it => {
        it.addEventListener('click', () => abrirViewer(it.dataset.id));
    });
}

/* ───────── Viewer tela cheia ───────── */
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
}
function navViewer(delta) {
    if (!fotos.length) return;
    viewerIdx = (viewerIdx + delta + fotos.length) % fotos.length;
    resetConfirm();
    renderViewer();
}
function renderViewer() {
    const f = fotos[viewerIdx];
    if (!f) return fecharViewer();
    $('ct-viewer-img').src = f.url;
    const dataFmt = f.data ? f.data.split('-').reverse().join('/') : '';
    $('ct-viewer-info').innerHTML = esc(f.materia || 'Geral') + ' · ' + esc(f.nome || 'Foto') + `<small>${esc(dataFmt)} · ${viewerIdx + 1} de ${fotos.length}</small>`;
    const unica = fotos.length < 2;
    $('ct-viewer-ant').hidden = unica;
    $('ct-viewer-prox').hidden = unica;
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
        toast('🗑 Foto excluída');
        fotos.splice(viewerIdx, 1);
        if (!fotos.length) { fecharViewer(); render(); return; }
        if (viewerIdx >= fotos.length) viewerIdx = fotos.length - 1;
        resetConfirm();
        renderViewer();
        render();
    } catch (e) {
        toast('Não consegui excluir');
        resetConfirm();
    }
}
async function compartilharAtual() {
    const f = fotos[viewerIdx];
    if (!f) return;
    const texto = '📷 Conteúdo — ' + (f.materia || 'Geral') + (f.data ? ' (' + f.data + ')' : '');
    if (navigator.share) {
        try { await navigator.share({ title: 'Hub Brain — Conteúdo', text: texto, url: f.url }); }
        catch (e) {}
    } else {
        try { await navigator.clipboard.writeText(f.url); toast('✓ Link copiado'); } catch (e) {}
    }
}

/* ───────── Adicionar foto ───────── */
function escolherMateria() {
    return new Promise((resolve) => {
        const modal = $('ct-modal');
        const matsBox = $('ct-mats');
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
    if (!d.success) throw new Error(d.error?.message || 'ImgBB recusou');
    return d.data.url;
}

async function processarArquivo(file) {
    if (!file || enviando) return;
    enviando = true;
    const btn = $('ct-add');
    btn.disabled = true; btn.style.opacity = '0.5';
    try {
        const materia = await escolherMateria();
        if (!materia) return;
        toast('📤 Enviando…');
        const blob = await comprimir(file);
        const url = await uploadImgBB(blob);
        const hoje = new Date().toISOString().split('T')[0];
        await addDoc(collection(db, 'conteudos'), {
            usuario: userEmail,
            materia: materia,
            url: url, thumb: url,
            nome: file.name || 'Foto do quadro',
            data: hoje,
            criadoEm: Date.now(),
            origem: 'conteudos'
        });
        toast('✓ Salva em ' + materia);
        await carregarFotos();
    } catch (e) {
        console.error('[ct]', e);
        toast('Erro: ' + (e.message || 'tente de novo'));
    } finally {
        enviando = false;
        btn.disabled = false; btn.style.opacity = '';
    }
}

/* ───────── Init ───────── */
async function iniciar() {
    $('ct-add').addEventListener('click', () => $('ct-file').click());
    $('ct-file').addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) processarArquivo(f);
        e.target.value = '';
    });
    $('ct-viewer-x').addEventListener('click', fecharViewer);
    $('ct-viewer-ant').addEventListener('click', () => navViewer(-1));
    $('ct-viewer-prox').addEventListener('click', () => navViewer(1));
    $('ct-viewer-del').addEventListener('click', excluirAtual);
    $('ct-viewer-share').addEventListener('click', compartilharAtual);
    $('ct-viewer').addEventListener('click', (e) => { if (e.target === $('ct-viewer')) fecharViewer(); });
    document.addEventListener('keydown', (e) => {
        if (!$('ct-viewer').classList.contains('on')) return;
        if (e.key === 'Escape') fecharViewer();
        else if (e.key === 'ArrowLeft') navViewer(-1);
        else if (e.key === 'ArrowRight') navViewer(1);
    });
    // swipe
    let sx = 0, sy = 0;
    $('ct-viewer').addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    $('ct-viewer').addEventListener('touchend', (e) => {
        if (e.changedTouches.length !== 1) return;
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) navViewer(dx > 0 ? -1 : 1);
    });

    await carregarMaterias();
    await carregarFotos();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
