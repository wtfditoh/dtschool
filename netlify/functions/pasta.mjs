/**
 * Netlify Function — página pública de pasta/conteúdo compartilhado.
 * Detecta o ID pelo path (/pasta/xxx) OU pela query (?id=xxx).
 * Header pílula flutuante + rodapé estilo Hub Brain.
 */

const PROJECT = 'dt-scho0l';
const API_KEY = 'AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc';
const SITE = 'https://hubbrain.netlify.app';

function extrair(v) {
    if (!v) return null;
    if (v.stringValue !== undefined) return v.stringValue;
    if (v.integerValue !== undefined) return Number(v.integerValue);
    if (v.doubleValue !== undefined) return v.doubleValue;
    if (v.booleanValue !== undefined) return v.booleanValue;
    if (v.nullValue !== undefined) return null;
    if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(extrair);
    if (v.mapValue !== undefined) return extrairCampos(v.mapValue.fields || {});
    return null;
}

function extrairCampos(fields) {
    const out = {};
    for (const [k, v] of Object.entries(fields)) out[k] = extrair(v);
    return out;
}

async function lerDoc(collection, id) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}?key=${API_KEY}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    return extrairCampos(d.fields || {});
}

async function lerVarios(collection, ids) {
    return Promise.all(ids.map((id) => lerDoc(collection, id).catch(() => null)));
}

function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function emojiPorExt(ext) {
    const map = { pdf: '📕', doc: '📘', docx: '📘', txt: '📄', ppt: '📙', pptx: '📙', xls: '📗', xlsx: '📗', csv: '📗', zip: '🗜️', rar: '🗜️', mp3: '🎵', mp4: '🎬' };
    return map[ext] || '📎';
}

function extArquivo(nome) {
    const m = String(nome || '').toLowerCase().match(/\.([a-z0-9]{1,6})$/);
    return m ? m[1] : '';
}

function htmlErro(msg) {
    return `<!DOCTYPE html><html lang="pt-br"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Não encontrado - Hub Brain</title>
<style>body{background:#0a0a0e;color:#fff;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;text-align:center;margin:0}.box{max-width:400px}.icon{font-size:64px;margin-bottom:20px}.txt{font-size:14px;color:#888;line-height:1.5;margin-top:10px}a.btn{display:inline-block;margin-top:22px;padding:13px 24px;background:#9333ea;color:#fff;text-decoration:none;border-radius:999px;font-weight:800;font-size:14px}</style>
</head><body><div class="box"><div class="icon">🔍</div><h1 style="font-size:20px;margin:0 0 6px">Não encontrei nada</h1><p class="txt">${esc(msg)}</p><a href="${SITE}" class="btn">Ir pro Hub Brain →</a></div></body></html>`;
}

function htmlPasta(pasta, conteudos) {
    const titulo = pasta.titulo || 'Conteúdos compartilhados';
    const autor = pasta.autor || 'Alguém';
    const validos = conteudos.filter(Boolean);
    const qtd = validos.length;
    const capa = pasta.capa || (validos[0] && (validos[0].thumb || validos[0].url)) || `${SITE}/icon-514_20260512_161420_0000.png`;
    const descricao = `${qtd} ${qtd === 1 ? 'conteúdo' : 'conteúdos'} · por ${autor}`;
    const logo = `${SITE}/icon-514_20260512_161420_0000.png`;

    const cards = validos.map((c) => {
        const isImg = c.tipo === 'imagem' || c.tipo !== 'arquivo';
        const src = c.thumb || c.medium || c.url || '';
        const url = c.url || src;
        const nome = c.nome || 'Conteúdo';

        if (isImg && src) {
            return `<div class="card">
                <a class="card-img" href="${esc(url)}" target="_blank" rel="noopener" onclick="salvarImg(event, '${esc(url)}', '${esc(nome)}.jpg')">
                    <img src="${esc(src)}" alt="" loading="lazy">
                </a>
                <div class="card-info">
                    <b title="${esc(nome)}">${esc(nome)}</b>
                    <div class="card-meta">
                        ${c.bimestre ? `<span class="tag">${c.bimestre}º BIM</span>` : ''}
                        <button class="mini-btn" onclick="salvarImg(event, '${esc(url)}', '${esc(nome)}.jpg')" title="Baixar">⬇</button>
                    </div>
                </div>
            </div>`;
        }
        const ext = extArquivo(nome);
        return `<a class="card card-arq" href="${esc(url)}" download="${esc(nome)}" target="_blank" rel="noopener">
            <span class="arq-ico">${emojiPorExt(ext)}</span>
            <div class="card-info">
                <b title="${esc(nome)}">${esc(nome)}</b>
                <span class="arq-ext">${esc(ext || 'arquivo')}</span>
            </div>
            <span class="arq-baixar">⬇</span>
        </a>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(titulo)} - Hub Brain</title>
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:image" content="${esc(capa)}">
<meta property="og:url" content="${SITE}/pasta/${esc(pasta.id || '')}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Hub Brain">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(descricao)}">
<meta name="twitter:image" content="${esc(capa)}">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{background:#0a0a0e;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;padding:0 0 40px;line-height:1.5;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background:radial-gradient(circle at 20% 5%,rgba(147,51,234,0.12) 0%,transparent 40%),radial-gradient(circle at 85% 95%,rgba(147,51,234,0.08) 0%,transparent 40%);pointer-events:none;z-index:0}

/* ═══ HEADER PÍLULA ═══ */
.header-pill {
    position: sticky;
    top: 12px;
    z-index: 100;
    margin: 12px 16px 0;
    padding: 6px;
    background: rgba(20, 20, 26, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 560px;
    margin-left: auto;
    margin-right: auto;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}

.header-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    justify-content: center;
}

.header-logo img {
    width: 26px;
    height: 26px;
    object-fit: contain;
    filter: drop-shadow(0 0 10px rgba(147,51,234,0.6));
}

.header-logo span {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #fff;
    text-transform: uppercase;
}

.header-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: transparent;
    color: #fff;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    padding: 0;
    font-family: inherit;
    text-decoration: none;
}

.header-btn:hover {
    background: rgba(147,51,234,0.15);
}

.header-btn.roxo {
    background: linear-gradient(135deg, #9333ea, #6a1fc2);
    box-shadow: 0 6px 18px rgba(147,51,234,0.4);
}

.header-btn.roxo:hover {
    background: linear-gradient(135deg, #a855f7, #7a2fd2);
}

.header-btn svg {
    width: 18px;
    height: 18px;
}

/* ═══ WRAP ═══ */
.wrap {
    max-width: 560px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
    padding: 24px 16px 0;
}

/* ═══ HERO ═══ */
.hero {
    margin-bottom: 24px;
}

.hero-label {
    display: inline-block;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 2px;
    color: #c084fc;
    text-transform: uppercase;
    background: rgba(147,51,234,0.12);
    padding: 5px 12px;
    border-radius: 999px;
    border: 1px solid rgba(147,51,234,0.3);
    margin-bottom: 12px;
}

.hero h1 {
    font-size: 24px;
    font-weight: 900;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
    line-height: 1.15;
}

.hero-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #6b7280;
    font-weight: 600;
}

.hero-meta b {
    color: #c084fc;
    font-weight: 800;
}

/* ═══ GRID ═══ */
.grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 24px;
}

@media (max-width: 420px) {
    .grid { grid-template-columns: 1fr 1fr; gap: 8px; }
}

.card {
    background: #131319;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px;
    overflow: hidden;
    transition: all 0.2s;
}

.card:hover {
    border-color: rgba(147,51,234,0.35);
}

.card-img {
    display: block;
    position: relative;
    background: #0a0a0e;
}

.card-img img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    display: block;
    pointer-events: none;
}

.card-info {
    padding: 8px 10px 10px;
}

.card-info b {
    display: block;
    font-size: 11.5px;
    font-weight: 800;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.3;
}

.card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-top: 6px;
}

.tag {
    display: inline-block;
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 0.8px;
    color: #c084fc;
    background: rgba(147,51,234,0.15);
    padding: 2px 7px;
    border-radius: 6px;
    text-transform: uppercase;
}

.mini-btn {
    background: rgba(147,51,234,0.15);
    border: 1px solid rgba(147,51,234,0.3);
    color: #c084fc;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.15s;
    padding: 0;
}

.mini-btn:active {
    transform: scale(0.9);
    background: rgba(147,51,234,0.3);
}

/* Card de arquivo */
.card-arq {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    text-decoration: none;
    color: inherit;
    grid-column: 1 / -1;
}

.arq-ico {
    font-size: 28px;
    flex-shrink: 0;
    line-height: 1;
}

.card-arq .card-info {
    flex: 1;
    padding: 0;
    min-width: 0;
}

.arq-ext {
    display: block;
    font-size: 9.5px;
    color: #6b7280;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-top: 2px;
}

.arq-baixar {
    color: #c084fc;
    font-size: 14px;
    opacity: 0.5;
    flex-shrink: 0;
}

.card-arq:hover .arq-baixar { opacity: 1; }

/* ═══ CTA FINAL ═══ */
.cta {
    text-align: center;
    padding: 24px 20px;
    background: #131319;
    border: 1px solid rgba(147,51,234,0.2);
    border-radius: 18px;
    margin-top: 24px;
}

.cta h2 {
    font-size: 16px;
    font-weight: 900;
    letter-spacing: -0.3px;
    margin-bottom: 6px;
}

.cta p {
    font-size: 12px;
    color: #888;
    margin-bottom: 16px;
    line-height: 1.5;
}

.cta a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 12px 22px;
    background: linear-gradient(135deg, #9333ea, #6a1fc2);
    color: #fff;
    text-decoration: none;
    border-radius: 999px;
    font-weight: 800;
    font-size: 13px;
    box-shadow: 0 8px 20px rgba(147,51,234,0.35);
}

.cta a:active { transform: scale(0.97); }

/* ═══ RODAPÉ ═══ */
.rodape {
    text-align: center;
    padding: 40px 20px 30px;
    border-top: 1px solid rgba(255,255,255,0.06);
    margin-top: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.rodape-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: 0.55;
}

.rodape-logo img {
    width: 26px;
    height: 26px;
    object-fit: contain;
}

.rodape-logo span {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #fff;
}

.rodape > p {
    font-size: 11.5px;
    color: #555;
    line-height: 1.6;
    max-width: 280px;
    margin: 0;
    font-weight: 500;
}

.rodape-links {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 11px;
    margin-top: 4px;
}

.rodape-links a {
    color: #555;
    text-decoration: none;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: color 0.2s;
}

.rodape-links a:hover { color: #c084fc; }

.rodape-links a svg {
    width: 12px;
    height: 12px;
}

.rodape-links span { color: #2a2a35; }

.rodape-creditos {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 2px;
    color: #4a4a55;
    margin-top: 4px;
}

/* ═══ TOAST ═══ */
.toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(80px);
    background: #131319;
    border: 1px solid #9333ea;
    color: #c084fc;
    padding: 10px 18px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    transition: transform 0.3s;
    z-index: 200;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    white-space: nowrap;
    max-width: 90vw;
    overflow: hidden;
    text-overflow: ellipsis;
}

.toast.on {
    transform: translateX(-50%) translateY(0);
}
</style>
</head>
<body>

<!-- Header pílula -->
<header class="header-pill">
    <a href="${SITE}" class="header-btn" aria-label="Início">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    </a>
    <div class="header-logo">
        <img src="${logo}" alt="Hub Brain">
        <span>Hub Brain</span>
    </div>
    <a href="${SITE}" class="header-btn roxo" aria-label="Abrir app">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
    </a>
</header>

<div class="wrap">
    <div class="hero">
        <div class="hero-label">📚 Conteúdos compartilhados</div>
        <h1>${esc(titulo)}</h1>
        <div class="hero-meta">
            <b>${qtd}</b> ${qtd === 1 ? 'conteúdo' : 'conteúdos'} · por <b>${esc(autor)}</b>
        </div>
    </div>

    <div class="grid">${cards}</div>

    <div class="cta">
        <h2>Quer organizar seus estudos?</h2>
        <p>O Hub Brain junta agenda, notas, foco e IA num app só. Grátis, sem anúncio.</p>
        <a href="${SITE}">Conhecer o Hub Brain →</a>
    </div>

    <div class="rodape">
        <div class="rodape-logo">
            <img src="${logo}" alt="Hub Brain">
            <span>HUB BRAIN</span>
        </div>
        <p>Seus conteúdos por matéria e bimestre.<br>Foto, PDF e arquivo num lugar só.</p>
        <div class="rodape-links">
            <a href="${SITE}/termos.html">Termos</a>
            <span>·</span>
            <a href="${SITE}/privacidade.html">Privacidade</a>
            <span>·</span>
            <a href="https://instagram.com/hubbrain.app" target="_blank" rel="noopener">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
                @hubbrain.app
            </a>
        </div>
        <span class="rodape-creditos">DITOH · 2026</span>
    </div>
</div>

<div class="toast" id="toast"></div>

<script>
function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('on'), 2200);
}

async function salvarImg(e, url, nome) {
    e.preventDefault();
    e.stopPropagation();
    try {
        toast('Preparando...');
        const r = await fetch(url, { mode: 'cors' });
        if (!r.ok) throw new Error('fetch');
        const blob = await r.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = nome;
        a.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        toast('✓ Salvo em Downloads');
    } catch (err) {
        console.warn('download falhou, abrindo imagem:', err);
        window.open(url, '_blank');
        toast('💡 Segura na imagem e toca em "Baixar imagem"');
    }
}
</script>
</body>
</html>`;
}

export default async (req) => {
    const url = new URL(req.url);
    const path = url.pathname;

    let idPasta = url.searchParams.get('id');
    let idConteudo = url.searchParams.get('conteudo');

    const matchPasta = path.match(/\/pasta\/([^/?#]+)/);
    const matchConteudo = path.match(/\/conteudo\/([^/?#]+)/);

    if (!idPasta && matchPasta) idPasta = matchPasta[1];
    if (!idConteudo && matchConteudo) idConteudo = matchConteudo[1];

    try {
        if (idConteudo) {
            const c = await lerDoc('conteudos', idConteudo);
            if (!c) return new Response(htmlErro('Esse conteúdo não existe mais.'), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            const pastaFake = { titulo: c.materia || 'Conteúdo', autor: 'Compartilhado', capa: c.thumb || c.url, id: idConteudo };
            return new Response(htmlPasta(pastaFake, [c]), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
        }

        if (!idPasta) {
            return new Response(htmlErro('Link inválido.'), { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        const pasta = await lerDoc('pastas', idPasta);
        if (!pasta) {
            return new Response(htmlErro('Essa pasta não existe mais ou o link expirou.'), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        const ids = Array.isArray(pasta.conteudosIds) ? pasta.conteudosIds : [];
        const conteudos = await lerVarios('conteudos', ids);

        return new Response(htmlPasta(pasta, conteudos), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
    } catch (e) {
        console.error('[pasta] ERRO:', e);
        return new Response(htmlErro('Deu ruim aqui.'), { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
};
