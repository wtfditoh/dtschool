/* conteudos.js — Hub Brain · Página de Conteúdos
   Filtros por matéria + bimestre. Envio via "Adicionar rápido".
   Lote 1: renomear + relacionar com atividade.
   Lote 2: compartilhar pasta + modo offline. */
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./hb-firebase.js";
import { abrirRapido } from "./hb-rapido.js";
import { extArquivo, emojiPorExt } from "./conteudos-upload.js";
import * as Fila from "./offline-queue.js";

const userEmail = localStorage.getItem('dt_user_email');

const $ = (id) => document.getElementById(id);
let fotos = [];           // Todas as fotos (global)
let fotosFiltradas = [];  // Fotos visíveis na tela (respeitando os filtros e a ordem visual)
let filtroMat = 'todas';
let filtroBim = 'todos';
let viewerIdx = 0;
let confirmandoDel = false;
let confirmTimer = null;

const PALETA = ['#8a2be2','#00d2ff','#00e5a0','#ff8c32','#ff4455','#c084fc','#ffbb33','#3b82f6','#ec4899','#10b981'];
function corMateria(nome) {
    if (!nome || nome === 'Geral') return '#8a2be2';
    let h = 0;
    for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) | 0;
    return PALETA[Math.abs(h) % PALETA.length];
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function toast(msg, ms) {
    let el = document.querySelector('.ct-toast');
    if (!el) { el = document.createElement('div'); el.className = 'ct-toast'; document.body.appendChild(el); }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add('on'));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('on'), ms || 2400);
}

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

function filtrar() {
    return fotos.filter(f => {
        if (filtroMat !== 'todas' && (f.materia || 'Geral') !== filtroMat) return false;
        if (filtroBim !== 'todos') {
            const bim = String(f.bimestre || '');
            if (filtroBim === '_sem') { if (bim) return false; }
            else { if (bim !== String(filtroBim)) return false; }
        }
        return true;
    });
}

function render() {
    const lista = $('ct-lista');
    if (!fotos.length) { lista.innerHTML = ''; $('ct-vazio').style.display = 'flex'; return; }
    $('ct-vazio').style.display = 'none';

    const todasMats = [...new Set(fotos.map(f => f.materia || 'Geral'))].sort();

    let html = '<div class="ct-filtros">';
    html += `<button class="ct-chip ${filtroMat === 'todas' ? 'on' : ''}" data-fmat="todas">Todas</button>`;
    todasMats.forEach(m => {
        const qtd = fotos.filter(f => (f.materia || 'Geral') === m).length;
        html += `<button class="ct-chip ${filtroMat === m ? 'on' : ''}" data-fmat="${esc(m)}"><i style="background:${corMateria(m)}"></i>${esc(m)} <span style="opacity:0.6">${qtd}</span></button>`;
    });
    html += '</div>';

    html += '<div class="ct-filtros">';
    html += `<button class="ct-chip ${filtroBim === 'todos' ? 'on' : ''}" data-fbim="todos">Todos os bim.</button>`;
    ['1','2','3','4'].forEach(b => {
        const qtd = fotos.filter(f => String(f.bimestre || '') === b).length;
        if (qtd > 0) html += `<button class="ct-chip ${filtroBim === b ? 'on' : ''}" data-fbim="${b}">${b}º BIM <span style="opacity:0.6">${qtd}</span></button>`;
    });
    const semBim = fotos.filter(f => !f.bimestre).length;
    if (semBim > 0) html += `<button class="ct-chip ${filtroBim === '_sem' ? 'on' : ''}" data-fbim="_sem">Sem bim. <span style="opacity:0.6">${semBim}</span></button>`;
    html += '</div>';

    const listaFiltrada = filtrar();
    
    // 👇 AQUI ESTÁ A CORREÇÃO: Agrupa a lista filtrada na MESMA ordem que vai aparecer na tela
    const todasMatsVisiveis = [...new Set(listaFiltrada.map(f => f.materia || 'Geral'))].sort();
    fotosFiltradas = [];
    todasMatsVisiveis.forEach(m => {
        const doGrupo = listaFiltrada.filter(f => (f.materia || 'Geral') === m);
        fotosFiltradas.push(...doGrupo);
    });

    if (!listaFiltrada.length) {
        html += '<div class="ct-vazio" style="display:flex;"><div style="font-size:40px;">🔍</div><b>Nada com esses filtros</b><span>Tenta trocar a matéria ou bimestre.</span></div>';
        lista.innerHTML = html;
        bindChips();
        return;
    }

    todasMatsVisiveis.forEach(m => {
        const doGrupo = listaFiltrada.filter(f => (f.materia || 'Geral') === m);
        if (!doGrupo.length) return;
        html += `<div class="ct-grupo"><div class="ct-grupo-head"><i style="width:10px;height:10px;border-radius:50%;background:${corMateria(m)}"></i><span class="ct-grupo-nome">${esc(m)}</span><span class="ct-grupo-count">${doGrupo.length}</span></div><div class="ct-grid">`;
        doGrupo.forEach(f => {
            const dataCurta = (f.data || '').slice(5).replace('-', '/');
            const bimBadge = f.bimestre ? `<span class="ct-bim-badge">${f.bimestre}º BIM</span>` : '';
            const tarefaBadge = f.tarefaNome ? `<span class="ct-tarefa-badge" title="${esc(f.tarefaNome)}">📌</span>` : '';
            if (f.tipo === 'pdf') {
                html += `<div class="ct-item ct-arquivo" data-id="${esc(f.id)}">${bimBadge}${tarefaBadge}<span class="ct-ico">📕</span><span class="ct-ext">pdf</span><span class="ct-nome-mini">${esc(f.nome || '')}</span><span class="ct-data">${esc(dataCurta)}</span></div>`;
            } else if (f.tipo === 'arquivo') {
                const ext = extArquivo(f.nome);
                html += `<div class="ct-item ct-arquivo" data-id="${esc(f.id)}">${bimBadge}${tarefaBadge}<span class="ct-ico">${emojiPorExt(ext)}</span><span class="ct-ext">${esc(ext || 'arquivo')}</span><span class="ct-nome-mini">${esc(f.nome || '')}</span><span class="ct-data">${esc(dataCurta)}</span></div>`;
            } else {
                const src = f.thumb || f.url || f.medium || '';
                html += `<div class="ct-item" data-id="${esc(f.id)}">${bimBadge}${tarefaBadge}<img src="${esc(src)}" alt="" loading="lazy" decoding="async"><span class="ct-data">${esc(dataCurta)}</span></div>`;
            }
        });
        html += '</div></div>';
    });

    lista.innerHTML = html;
    atualizarFAB();

    lista.querySelectorAll('.ct-item').forEach(it => {
        it.addEventListener('click', () => abrirViewer(it.dataset.id));
        const img = it.querySelector('img');
        if (img) img.addEventListener('error', () => it.classList.add('quebrada'), { once: true });
    });
    bindChips();
}

function bindChips() {
    document.querySelectorAll('[data-fmat]').forEach(chip => {
        chip.addEventListener('click', () => { filtroMat = chip.dataset.fmat; render(); });
    });
    document.querySelectorAll('[data-fbim]').forEach(chip => {
        chip.addEventListener('click', () => { filtroBim = chip.dataset.fbim; render(); });
    });
}

function abrirViewer(id) {
    // 👇 CORREÇÃO: Procura no array VISÍVEL (filtrado), não no global
    const idx = fotosFiltradas.findIndex(f => f.id === id);
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
    // 👇 CORREÇÃO: Usa a foto do array VISÍVEL
    const f = fotosFiltradas[viewerIdx];
    if (!f) return fecharViewer();
    const img = $('ct-viewer-img');
    resetZoom();

    const cardPdf = document.getElementById('ct-viewer-pdf');
    const cardArq = document.getElementById('ct-viewer-arquivo');
    if (cardPdf) cardPdf.style.display = 'none';
    if (cardArq) cardArq.style.display = 'none';

    if (f.tipo === 'pdf' && f.base64) {
        img.removeAttribute('src'); img.style.display = 'none';
        let card = cardPdf;
        if (!card) {
            card = document.createElement('div');
            card.id = 'ct-viewer-pdf';
            card.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:40px;text-align:center;z-index:1;';
            $('ct-viewer').appendChild(card);
        }
        card.style.display = 'flex';
        card.innerHTML = `<div style="font-size:80px;">📕</div><div style="font-size:16px;font-weight:800;color:#fff;word-break:break-word;max-width:280px;">${esc(f.nome || 'Documento')}</div><div style="font-size:12px;color:#666;font-weight:600;letter-spacing:1px;text-transform:uppercase;">PDF · ${f.tamanho ? Math.round(f.tamanho/1024) + ' KB' : ''}${f.bimestre ? ' · ' + f.bimestre + 'º BIM' : ''}</div><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px;"><button id="ct-pdf-abrir" style="display:inline-flex;align-items:center;gap:8px;padding:14px 22px;background:#8a2be2;color:#fff;border:none;border-radius:14px;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer;box-shadow:0 6px 20px rgba(138,43,226,0.4);">📄 Abrir PDF</button><button id="ct-pdf-baixar" style="display:inline-flex;align-items:center;gap:8px;padding:14px 22px;background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:14px;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer;">⬇️ Baixar</button></div>`;
        card.querySelector('#ct-pdf-abrir').onclick = () => abrirPdfBase64(f);
        card.querySelector('#ct-pdf-baixar').onclick = () => baixarPdfBase64(f);
    } else if (f.tipo === 'arquivo') {
        img.removeAttribute('src'); img.style.display = 'none';
        let card = cardArq;
        if (!card) {
            card = document.createElement('div');
            card.id = 'ct-viewer-arquivo';
            card.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:40px;text-align:center;z-index:1;';
            $('ct-viewer').appendChild(card);
        }
        const ext = extArquivo(f.nome);
        card.style.display = 'flex';
        card.innerHTML = `<div style="font-size:80px;">${emojiPorExt(ext)}</div><div style="font-size:16px;font-weight:800;color:#fff;word-break:break-word;max-width:280px;">${esc(f.nome || 'Arquivo')}</div><div style="font-size:12px;color:#666;font-weight:600;letter-spacing:1px;text-transform:uppercase;">${esc(ext || 'arquivo')}${f.bimestre ? ' · ' + f.bimestre + 'º BIM' : ''}</div><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px;"><a href="${esc(f.url)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:14px 22px;background:#8a2be2;color:#fff;text-decoration:none;border-radius:14px;font-weight:800;font-size:14px;box-shadow:0 6px 20px rgba(138,43,226,0.4);">📄 Abrir</a><a href="${esc(f.url)}" download="${esc(f.nome || 'arquivo')}" style="display:inline-flex;align-items:center;gap:8px;padding:14px 22px;background:rgba(255,255,255,0.06);color:#fff;text-decoration:none;border-radius:14px;font-weight:800;font-size:14px;border:1px solid rgba(255,255,255,0.1);">⬇️ Baixar</a></div>`;
    } else {
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
    const bimTxt = f.bimestre ? ' · ' + f.bimestre + 'º BIM' : '';
    const tarefaTxt = f.tarefaNome ? ` · 📌 ${esc(f.tarefaNome)}` : '';
    // 👇 CORREÇÃO: Mostra a contagem do array visível
    $('ct-viewer-info').innerHTML = esc(f.materia || 'Geral') + bimTxt + tarefaTxt + ' · ' + esc(f.nome || 'Arquivo') + `<small>${esc(dataFmt)} · ${viewerIdx + 1} de ${fotosFiltradas.length}</small>`;
    // 👇 CORREÇÃO: Verifica se só tem uma foto no array visível
    const unica = fotosFiltradas.length < 2;
    $('ct-viewer-ant').hidden = unica;
    $('ct-viewer-prox').hidden = unica;
}
function atualizarFAB() {
    const fab = $('ct-compartilhar');
    const txt = $('ct-fab-txt');
    if (!fab) return;
    const filtrados = filtrar();
    const temFiltroAtivo = filtroMat !== 'todas' || filtroBim !== 'todos';
    const deveMostrar = temFiltroAtivo && filtrados.length > 0;
    if (deveMostrar) {
        fab.classList.add('on');
        if (txt) txt.textContent = `Compartilhar ${filtrados.length} ${filtrados.length === 1 ? 'item' : 'itens'}`;
    } else {
        fab.classList.remove('on');
    }
}
function abrirPdfBase64(f) {
    try {
        const bin = atob(f.base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: f.mime || 'application/pdf' });
        window.open(URL.createObjectURL(blob), '_blank');
    } catch (e) { toast('Erro ao abrir PDF'); }
}
function baixarPdfBase64(f) {
    try {
        const bin = atob(f.base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: f.mime || 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.nome || 'documento.pdf';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { toast('Erro ao baixar PDF'); }
}
function navViewer(delta) {
    // 👇 CORREÇÃO: Usa o array visível
    if (!fotosFiltradas.length || zoom.scale > 1) return;
    viewerIdx = (viewerIdx + delta + fotosFiltradas.length) % fotosFiltradas.length;
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
    // 👇 CORREÇÃO
    const f = fotosFiltradas[viewerIdx];
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
        
        // Remove do array global
        const globalIdx = fotos.findIndex(x => x.id === f.id);
        if (globalIdx > -1) fotos.splice(globalIdx, 1);
        
        // Remove do array visível
        fotosFiltradas.splice(viewerIdx, 1);
        
        if (!fotosFiltradas.length) { fecharViewer(); render(); return; }
        if (viewerIdx >= fotosFiltradas.length) viewerIdx = fotosFiltradas.length - 1;
        resetConfirm();
        renderViewer();
        render();
    } catch (e) { toast('Não consegui excluir'); resetConfirm(); }
}

async function renomearAtual() {
    // 👇 CORREÇÃO
    const f = fotosFiltradas[viewerIdx];
    if (!f) return;
    const atual = f.nome || 'Arquivo';
    const novo = window.prompt('Novo nome do arquivo:', atual);
    if (novo === null) return;
    const limpo = String(novo).trim().slice(0, 100);
    if (!limpo || limpo === atual) return;
    try {
        await updateDoc(doc(db, 'conteudos', f.id), { nome: limpo });
        f.nome = limpo;
        
        // Atualiza no global também
        const globalF = fotos.find(x => x.id === f.id);
        if (globalF) globalF.nome = limpo;

        renderViewer();
        render();
        toast('✓ Nome atualizado');
    } catch (e) {
        console.error(e);
        toast('Erro ao renomear');
    }
}

async function compartilharAtual() {
    // 👇 CORREÇÃO
    const f = fotosFiltradas[viewerIdx];
    if (!f) return;
    const texto = '📚 Conteúdo — ' + (f.materia || 'Geral') + (f.bimestre ? ' · ' + f.bimestre + 'º BIM' : '');

    if (f.tipo === 'pdf' && f.base64) {
        try {
            const bin = atob(f.base64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const blob = new Blob([bytes], { type: f.mime || 'application/pdf' });
            const file = new File([blob], f.nome || 'documento.pdf', { type: f.mime || 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Hub Brain', text: texto });
                return;
            }
        } catch (e) { if (e.name === 'AbortError') return; }
    }

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

/* ═══════════════ COMPARTILHAR PASTA ═══════════════ */
async function compartilharPasta() {
    const filtrados = filtrar();
    if (!filtrados.length) {
        toast('Nada pra compartilhar com esses filtros');
        return;
    }

    const matTxt = filtroMat === 'todas' ? 'Todas as matérias' : filtroMat;
    const bimTxt = filtroBim === 'todos' ? '' : filtroBim === '_sem' ? 'Sem bimestre' : filtroBim + 'º BIM';
    const titulo = [matTxt, bimTxt].filter(Boolean).join(' · ');

    const confirmou = await abrirModalConfirmacao(titulo, filtrados.length);
    if (!confirmou) return;

    const conteudosIds = filtrados.map((f) => f.id);
    const capa = filtrados.find((f) => f.tipo === 'imagem')?.thumb || filtrados[0]?.thumb || filtrados[0]?.url || '';
    const autor = (localStorage.getItem('dt_user_name') || 'Alguém').split(' ')[0];

    try {
        toast('Criando pasta...', 5000);
        const { collection: col, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const ref = await addDoc(col(db, 'pastas'), { titulo, autor, autorEmail: userEmail, capa, conteudosIds, criadoEm: Date.now() });
        const link = `${location.origin}/pasta/${ref.id}`;
        try { await navigator.clipboard.writeText(link); toast('✓ Link copiado!'); } catch (e) { toast('Pasta criada!'); }
        mostrarLinkModal(link, titulo, filtrados.length);
    } catch (e) {
        console.error('[pasta]', e);
        toast('Erro ao criar pasta');
    }
}

function abrirModalConfirmacao(titulo, qtd) {
    return new Promise((resolve) => {
        const ov = document.createElement('div');
        ov.className = 'ct-confirm';
        ov.innerHTML = `
            <div class="ct-confirm-box">
                <div class="ct-confirm-icon">🔗</div>
                <h3>Compartilhar pasta?</h3>
                <p>Vai ser criado um link público que qualquer pessoa pode abrir — mesmo quem não tem conta.</p>
                <div class="ct-confirm-resumo">
                    <div class="ct-confirm-resumo-linha">
                        <span>Conteúdos</span>
                        <b>${qtd} ${qtd === 1 ? 'item' : 'itens'}</b>
                    </div>
                    <div class="ct-confirm-resumo-linha">
                        <span>Filtro</span>
                        <b class="roxo">${esc(titulo)}</b>
                    </div>
                </div>
                <div class="ct-confirm-btns">
                    <button class="ct-confirm-btn sec" data-aca="cancelar">Cancelar</button>
                    <button class="ct-confirm-btn pri" data-aca="confirmar">Compartilhar</button>
                </div>
            </div>
        `;
        document.body.appendChild(ov);
        requestAnimationFrame(() => ov.classList.add('on'));

        const fechar = (valor) => {
            ov.classList.remove('on');
            setTimeout(() => ov.remove(), 300);
            resolve(valor);
        };

        ov.addEventListener('click', (e) => {
            if (e.target === ov) return fechar(false);
            const btn = e.target.closest('[data-aca]');
            if (!btn) return;
            fechar(btn.dataset.aca === 'confirmar');
        });
    });
}

function mostrarLinkModal(link, titulo, qtd) {
    const ov = document.createElement('div');
    ov.className = 'ct-modal-pasta on';
    ov.innerHTML = `<div class="ct-modal-pasta-box"><button class="ct-modal-pasta-x" onclick="this.closest('.ct-modal-pasta').remove()">✕</button><div class="ct-modal-pasta-emoji">🔗</div><h3>Pasta pronta!</h3><p>"${esc(titulo)}" · ${qtd} ${qtd === 1 ? 'conteúdo' : 'conteúdos'}</p><div class="ct-modal-pasta-link">${esc(link)}</div><div class="ct-modal-pasta-btns"><button class="ct-modal-pasta-btn pri" onclick="navigator.clipboard.writeText('${link}').then(()=>{this.textContent='✓ Copiado!'})">📋 Copiar link</button>${navigator.share ? `<button class="ct-modal-pasta-btn sec" onclick="navigator.share({title:'${esc(titulo)}',url:'${link}'}).catch(()=>{})">📤 Compartilhar</button>` : ''}</div><p class="ct-modal-pasta-dica">💡 Cola no WhatsApp — o preview aparece com capa e tudo</p></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
}

async function atualizarBadgeFila() {
    const badge = $('ct-fila-badge');
    if (!badge) return;
    const total = await Fila.contar();
    if (total > 0) {
        badge.style.display = 'flex';
        badge.innerHTML = `📶 <b>${total}</b> ${total === 1 ? 'item' : 'itens'} offline`;
    } else {
        badge.style.display = 'none';
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
            pinchInicial = { dist: dist(e.touches[0], e.touches[1]), scale: zoom.scale, meio: meio(e.touches[0], e.touches[1]), x0: zoom.x, y0: zoom.y };
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
    $('ct-add').addEventListener('click', () => abrirRapido({ aba: 'conteudo', onConteudo: () => carregarFotos() }));

    const btnPasta = $('ct-compartilhar');
    if (btnPasta) btnPasta.addEventListener('click', compartilharPasta);

    atualizarBadgeFila();
    window.addEventListener('hb-fila-mudou', atualizarBadgeFila);
    window.addEventListener('hb-fila-sincronizada', () => {
        atualizarBadgeFila();
        toast('✓ Itens offline sincronizados');
        carregarFotos();
    });

    $('ct-viewer-x').addEventListener('click', fecharViewer);
    $('ct-viewer-ant').addEventListener('click', () => navViewer(-1));
    $('ct-viewer-prox').addEventListener('click', () => navViewer(1));
    $('ct-viewer-del').addEventListener('click', excluirAtual);
    $('ct-viewer-share').addEventListener('click', compartilharAtual);
    const btnRenomear = $('ct-viewer-rename');
    if (btnRenomear) btnRenomear.addEventListener('click', renomearAtual);

    document.addEventListener('keydown', (e) => {
        if (!$('ct-viewer').classList.contains('on')) return;
        if (e.key === 'Escape') fecharViewer();
        else if (e.key === 'ArrowLeft') navViewer(-1);
        else if (e.key === 'ArrowRight') navViewer(1);
    });

    Fila.registrarAutoSync({
        processarTarefa: async (dados) => {
            const { collection: col, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            await addDoc(col(db, 'agenda'), { ...dados, concluida: false, criadoEm: Date.now() });
        },
        processarConteudo: async (dados, arquivos) => {
            const { salvarItens } = await import("./conteudos-upload.js");
            const r = await salvarItens({
                items: arquivos.map((a) => ({ file: a.file, arq: a.arq })),
                materia: dados.materia,
                bimestre: dados.bimestre,
                tarefaId: dados.tarefaId,
                tarefaNome: dados.tarefaNome,
                userEmail: dados.userEmail
            });
            if (!r.ok) throw new Error('Falha no upload');
        }
    });

    instalarGestosZoom();
    await carregarFotos();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
