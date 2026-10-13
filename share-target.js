/* share-target.js — Recebe imagem compartilhada do WhatsApp/etc */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const IMGBB_KEY = 'b329a89d2327b3957464d6d27a3c275b';
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
let materiaSel = null;
let materias = ['Geral'];

const PALETA = ['#8a2be2','#00d2ff','#00e5a0','#ff8c32','#ff4455','#c084fc','#ffbb33','#3b82f6','#ec4899','#10b981'];
const corMateria = (n) => {
    if (!n || n === 'Geral') return '#8a2be2';
    let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) | 0;
    return PALETA[Math.abs(h) % PALETA.length];
};

async function pegarArquivo() {
    if ('caches' in window) {
        const cache = await caches.open('share-target-files');
        const resp = await cache.match('/shared-file');
        if (resp) {
            const blob = await resp.blob();
            await cache.delete('/shared-file');
            return blob;
        }
    }
    return null;
}

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
    console.log('[ImgBB]', d);
    if (!d.success || !d.data) throw new Error((d.error && d.error.message) || 'ImgBB falhou');
    return {
        url: d.data.url || (d.data.image && d.data.image.url) || '',
        thumb: (d.data.thumb && d.data.thumb.url) || d.data.url || '',
        medium: (d.data.medium && d.data.medium.url) || d.data.url || '',
        display_url: d.data.display_url || ''
    };
}

async function salvar() {
    if (!arquivo || !materiaSel) return;
    const btn = $('st-salvar');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    try {
        const blob = await comprimir(arquivo);
        const urls = await uploadImgBB(blob);
        if (!urls.url) throw new Error('ImgBB não devolveu URL');
        const hoje = new Date().toISOString().split('T')[0];
        await addDoc(collection(db, 'conteudos'), {
            usuario: userEmail,
            materia: materiaSel,
            url: urls.url,
            thumb: urls.thumb || urls.url,
            medium: urls.medium || urls.url,
            display_url: urls.display_url || '',
            nome: 'Compartilhado ' + hoje,
            data: hoje,
            criadoEm: Date.now(),
            origem: 'whatsapp'
        });
        btn.textContent = '✓ Salvo!';
        setTimeout(() => { window.location.href = 'conteudos.html'; }, 1000);
    } catch (e) {
        console.error(e);
        btn.textContent = 'Erro. Tentar de novo';
        btn.disabled = false;
    }
}

async function iniciar() {
    if (!userEmail) { window.location.href = 'login.html'; return; }
    await carregarMaterias();
    const blob = await pegarArquivo();
    if (blob) {
        arquivo = new File([blob], 'compartilhado.jpg', { type: blob.type || 'image/jpeg' });
        $('st-img').src = URL.createObjectURL(arquivo);
    } else {
        $('st-img').src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzE2MTYxYSIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzU1NSI+8J+lszwvdGV4dD48L3N2Zz4=';
    }
    $('st-salvar').addEventListener('click', salvar);
}

iniciar();
