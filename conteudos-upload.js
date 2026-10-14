/* conteudos-upload.js — upload de conteúdos (foto → ImgBB · PDF/arquivo → catbox) + gravação no Firestore.
   Usado pela página Conteúdos e pelo "Adicionar rápido" (Home e Agenda). */
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./hb-firebase.js";

// ▼▼▼ COLE AQUI a chave do ImgBB (https://api.imgbb.com). Só neste lugar. ▼▼▼
export const IMGBB_KEY = 'COLE_SUA_CHAVE_AQUI';
// (dica: para testar sem mexer no código, rode no console:  localStorage.setItem('hb_imgbb_key', 'SUA_CHAVE'))

const CATBOX_URL = 'https://catbox.moe/user/api.php';
const chaveImgBB = () => (localStorage.getItem('hb_imgbb_key') || IMGBB_KEY || '').trim();
export const imgbbConfigurado = () => { const k = chaveImgBB(); return !!k && k !== 'COLE_SUA_CHAVE_AQUI'; };

const pad = (n) => String(n).padStart(2, '0');
/** Data LOCAL (AAAA-MM-DD). O toISOString() usa UTC e, depois das 21h em Brasília, devolvia o dia seguinte. */
export function hojeLocal() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

export function extArquivo(nome) {
    const m = String(nome || '').toLowerCase().match(/\.([a-z0-9]{1,6})$/);
    return m ? m[1] : '';
}
export function emojiPorExt(ext) {
    const map = { pdf: '📕', doc: '📘', docx: '📘', txt: '📄', ppt: '📙', pptx: '📙', xls: '📗', xlsx: '📗', csv: '📗', zip: '🗜️', rar: '🗜️', mp3: '🎵', mp4: '🎬' };
    return map[ext] || '📎';
}

/** Reduz a foto (lado maior ≤ 2400px, JPEG 92%) antes de subir. */
export function comprimir(file) {
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
                c.toBlob((b) => { URL.revokeObjectURL(url); b ? resolve(b) : reject(new Error('compress')); }, 'image/jpeg', Q);
            } catch (e) { URL.revokeObjectURL(url); reject(e); }
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img')); };
        img.src = url;
    });
}

export async function uploadImgBB(blob) {
    const fd = new FormData();
    fd.append('image', blob);
    const r = await fetch('https://api.imgbb.com/1/upload?key=' + encodeURIComponent(chaveImgBB()), { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success || !d.data) throw new Error((d.error && d.error.message) || 'ImgBB recusou');
    return {
        url: d.data.url || (d.data.image && d.data.image.url) || '',
        thumb: (d.data.thumb && d.data.thumb.url) || d.data.url || '',
        medium: (d.data.medium && d.data.medium.url) || d.data.url || '',
        display_url: d.data.display_url || ''
    };
}

export async function uploadCatbox(file) {
    const fd = new FormData();
    fd.append('reqtype', 'fileupload');
    fd.append('fileToUpload', file);
    const r = await fetch(CATBOX_URL, { method: 'POST', body: fd });
    if (!r.ok) throw new Error('catbox falhou (' + r.status + ')');
    const txt = (await r.text()).trim();
    if (!txt.startsWith('http')) throw new Error('catbox: ' + txt.slice(0, 80));
    return { url: txt, thumb: '', medium: '', display_url: '' };
}

/**
 * Sobe e salva os itens na coleção `conteudos` (mesmos campos de sempre).
 * items: [{ file, arq?: boolean }]  (arq = tratar como arquivo mesmo sendo imagem)
 * Retorna { ok, falha, erros }. Lança erro claro se o ImgBB não estiver configurado.
 */
export async function salvarItens({ items, materia, userEmail, onProgresso }) {
    const precisaImg = items.some((it) => !it.arq && it.file.type.startsWith('image/'));
    if (precisaImg && !imgbbConfigurado()) {
        throw new Error('Falta configurar a chave do ImgBB (conteudos-upload.js). Arquivos PDF/Word funcionam sem ela.');
    }
    const data = hojeLocal();
    let ok = 0, falha = 0;
    const erros = [];
    for (let i = 0; i < items.length; i++) {
        const { file, arq } = items[i];
        try {
            if (onProgresso) onProgresso(i + 1, items.length);
            let urls, tipoItem;
            if (arq || !file.type.startsWith('image/')) { urls = await uploadCatbox(file); tipoItem = 'arquivo'; }
            else { urls = await uploadImgBB(await comprimir(file)); tipoItem = 'imagem'; }
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
                data,
                criadoEm: Date.now() + i,
                origem: 'conteudos'
            });
            ok++;
        } catch (err) {
            console.error('[conteudos] falha:', err);
            erros.push(err && err.message);
            falha++;
        }
    }
    return { ok, falha, erros };
}
