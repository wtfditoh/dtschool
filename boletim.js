/* boletim.js — Hub Brain · Modo Boletim (view dentro do notas.html)
   Regras de cálculo: boletim-core.js · Dados: ponte window.HBNotas (notas-logica.js) · Config: localStorage.dt_config */
import * as B from './boletim-core.js';

const { esc, fmt } = B;
const $ = (id) => document.getElementById(id);
const LOGO = 'icon-514_20260512_161420_0000.png';
const E = { aberto: false, aba: 'final' };

/* ═══════════════ DADOS ═══════════════ */

function lerJSON(k, p) { try { return JSON.parse(localStorage.getItem(k)) ?? p; } catch (e) { return p; } }
const lerMaterias = () => (window.HBNotas && window.HBNotas.getMaterias()) || (Array.isArray(lerJSON('materias', [])) ? lerJSON('materias', []) : []);
function lerCfg() {
    const c = window.HBNotas && window.HBNotas.getCfg && window.HBNotas.getCfg();
    return c || { numPeriodos: 4, notaMax: 10, media: 6, labels: ['1º BIM', '2º BIM', '3º BIM', '4º BIM'] };
}
const lerPerfil = () => B.perfilBoletim(lerJSON('dt_config', {}), {}, localStorage.getItem('dt_user_name'));

/* ═══════════════ TEMA (claro/escuro) ═══════════════ */

const temaAtual = () => (localStorage.getItem('hb_tema') === 'claro' ? 'claro' : 'escuro');
function aplicarTema() {
    const claro = temaAtual() === 'claro';
    document.body.classList.toggle('tema-claro', claro);
    const btn = $('btn-tema');
    if (btn) { btn.innerHTML = '<i data-lucide="' + (claro ? 'sun' : 'moon') + '"></i>'; btn.title = claro ? 'Modo escuro' : 'Modo claro'; }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', claro ? '#f0f0f5' : '#8a2be2');
    if (window.lucide) window.lucide.createIcons();
}
function alternarTema() {
    localStorage.setItem('hb_tema', temaAtual() === 'claro' ? 'escuro' : 'claro');
    aplicarTema();
    if (E.aberto) render(false);
}

/* Cores usadas nos desenhos em canvas (o canvas não enxerga variáveis CSS). */
const PAL = {
    escuro: { tx: '#ffffff', dim: '#8a8a96', linha: 'rgba(255,255,255,0.09)', trilho: 'rgba(255,255,255,0.08)', acc: '#8a2be2', acc2: '#c084fc', ok: '#00e5a0', warn: '#ffbb33', bad: '#ff4455', bg: '#0b0b10' },
    claro: { tx: '#1a1a1c', dim: '#7b7b86', linha: 'rgba(0,0,0,0.09)', trilho: 'rgba(0,0,0,0.07)', acc: '#8a2be2', acc2: '#8a2be2', ok: '#00a870', warn: '#d98f00', bad: '#e0243a', bg: '#ffffff' }
};
const corNivel = (nv, pal) => (nv === 'boa' ? pal.ok : nv === 'media' ? pal.warn : nv === 'baixa' ? pal.bad : pal.dim);

/* ═══════════════ MONTAGEM DOS DADOS DA FOLHA ═══════════════ */

function montarContexto(aba) {
    const cfg = lerCfg(), materias = lerMaterias();
    const linhas = B.montarLinhas(materias, cfg, aba);
    return {
        cfg, aba, perfil: lerPerfil(), linhas,
        res: B.resumo(linhas, cfg, aba),
        ev: B.evolucao(materias, cfg),
        dest: aba === 'final' ? B.destaques(linhas, cfg) : { melhor: null, atencao: null }
    };
}

/* ═══════════════ HTML DA FOLHA (o mesmo para a tela e para a imagem compartilhada) ═══════════════ */

function htmlLinha(l, i, ctx, share) {
    const { cfg, aba } = ctx;
    const pct = l.media === null ? 0 : Math.max(0, Math.min(100, (l.media / cfg.notaMax) * 100));
    const disc = '<div class="bol-disc"><span class="bol-nome" title="' + esc(l.nome) + '">' + esc(l.nome) + '</span><i class="bol-barra"><b class="' + l.nivel + '" data-w="' + pct.toFixed(0) + '"></b></i></div>';
    const sit = '<div class="bol-sit"><span class="bol-badge ' + l.sit.cls + '">' + esc(l.sit.txt) + '</span></div>';
    const estilo = ' style="--i:' + i + ';--cor:' + corNivel(l.nivel, PAL.escuro) + '"';
    if (aba !== 'final') {
        return '<div class="bol-row simples"' + estilo + '>' + disc +
            '<div class="bol-media ' + l.nivel + '"><small>NOTA</small><span>' + fmt(l.media) + '</span></div>' + sit + '</div>';
    }
    const notas = l.notas.map((n, k) => '<div class="bol-n ' + B.nivel(n, cfg) + '"><small>' + esc(cfg.labels[k]) + '</small><span>' + fmt(n) + '</span></div>').join('');
    return '<div class="bol-row"' + estilo + '>' + disc + '<div class="bol-notas">' + notas + '</div>' +
        '<div class="bol-media ' + l.nivel + '"><small>MÉDIA</small><span>' + fmt(l.media) + '</span></div>' + sit +
        (l.sit.dica && !share ? '<div class="bol-dica">' + esc(l.sit.dica) + '</div>' : '') + '</div>';
}

function campoPerfil(rotulo, valor, share) {
    const vazio = !valor;
    return '<div class="bol-campo"><span class="boletim-label">' + rotulo + '</span>' +
        (vazio ? (share ? '<strong>—</strong>' : '<a class="bol-preencher" href="configuracoes.html">Preencher</a>') : '<strong>' + esc(valor) + '</strong>') + '</div>';
}

function htmlPapel(ctx, share) {
    const { cfg, aba, perfil, linhas, res, ev, dest } = ctx;
    const label = aba === 'final' ? null : cfg.labels[aba - 1];
    let h = '<img class="boletim-marca" src="' + LOGO + '" alt=""><div class="boletim-moldura"></div><div class="boletim-conteudo">';

    h += '<header class="bol-cab"><img class="bol-logo" src="' + LOGO + '" alt="Hub Brain"><h1 class="boletim-titulo">BOLETIM ESCOLAR</h1>' +
        '<div class="bol-sub"><span class="bol-chip-ano">ANO LETIVO ' + esc(perfil.ano) + '</span>' + (label ? '<span class="bol-chip-per">' + esc(label) + '</span>' : '') + '</div><div class="boletim-linha-dupla"></div></header>';

    h += '<section class="bol-aluno"><div class="bol-avatar">' + esc(B.iniciais(perfil.nome)) + '</div><div class="bol-aluno-txt"><span class="boletim-label">ALUNO</span><strong class="bol-nome-aluno">' + esc(perfil.nome.toUpperCase()) + '</strong></div></section>' +
        '<section class="bol-dados">' + campoPerfil('ESCOLA', perfil.escola, share) + campoPerfil('SÉRIE / TURMA', perfil.serieTurma, share) +
        '<div class="bol-campo"><span class="boletim-label">DATA</span><strong>' + esc(perfil.data) + '</strong></div></section>';

    // lista
    h += '<section class="bol-lista" style="--np:' + cfg.numPeriodos + '">';
    if (!linhas.length) {
        h += '<div class="bol-vazio-lista">Nenhuma disciplina cadastrada ainda.' + (share ? '' : '<button type="button" data-bol="add">+ Adicionar disciplina</button>') + '</div>';
    } else {
        if (aba === 'final') {
            h += '<div class="bol-head"><span>DISCIPLINA</span><span class="bol-head-n">' + cfg.labels.map((l) => '<i>' + esc(l) + '</i>').join('') + '</span><span>MÉDIA</span><span>SITUAÇÃO</span></div>';
        }
        h += linhas.map((l, i) => htmlLinha(l, i, ctx, share)).join('');
    }
    h += '</section>';

    // resumo (anel + números)
    if (linhas.length) {
        const stats = aba === 'final'
            ? [[res.aprovadas + '/' + res.total, 'APROVADAS'], [String(res.emCurso), 'EM CURSO'], [String(res.recuperacao + res.reprovadas), 'EM ATENÇÃO']]
            : [[res.acima + '/' + res.total, 'ACIMA DA MÉDIA'], [String(res.comNota - res.acima), 'ABAIXO DA MÉDIA'], [String(res.total - res.comNota), 'SEM NOTA']];
        h += '<section class="bol-resumo"><div class="bol-anel"><canvas data-cv="anel"></canvas><div class="bol-anel-num ' + res.nivel + '"><b>' + fmt(res.mediaGeral) + '</b><small>' + (aba === 'final' ? 'MÉDIA GERAL' : 'MÉDIA DO PERÍODO') + '</small></div></div>' +
            '<div class="bol-stats">' + stats.map((s) => '<div class="bol-stat"><b>' + s[0] + '</b><small>' + s[1] + '</small></div>').join('') + '</div></section>';

        // gráfico de evolução
        const temEv = ev.some((e) => e.media !== null);
        h += '<section class="bol-grafico"><h4>EVOLUÇÃO DA MÉDIA GERAL</h4>' + (temEv ? '<canvas data-cv="grafico"></canvas>' : '<div class="bol-grafico-vazio">O gráfico aparece quando houver notas lançadas.</div>') + '</section>';

        // destaques
        if (dest.melhor || dest.atencao) {
            h += '<section class="bol-destaques">' +
                (dest.melhor ? '<div class="bol-dest boa"><span>🏆</span><div><small>MELHOR DISCIPLINA</small><b>' + esc(dest.melhor.nome) + ' · ' + fmt(dest.melhor.media) + '</b></div></div>' : '') +
                (dest.atencao ? '<div class="bol-dest baixa"><span>⚠️</span><div><small>PEDE ATENÇÃO</small><b>' + esc(dest.atencao.nome) + ' · ' + fmt(dest.atencao.media) + '</b></div></div>' : '') + '</section>';
        }
    }

    // assinatura + carimbo
    h += '<footer class="bol-ass"><div class="bol-ass-esq"><div class="boletim-assinatura-nome">Ditoh</div><div class="boletim-linha-ass"></div><span class="boletim-assinatura-cargo">Coordenação <b>Hub Brain</b></span></div>' +
        (res.selo ? '<div class="bol-carimbo ' + res.selo.cls + '"><b>' + esc(res.selo.txt) + '</b><small>' + esc(res.selo.sub) + '</small></div>' : '') + '</footer>' +
        '<div class="bol-marca-rodape"><b>HUB BRAIN</b><span>hubbrain.netlify.app</span></div></div>';
    return h;
}

/* ═══════════════ CANVAS: anel de média e gráfico de evolução ═══════════════ */

function prepararCanvas(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return null;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, w, h };
}

function desenharAnel(cv, ctx, pal, prog) {
    const p = prepararCanvas(cv); if (!p) return;
    const { c, w, h } = p, cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 9;
    c.lineWidth = 9; c.lineCap = 'round';
    c.strokeStyle = pal.trilho; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    const v = ctx.res.mediaGeral;
    if (v === null) return;
    const frac = Math.max(0.015, Math.min(1, v / ctx.cfg.notaMax)) * prog;
    const g = c.createLinearGradient(0, 0, w, h);
    const cor = corNivel(ctx.res.nivel, pal);
    g.addColorStop(0, cor); g.addColorStop(1, ctx.res.nivel === 'boa' ? pal.acc2 : cor);
    c.strokeStyle = g;
    c.shadowColor = cor; c.shadowBlur = pal === PAL.escuro ? 10 : 0;
    c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); c.stroke();
}

function desenharGrafico(cv, ctx, pal, prog) {
    const p = prepararCanvas(cv); if (!p) return;
    const { c, w, h } = p, cfg = ctx.cfg, pts = ctx.ev, np = pts.length;
    const L = 30, R = 14, T = 20, Bt = 26, iw = w - L - R, ih = h - T - Bt, max = cfg.notaMax;
    const X = (i) => (np === 1 ? L + iw / 2 : L + (iw * i) / (np - 1));
    const Y = (v) => T + ih - (Math.max(0, Math.min(max, v)) / max) * ih;
    c.font = '700 9px Outfit, sans-serif'; c.textBaseline = 'middle';

    // grade + eixo Y
    [0, max / 2, max].forEach((v) => {
        c.strokeStyle = pal.linha; c.lineWidth = 1; c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(w - R, Y(v)); c.stroke();
        c.fillStyle = pal.dim; c.textAlign = 'right'; c.fillText(String(Math.round(v)), L - 7, Y(v));
    });
    // linha da média mínima
    c.save(); c.setLineDash([5, 4]); c.strokeStyle = pal.acc2; c.lineWidth = 1.4; c.globalAlpha = 0.9;
    c.beginPath(); c.moveTo(L, Y(cfg.media)); c.lineTo(w - R, Y(cfg.media)); c.stroke(); c.restore();
    c.fillStyle = pal.acc2; c.textAlign = 'right'; c.font = '800 8px Outfit, sans-serif';
    c.fillText('MÉDIA ' + fmt(cfg.media), w - R, Y(cfg.media) - 7);
    c.font = '700 9px Outfit, sans-serif';

    // rótulos do eixo X
    pts.forEach((e, i) => {
        const dest = ctx.aba === i + 1;
        c.fillStyle = dest ? pal.tx : pal.dim; c.font = (dest ? '900 ' : '700 ') + '9px Outfit, sans-serif';
        c.textAlign = np === 1 ? 'center' : i === 0 ? 'left' : i === np - 1 ? 'right' : 'center';
        c.fillText(e.label, i === 0 && np > 1 ? Math.max(2, X(i) - 12) : i === np - 1 && np > 1 ? Math.min(w - 2, X(i) + 12) : X(i), h - 9);
    });

    const valid = pts.map((e, i) => ({ i, v: e.media })).filter((q) => q.v !== null);
    if (!valid.length) return;

    c.save();
    c.beginPath(); c.rect(0, 0, L + (iw + R + 6) * prog, h); c.clip();      // revela da esquerda para a direita
    if (valid.length > 1) {
        const area = c.createLinearGradient(0, T, 0, T + ih);
        area.addColorStop(0, 'rgba(138,43,226,0.30)'); area.addColorStop(1, 'rgba(138,43,226,0)');
        c.beginPath(); c.moveTo(X(valid[0].i), Y(valid[0].v));
        valid.forEach((q) => c.lineTo(X(q.i), Y(q.v)));
        c.lineTo(X(valid[valid.length - 1].i), T + ih); c.lineTo(X(valid[0].i), T + ih); c.closePath();
        c.fillStyle = area; c.fill();
        c.beginPath(); valid.forEach((q, k) => (k ? c.lineTo(X(q.i), Y(q.v)) : c.moveTo(X(q.i), Y(q.v))));
        c.strokeStyle = pal.acc2; c.lineWidth = 3; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
    }
    valid.forEach((q) => {
        const x = X(q.i), y = Y(q.v), cor = corNivel(B.nivel(q.v, cfg), pal), dest = ctx.aba === q.i + 1;
        if (dest) { c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 2); c.fillStyle = cor + '33'; c.fill(); }
        c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fillStyle = pal.bg; c.fill();
        c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fillStyle = cor; c.fill();
        c.font = '900 11px Outfit, sans-serif'; c.fillStyle = pal.tx; c.textAlign = 'center';
        c.fillText(fmt(q.v), Math.min(w - 14, Math.max(14, x)), y < T + 14 ? y + 16 : y - 13);
    });
    c.restore();
}

const semMovimento = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Desenha anel + gráfico dentro de `raiz`. animar=false → quadro final direto (usado na imagem compartilhada). */
function desenhar(raiz, ctx, animar) {
    const pal = (raiz.classList.contains('claro') || document.body.classList.contains('tema-claro')) ? PAL.claro : PAL.escuro;
    const cvA = raiz.querySelector('canvas[data-cv="anel"]'), cvG = raiz.querySelector('canvas[data-cv="grafico"]');
    const quadro = (prog) => { if (cvA) desenharAnel(cvA, ctx, pal, prog); if (cvG) desenharGrafico(cvG, ctx, pal, prog); };
    raiz.querySelectorAll('.bol-barra b').forEach((b) => { b.style.width = b.dataset.w + '%'; });
    if (!animar || semMovimento()) { quadro(1); return; }
    const t0 = performance.now(), dur = 800;
    const passo = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        quadro(e);
        if (k < 1 && raiz.isConnected) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
}

/* ═══════════════ RENDER NA TELA ═══════════════ */

function renderTabs(cfg) {
    const tabs = $('bol-tabs'); if (!tabs) return;
    const itens = cfg.labels.slice(0, cfg.numPeriodos).map((l, i) => [String(i + 1), l]).concat([['final', 'MÉDIA FINAL']]);
    tabs.innerHTML = itens.map(([k, l]) => '<button type="button" role="tab" class="bol-tab' + (String(E.aba) === k ? ' on' : '') + '" data-aba="' + k + '" aria-selected="' + (String(E.aba) === k) + '">' + esc(l) + '</button>').join('');
    const on = tabs.querySelector('.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function render(animar) {
    const papel = $('boletim-papel'); if (!papel) return;
    const cfg = lerCfg();
    if (E.aba !== 'final' && (Number(E.aba) < 1 || Number(E.aba) > cfg.numPeriodos)) E.aba = 'final';   // config mudou (ex.: bimestral → trimestral)
    const ctx = montarContexto(E.aba === 'final' ? 'final' : Number(E.aba));
    papel.innerHTML = htmlPapel(ctx, false);
    renderTabs(cfg);
    desenhar(papel, ctx, animar !== false);
    E._ctx = ctx;
}

function trocarAba(k) {
    E.aba = k === 'final' ? 'final' : Number(k);
    const papel = $('boletim-papel');
    if (papel) { papel.classList.remove('troca'); void papel.offsetWidth; papel.classList.add('troca'); }
    render(true);
}

/* ═══════════════ MODO EDIÇÃO ⇄ BOLETIM ═══════════════ */

function alternarModo(forcar) {
    E.aberto = typeof forcar === 'boolean' ? forcar : !E.aberto;
    localStorage.setItem('hb_notas_modo', E.aberto ? 'boletim' : 'edicao');
    const ed = $('modo-edicao'), bo = $('modo-boletim'), btn = $('btn-boletim'), add = document.querySelector('.btn-add');
    if (ed) ed.style.display = E.aberto ? 'none' : '';
    if (bo) bo.style.display = E.aberto ? 'block' : 'none';
    if (btn) { btn.classList.toggle('ativo', E.aberto); btn.innerHTML = '<i data-lucide="' + (E.aberto ? 'pencil' : 'clipboard-list') + '"></i>'; btn.title = E.aberto ? 'Voltar às notas' : 'Ver boletim'; }
    if (add) add.style.display = E.aberto ? 'none' : '';
    if (E.aberto) { render(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (window.lucide) window.lucide.createIcons();
}

/* ═══════════════ COMPARTILHAR: imagem 1080×1920 (story) com pré-visualização ═══════════════ */

function aviso(msg) {
    if (window.HBNotas && window.HBNotas.toast) window.HBNotas.toast(msg); else alert(msg);
}

function carregarHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        s.onload = () => (window.html2canvas ? res(window.html2canvas) : rej(new Error('html2canvas indisponível')));
        s.onerror = () => rej(new Error('Sem internet para carregar o gerador de imagem'));
        document.head.appendChild(s);
    });
}

/** Cria a folha numa área fora da tela, com 450×800 (×2,4 = 1080×1920). Se o conteúdo for maior, a imagem cresce. */
function montarStage(visivel) {
    const ctx = montarContexto(E.aba === 'final' ? 'final' : Number(E.aba));
    const claro = document.body.classList.contains('tema-claro');
    const stage = document.createElement('div');
    stage.className = 'bol-stage' + (visivel ? ' visivel' : '');
    stage.innerHTML = '<div class="boletim-papel share' + (claro ? ' claro' : '') + '">' + htmlPapel(ctx, true) + '</div>';
    document.body.appendChild(stage);
    const papel = stage.firstElementChild;
    desenhar(papel, ctx, false);
    return { stage, papel, ctx };
}

async function prontoParaCapturar(papel) {
    if (document.fonts) {
        try { await Promise.all([document.fonts.load('900 20px Outfit'), document.fonts.load('700 12px Outfit'), document.fonts.load('80px "Mrs Saint Delafield"')]); await document.fonts.ready; } catch (e) {}
    }
    await Promise.all([...papel.querySelectorAll('img')].map((im) => (im.complete ? 1 : new Promise((r) => { im.onload = im.onerror = r; }))));
    await new Promise((r) => setTimeout(r, 120));
}

const paraBlob = (canvas) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Falha ao gerar a imagem'))), 'image/png'));

function baixar(blob) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'Boletim_HubBrain.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function enviar(blob, texto) {
    const file = new File([blob], 'Boletim_HubBrain.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Meu Boletim', text: texto }); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }                   // outro erro: cai no download
    }
    baixar(blob);
}

function mostrarPreview(blob, ctx) {
    let ov = $('bol-prev');
    if (ov) ov.remove();
    const url = URL.createObjectURL(blob);
    const texto = '📚 Meu boletim no Hub Brain\nMédia ' + fmt(ctx.res.mediaGeral) + ' · Aprovadas ' + ctx.res.aprovadas + '/' + ctx.res.total + '\n\nhttps://hubbrain.netlify.app';
    ov = document.createElement('div');
    ov.id = 'bol-prev'; ov.className = 'bol-prev';
    ov.innerHTML = '<div class="bol-prev-box" role="dialog" aria-modal="true"><div class="bol-prev-topo"><b>Pré-visualização</b><button type="button" data-p="fechar" aria-label="Fechar">✕</button></div>' +
        '<div class="bol-prev-img"><img alt="Boletim para compartilhar" src="' + url + '"></div>' +
        '<div class="bol-prev-acoes"><button type="button" class="sec" data-p="baixar">⬇ Baixar</button><button type="button" class="pri" data-p="enviar">📤 Compartilhar</button></div></div>';
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('on'));
    const fechar = () => { ov.classList.remove('on'); setTimeout(() => { ov.remove(); URL.revokeObjectURL(url); }, 250); };
    ov.addEventListener('click', (e) => {
        if (e.target === ov) return fechar();
        const b = e.target.closest('[data-p]'); if (!b) return;
        if (b.dataset.p === 'fechar') fechar();
        else if (b.dataset.p === 'baixar') baixar(blob);
        else if (b.dataset.p === 'enviar') enviar(blob, texto);
    });
}

async function compartilhar() {
    const btn = $('btn-share-boletim'), rotulo = btn && btn.querySelector('span');
    if (btn) btn.disabled = true;
    if (rotulo) rotulo.textContent = 'GERANDO IMAGEM…';
    let montado = null;
    try {
        montado = montarStage(false);
        await prontoParaCapturar(montado.papel);
        const h2c = await carregarHtml2Canvas();
        const alvo = montado.papel;
        alvo.style.minHeight = '800px';
        const canvas = await h2c(alvo, { scale: 2.4, backgroundColor: null, useCORS: true, logging: false });
        mostrarPreview(await paraBlob(canvas), montado.ctx);
    } catch (e) {
        console.error('[boletim] compartilhar:', e);
        aviso('Não consegui gerar a imagem: ' + (e && e.message ? e.message : 'erro'));
    } finally {
        if (montado) montado.stage.remove();
        if (btn) btn.disabled = false;
        if (rotulo) rotulo.textContent = 'COMPARTILHAR BOLETIM';
    }
}

/* ═══════════════ INICIALIZAÇÃO ═══════════════ */

function ligarAtualizacao() {
    // quando as notas chegam do Firebase (ou mudam), o boletim aberto se atualiza sozinho
    const f = window.atualizarLista;
    if (typeof f !== 'function' || f.__bol) return typeof f === 'function';
    const w = function () { const r = f.apply(this, arguments); if (E.aberto) { try { render(false); } catch (e) { console.error('[boletim]', e); } } return r; };
    w.__bol = true; if (f.__esq) w.__esq = true;
    window.atualizarLista = w;
    return true;
}

function iniciar() {
    aplicarTema();
    const tentar = (n) => { if (!ligarAtualizacao() && n < 40) setTimeout(() => tentar(n + 1), 100); };
    tentar(0);

    $('btn-boletim')?.addEventListener('click', () => alternarModo());
    $('btn-tema')?.addEventListener('click', alternarTema);
    $('btn-share-boletim')?.addEventListener('click', compartilhar);
    $('btn-print-boletim')?.addEventListener('click', () => window.print());
    $('bol-tabs')?.addEventListener('click', (e) => { const t = e.target.closest('[data-aba]'); if (t) trocarAba(t.dataset.aba); });
    $('boletim-papel')?.addEventListener('click', (e) => {
        if (e.target.closest('[data-bol="add"]')) { alternarModo(false); if (window.abrirModal) window.abrirModal(); }
    });

    // redesenha os canvas se a largura mudar (girar o celular, redimensionar)
    let t = null;
    if (window.ResizeObserver && $('boletim-papel')) new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (E.aberto && E._ctx) desenhar($('boletim-papel'), E._ctx, false); }, 120); }).observe($('boletim-papel'));

    window.addEventListener('beforeprint', () => document.body.classList.add('bol-imprimindo'));
    window.addEventListener('afterprint', () => document.body.classList.remove('bol-imprimindo'));

    // reabre no boletim se foi assim que o aluno saiu (espera a ponte HBNotas existir)
    if (localStorage.getItem('hb_notas_modo') === 'boletim') {
        const abrir = (n) => { if (window.HBNotas) alternarModo(true); else if (n < 40) setTimeout(() => abrir(n + 1), 100); };
        abrir(0);
    }
    if (window.lucide) window.lucide.createIcons();
}

window.HBBoletim = { render, montarStage, trocarAba, alternarModo, aplicarTema };   // também usado nos testes

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
