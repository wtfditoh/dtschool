/* share-target.js — Hub Brain · Recebe arquivo compartilhado
   Imagem → ImgBB · PDF/arquivo → catbox.moe (direto, sem proxy) */

import { doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./hb-firebase.js";
import { uploadImgBB, imgbbConfigurado, comprimir, extArquivo, emojiPorExt, hojeLocal } from "./conteudos-upload.js";

const CATBOX_URL = 'https://catbox.moe/user/api.php';
const userEmail = localStorage.getItem('dt_user_email');
const $ = (id) => document.getElementById(id);

let arquivo = null;
let ehImg = false;
let materiaSel = null;
let materias = ['Geral'];

const PALETA = ['#8a2be2','#00d2ff','#00e5a0','#ff8c32','#ff4455','#c084fc','#ffbb33','#3b82f6','#ec4899','#10b981'];
function corMateria(n) {
    if (!n || n === 'Geral') return '#8a2be2';
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) | 0;
    return PALETA[Math.abs(h) % PALETA.length];
}

async function pegarArquivo() {
    if (!('caches' in window)) return null;
    const cache = await caches.open('share-target-files');
    const resp = await cache.match('/shared-file');
    if (!resp) return null;
    const blob = await resp.blob();
    const nomeHeader = resp.headers.get('X-Nome-Original');
    let nome = 'compartilhado';
    if (nomeHeader) { try { nome = decodeURIComponent(nomeHeader); } catch (e) {} }
    const mime = resp.headers.get('Content-Type') || blob.type || '';
    await cache.delete('/shared-file');
    return { blob, nome, mime };
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

async function salvar() {
    if (!arquivo || !materiaSel) return;
    const btn = $('st-salvar');
    const errEl = $('st-erro');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    errEl.textContent = '';

    try {
        if (!userEmail) throw new Error('Você não está logado');
        const hoje = hojeLocal();
        const base = { usuario: userEmail, materia: materiaSel, data: hoje, criadoEm: Date.now(), origem: 'whatsapp' };

        if (ehImg) {
            if (!imgbbConfigurado()) throw new Error('Chave do ImgBB não configurada');
            const blob = await comprimir(arquivo);
            const urls = await uploadImgBB(blob);
            await addDoc(collection(db, 'conteudos'), Object.assign({}, base, {
                tipo: 'imagem',
                nome: arquivo.name,
                url: urls.url,
                thumb: urls.thumb || urls.url,
                medium: urls.medium || urls.url,
                display_url: urls.display_url || ''
            }));
        } else {
            const urls = await uploadCatbox(arquivo);
            await addDoc(collection(db, 'conteudos'), Object.assign({}, base, {
                tipo: 'arquivo',
                nome: arquivo.name,
                url: urls.url,
                thumb: '', medium: '', display_url: ''
            }));
        }

        btn.textContent = '✓ Salvo!';
        setTimeout(() => { window.location.href = 'conteudos.html'; }, 1200);
    } catch (e) {
        console.error('[share]', e);
        errEl.textContent = '⚠️ ' + (e.message || 'Erro');
        btn.textContent = 'Tentar de novo';
        btn.disabled = false;
    }
}

async function iniciar() {
    if (!userEmail) { window.location.href = 'login.html'; return; }
    await carregarMaterias();
    const info = await pegarArquivo();
    if (info) {
        arquivo = new File([info.blob], info.nome, { type: info.mime || info.blob.type || '' });
        const ext = extArquivo(info.nome);
        ehImg = (info.mime && info.mime.indexOf('image/') === 0) || ['jpg','jpeg','png','gif','webp','bmp','heic','heif'].indexOf(ext) !== -1;

        const preview = $('st-preview');
        if (ehImg) {
            preview.innerHTML = '<img id="st-img" alt="">';
            $('st-img').src = URL.createObjectURL(arquivo);
            $('st-sub').textContent = 'Escolha a matéria da foto';
        } else {
            const ext2 = extArquivo(info.nome) || 'arquivo';
            preview.innerHTML =
                '<div class="st-ico">' + emojiPorExt(ext2) + '</div>' +
                '<div class="st-ext">' + ext2.toUpperCase() + '</div>' +
                '<div class="st-nome">' + info.nome + '</div>';
            $('st-sub').textContent = 'Escolha a matéria do arquivo';
        }
    } else {
        $('st-preview').innerHTML = '<div class="st-ico" style="opacity:0.3;">📭</div>';
        $('st-sub').textContent = 'Nenhum arquivo recebido';
    }
    $('st-salvar').addEventListener('click', salvar);
}

iniciar();
