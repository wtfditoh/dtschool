/* ═══════════════════════════════════════════════════════════
   BRASIL EM NÚMEROS
   Lê dados/educacao-brasil.json e monta as 3 views
   (nacional, regiões, estados)
   ═══════════════════════════════════════════════════════════ */

let dados = null;
let nivelAtual = 'brasil';

/* ═══════════ HELPERS ═══════════ */
function fmt(n) {
    if (n === null || n === undefined) return '—';
    return Number(n).toLocaleString('pt-BR');
}

function fmtCompacto(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + ' mi';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + ' mil';
    return String(n);
}

function fmtPct(parte, total) {
    if (!parte || !total) return null;
    return ((parte / total) * 100).toFixed(1) + '%';
}

/* ═══════════ CARREGAR JSON ═══════════ */
async function carregarDados() {
    try {
        const r = await fetch('dados/educacao-brasil.json');
        if (!r.ok) throw new Error('HTTP ' + r.status);
        dados = await r.json();
        renderizar();
    } catch (e) {
        console.error('[numeros] erro:', e);
        renderizarErro();
    }
}

function renderizarErro() {
    const msg = `
        <div class="estado-erro">
            <i data-lucide="alert-circle"></i>
            <p>Não consegui carregar os dados.<br>Verifica se <b>dados/educacao-brasil.json</b> existe.</p>
        </div>
    `;
    document.getElementById('view-brasil').innerHTML = msg;
    document.getElementById('view-brasil').classList.add('on');
    if (window.lucide) lucide.createIcons();
}

/* ═══════════ RENDERIZAR BRASIL ═══════════ */
function renderBrasil() {
    const b = dados.brasil || {};

    // Escolas
    const elEscolas = document.getElementById('br-escolas');
    const detEscolas = document.getElementById('br-escolas-detalhe');
    if (elEscolas) {
        elEscolas.textContent = fmt(b.escolas_total);
        let detalhe = [];
        if (b.escolas_publicas) detalhe.push(`<span>Públicas <b>${fmtCompacto(b.escolas_publicas)}</b></span>`);
        if (b.escolas_privadas) detalhe.push(`<span>Privadas <b>${fmtCompacto(b.escolas_privadas)}</b></span>`);
        detEscolas.innerHTML = detalhe.join('');
    }

    // Alunos
    const elAlunos = document.getElementById('br-alunos');
    const detAlunos = document.getElementById('br-alunos-detalhe');
    if (elAlunos) {
        elAlunos.textContent = fmt(b.alunos_total);
        let detalhe = [];
        if (b.alunos_fundamental) detalhe.push(`<span>Fundamental <b>${fmtCompacto(b.alunos_fundamental)}</b></span>`);
        if (b.alunos_medio) detalhe.push(`<span>Médio <b>${fmtCompacto(b.alunos_medio)}</b></span>`);
        detAlunos.innerHTML = detalhe.join('');
    }

    // Professores
    const elProf = document.getElementById('br-professores');
    const detProf = document.getElementById('br-professores-detalhe');
    if (elProf) {
        elProf.textContent = fmt(b.professores_total);
        let detalhe = [];
        if (b.professores_efetivos) detalhe.push(`<span>Efetivos <b>${fmtCompacto(b.professores_efetivos)}</b></span>`);
        if (b.professores_temporarios) detalhe.push(`<span>Temporários <b>${fmtCompacto(b.professores_temporarios)}</b></span>`);
        detProf.innerHTML = detalhe.join('');
    }
}

/* ═══════════ RENDERIZAR REGIÕES ═══════════ */
function renderRegioes() {
    const lista = document.getElementById('lista-regioes');
    const regioes = dados.regioes || [];

    if (!regioes.length) {
        lista.innerHTML = '<div class="estado-erro"><p>Nenhuma região cadastrada.</p></div>';
        return;
    }

    // Ordena por alunos (maior primeiro)
    const ordenadas = [...regioes].sort((a, b) => (b.alunos || 0) - (a.alunos || 0));

    lista.innerHTML = ordenadas.map(r => {
        const pctAlunos = dados.brasil?.alunos_total
            ? fmtPct(r.alunos, dados.brasil.alunos_total)
            : null;

        return `
            <div class="item">
                <div class="item-topo">
                    <div class="item-nome">
                        <div class="item-nome-txt">${r.nome || '—'}</div>
                    </div>
                    ${pctAlunos ? `<span class="item-badge">${pctAlunos} do Brasil</span>` : ''}
                </div>
                <div class="item-numeros">
                    <div class="item-num">
                        <span class="item-num-label">Escolas</span>
                        <span class="item-num-valor">${fmtCompacto(r.escolas)}</span>
                    </div>
                    <div class="item-num destaque">
                        <span class="item-num-label">Alunos</span>
                        <span class="item-num-valor">${fmtCompacto(r.alunos)}</span>
                    </div>
                    <div class="item-num">
                        <span class="item-num-label">Prof.</span>
                        <span class="item-num-valor">${fmtCompacto(r.professores)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

/* ═══════════ RENDERIZAR ESTADOS ═══════════ */
function renderEstados() {
    const lista = document.getElementById('lista-estados');
    const estados = dados.estados || [];

    if (!estados.length) {
        lista.innerHTML = '<div class="estado-erro"><p>Nenhum estado cadastrado.</p></div>';
        return;
    }

    // Ordena por alunos (maior primeiro)
    const ordenados = [...estados].sort((a, b) => (b.alunos || 0) - (a.alunos || 0));

    lista.innerHTML = ordenados.map(e => `
        <div class="item">
            <div class="item-topo">
                <div class="item-nome">
                    <div class="item-uf">${e.uf || '?'}</div>
                    <div class="item-nome-txt">${e.nome || '—'}</div>
                </div>
            </div>
            <div class="item-numeros">
                <div class="item-num">
                    <span class="item-num-label">Escolas</span>
                    <span class="item-num-valor">${fmtCompacto(e.escolas)}</span>
                </div>
                <div class="item-num destaque">
                    <span class="item-num-label">Alunos</span>
                    <span class="item-num-valor">${fmtCompacto(e.alunos)}</span>
                </div>
                <div class="item-num">
                    <span class="item-num-label">Prof.</span>
                    <span class="item-num-valor">${fmtCompacto(e.professores)}</span>
                </div>
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

/* ═══════════ RODAPÉ ═══════════ */
function renderRodape() {
    const fonteEl = document.getElementById('rodape-fonte');
    const atualizadoEl = document.getElementById('rodape-atualizado');

    if (fonteEl && dados.fonte) fonteEl.textContent = dados.fonte;

    if (atualizadoEl && dados.atualizado) {
        const [y, m, d] = dados.atualizado.split('-');
        atualizadoEl.textContent = `${d}/${m}/${y}`;
    }

    // Atualiza kicker do hero com o ano
    const kickerEl = document.getElementById('hero-kicker');
    if (kickerEl && dados.ano) {
        kickerEl.textContent = `DADOS PÚBLICOS · INEP ${dados.ano}`;
    }
}

/* ═══════════ NAVEGAÇÃO ENTRE NÍVEIS ═══════════ */
function mudarNivel(nivel) {
    if (nivelAtual === nivel) return;
    nivelAtual = nivel;

    // Atualiza botões
    document.querySelectorAll('.nivel-btn').forEach(btn => {
        btn.classList.toggle('on', btn.dataset.nivel === nivel);
    });

    // Atualiza views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
    const viewAtiva = document.getElementById('view-' + nivel);
    if (viewAtiva) viewAtiva.classList.add('on');

    if (window.lucide) lucide.createIcons();
}

/* ═══════════ RENDER PRINCIPAL ═══════════ */
function renderizar() {
    renderBrasil();
    renderRegioes();
    renderEstados();
    renderRodape();
}

/* ═══════════ INIT ═══════════ */
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    carregarDados();
});
