/**
 * Netlify Function — página pública de pasta/conteúdo compartilhado.
 * Renderiza HTML com Open Graph pra preview no WhatsApp.
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
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Não encontrado - Hub Brain</title>
<style>body{background:#0a0a0e;color:#fff;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;text-align:center;margin:0}.box{max-width:400px}.icon{font-size:80px;margin-bottom:24px}.txt{font-size:16px;color:#888;line-height:1.5;margin-top:12px}a.btn{display:inline-block;margin-top:24px;padding:14px 28px;background:#9333ea;color:#fff;text-decoration:none;border-radius:12px;font-weight:800}</style>
</head><body><div class="box"><div class="icon">🔍</div><h1 style="font-size:22px;margin:0 0 8px">Não encontrei nada</h1><p class="txt">${esc(msg)}</p><a href="${SITE}" class="btn">Ir pro Hub Brain →</a></div></body></html>`;
}

function htmlPasta(pasta, conteudos) {
    const titulo = pasta.titulo || 'Conteúdos compartilhados';
    const autor = pasta.autor || 'Alguém';
    const qtd = conteudos.filter(Boolean).length;
    const capa = pasta.capa || (conteudos[0] && (conteudos[0].thumb || conteudos[0].url)) || `${SITE}/icon-514_20260512_161420_0000.png`;
    const descricao = `${qtd} ${qtd === 1 ? 'conteúdo' : 'conteúdos'} · por ${autor}`;

    const cards = conteudos.filter(Boolean).map((c) => {
        const isImg = c.tipo === 'imagem' || c.tipo !== 'arquivo';
        const src = c.thumb || c.medium || c.url || '';
        const nome = c.nome || 'Conteúdo';

        if (isImg && src) {
            return `<a class="card" href="${esc(c.url || src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="" loading="lazy"><div class="card-info"><b>${esc(nome)}</b>${c.bimestre ? `<small>${c.bimestre}º BIM</small>` : ''}</div></a>`;
        }
        const ext = extArquivo(nome);
        return `<a class="card card-arq" href="${esc(c.url || '#')}" target="_blank" rel="noopener"><span class="arq-ico">${emojiPorExt(ext)}</span><div class="card-info"><b>${esc(nome)}</b><small>${esc(ext || 'arquivo')}</small></div></a>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
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
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0e;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;padding:20px 16px 60px;line-height:1.5}
body::before{content:'';position:fixed;inset:0;background:radial-gradient(circle at 20% 10%,rgba(147,51,234,0.14) 0%,transparent 45%),radial-gradient(circle at 85% 90%,rgba(147,51,234,0.1) 0%,transparent 45%);pointer-events:none;z-index:0}
.wrap{max-width:640px;margin:0 auto;position:relative;z-index:1}
.topo{display:flex;align-items:center;gap:10px;padding:14px 0 30px;font-weight:900;letter-spacing:1px;font-size:15px}
.topo-dot{width:8px;height:8px;border-radius:50%;background:#9333ea;box-shadow:0 0 10px #9333ea}
.hero{text-align:center;margin-bottom:36px}
.hero-label{display:inline-block;font-size:10px;font-weight:800;letter-spacing:2.5px;color:#c084fc;text-transform:uppercase;background:rgba(147,51,234,0.15);padding:7px 16px;border-radius:999px;border:1px solid rgba(147,51,234,0.35);margin-bottom:18px}
.hero h1{font-size:32px;font-weight:900;letter-spacing:-0.8px;margin-bottom:10px;line-height:1.1}
.hero p{font-size:14px;color:#888;font-weight:500}
.hero p b{color:#c084fc;font-weight:800}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:30px}
@media (max-width:420px){.grid{grid-template-columns:1fr}}
.card{display:flex;flex-direction:column;background:#131319;border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;transition:all 0.2s}
.card:hover{border-color:rgba(147,51,234,0.4);transform:translateY(-2px)}
.card img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#0a0a0e}
.card-info{padding:10px 12px}
.card-info b{display:block;font-size:12.5px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff}
.card-info small{display:block;font-size:10px;color:#6b7280;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-top:3px}
.card-arq{flex-direction:row;align-items:center;gap:14px;padding:16px}
.card-arq .arq-ico{font-size:34px;flex-shrink:0}
.card-arq .card-info{flex:1;padding:0}
.cta{text-align:center;padding:32px 20px;background:#131319;border:1px solid rgba(147,51,234,0.25);border-radius:20px;margin-top:20px}
.cta h2{font-size:20px;font-weight:900;letter-spacing:-0.3px;margin-bottom:8px}
.cta p{font-size:13px;color:#9ca3af;margin-bottom:20px;line-height:1.5}
.cta a{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 26px;background:#9333ea;color:#fff;text-decoration:none;border-radius:999px;font-weight:800;font-size:14px;letter-spacing:0.3px;box-shadow:0 10px 26px rgba(147,51,234,0.35);transition:all 0.2s}
.cta a:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(147,51,234,0.5)}
.rodape{text-align:center;padding:30px 0 10px;font-size:11px;color:#4a4a55;font-weight:600;letter-spacing:1.5px;text-transform:uppercase}
</style>
</head>
<body>
<div class="wrap">
    <div class="topo"><span class="topo-dot"></span> HUB BRAIN</div>
    <div class="hero">
        <div class="hero-label">📚 Conteúdos compartilhados</div>
        <h1>${esc(titulo)}</h1>
        <p>${esc(descricao)}</p>
    </div>
    <div class="grid">${cards}</div>
    <div class="cta">
        <h2>Quer organizar seus estudos?</h2>
        <p>O Hub Brain junta agenda, notas, foco e IA num app só.<br>Grátis, sem anúncio.</p>
        <a href="${SITE}">Conhecer o Hub Brain →</a>
    </div>
    <div class="rodape">Hub Brain · Feito por DITOH</div>
</div>
</body>
</html>`;
}

export default async (req) => {
    const url = new URL(req.url);
    const idPasta = url.searchParams.get('id');
    const idConteudo = url.searchParams.get('conteudo');

    try {
        if (idConteudo) {
            const c = await lerDoc('conteudos', idConteudo);
            if (!c) return new Response(htmlErro('Esse conteúdo não existe mais.'), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            const pastaFake = { titulo: c.materia || 'Conteúdo', autor: 'Compartilhado', capa: c.thumb || c.url, id: idConteudo };
            return new Response(htmlPasta(pastaFake, [c]), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
        }

        if (!idPasta) return new Response(htmlErro('Link inválido.'), { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

        const pasta = await lerDoc('pastas', idPasta);
        if (!pasta) return new Response(htmlErro('Essa pasta não existe mais ou o link expirou.'), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

        const ids = Array.isArray(pasta.conteudosIds) ? pasta.conteudosIds : [];
        const conteudos = await lerVarios('conteudos', ids);

        return new Response(htmlPasta(pasta, conteudos), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
    } catch (e) {
        console.error('[pasta]', e);
        return new Response(htmlErro('Deu ruim aqui. Tenta de novo.'), { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
};
