/* boletim.js — Hub Brain · Modo Boletim Escolar
   Lê as matérias do notas-logica.js via window.HBNotas.
   Alterna entre edição e boletim, tema claro/escuro (só no boletim), compartilha imagem. */

const $ = (id) => document.getElementById(id);

let periodo = 'media';        // 'media' | '1'..'4'
let boletimAberto = false;

/* ═══════════════ TEMA ═══════════════ */
function aplicarTema() {
    const t = localStorage.getItem('hb_tema') || 'escuro';
    document.body.classList.toggle('tema-claro', t === 'claro');
    const btn = $('btn-tema');
    if (btn) btn.innerHTML = t === 'claro' ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
    if (window.lucide) lucide.createIcons();
}

function toggleTema() {
    const atual = localStorage.getItem('hb_tema') || 'escuro';
    localStorage.setItem('hb_tema', atual === 'claro' ? 'escuro' : 'claro');
    aplicarTema();
    if (boletimAberto) renderBoletim();
}

/* ═══════════════ HELPERS ═══════════════ */
function getNotas(m, numPeriodos) {
    const notas = [];
    for (let i = 1; i <= numPeriodos; i++) {
        const v = m['n' + i];
        notas.push(v === '' || v === undefined || v === null ? null : parseFloat(v));
    }
    return notas;
}

function situacaoDaNota(nota, cfg) {
    if (nota === null || isNaN(nota)) return { txt: '—', cls: 'sem' };
    if (nota >= cfg.media) return { txt: 'APROVADO', cls: 'aprovado' };
    if (nota >= 4) return { txt: 'RECUPERAÇÃO', cls: 'recuperacao' };
    return { txt: 'REPROVADO', cls: 'reprovado' };
}

/* ═══════════════ RENDER BOLETIM ═══════════════ */
function renderTabs(cfg) {
    const tabs = $('bol-tabs');
    if (!tabs) return;

    const lista = [];
    for (let i = 0; i < cfg.numPeriodos; i++) {
        lista.push({ id: String(i + 1), label: cfg.labels[i] });
    }
    lista.push({ id: 'media', label: 'MÉDIA' });

    tabs.innerHTML = lista.map(t =>
        `<button class="bol-tab ${periodo === t.id ? 'on' : ''}" data-p="${t.id}">${t.label}</button>`
    ).join('');

    tabs.querySelectorAll('.bol-tab').forEach(b => {
        b.addEventListener('click', () => {
            periodo = b.dataset.p;
            renderBoletim();
        });
    });
}

function renderBoletim() {
    const materias = (window.HBNotas && window.HBNotas.getMaterias()) || [];
    const cfg = (window.HBNotas && window.HBNotas.getCfg && window.HBNotas.getCfg()) || {
        numPeriodos: 4, notaMax: 10, media: 6,
        labels: ['1º BIM', '2º BIM', '3º BIM', '4º BIM']
    };

    // Cabeçalho
    const nome = localStorage.getItem('dt_user_name') || 'Estudante';
    $('bol-aluno').innerText = nome.toUpperCase();
    const d = new Date();
    $('bol-data').innerText = String(d.getDate()).padStart(2, '0') + '/' +
        String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();

    renderTabs(cfg);

    // Calcula cada linha
    const linhas = materias.map(m => {
        const notas = getNotas(m, cfg.numPeriodos);
        let notaFinal = null;
        let situacao = { txt: '—', cls: 'sem' };

        if (periodo === 'media') {
            const validas = notas.filter(n => n !== null && !isNaN(n));
            if (validas.length > 0) {
                notaFinal = validas.reduce((a, b) => a + b, 0) / validas.length;
            }
        } else {
            const idx = parseInt(periodo) - 1;
            const v = notas[idx];
            if (v !== null && !isNaN(v)) notaFinal = v;
        }

        if (notaFinal !== null) situacao = situacaoDaNota(notaFinal, cfg);

        return { nome: m.nome, nota: notaFinal, sit: situacao };
    });

    const cont = $('bol-linhas');
    if (!linhas.length) {
        cont.innerHTML = '<div style="text-align:center; padding:30px; color:#666; font-size:13px;">Nenhuma disciplina cadastrada ainda.</div>';
    } else {
        cont.innerHTML = linhas.map(l => `
            <div class="bol-linha">
                <span class="bol-linha-nome">${l.nome}</span>
                <span class="bol-linha-nota ${l.nota === null ? 'vazia' : ''}">${l.nota === null ? '—' : l.nota.toFixed(1)}</span>
                <span class="bol-linha-sit ${l.sit.cls}">${l.sit.txt}</span>
            </div>
        `).join('');
    }

    // Resumo
    const validas = linhas.filter(l => l.nota !== null);
    const mediaGeral = validas.length > 0 ? (validas.reduce((a, l) => a + l.nota, 0) / validas.length) : 0;
    const aprovadas = validas.filter(l => l.nota >= cfg.media).length;

    $('bol-media').innerText = mediaGeral.toFixed(1);
    $('bol-aprovadas').innerText = aprovadas + '/' + materias.length;

    const status = mediaGeral >= cfg.media ? 'APROVADO' : (mediaGeral > 0 ? 'EM RECUPERAÇÃO' : '—');
    $('bol-status').innerText = status;

    if (window.lucide) lucide.createIcons();
}

/* ═══════════════ TOGGLE MODO ═══════════════ */
function alternarModo() {
    boletimAberto = !boletimAberto;
    localStorage.setItem('hb_notas_modo', boletimAberto ? 'boletim' : 'edicao');

    const ed = $('modo-edicao');
    const bo = $('modo-boletim');
    const btn = $('btn-boletim');
    const btnTemaEl = $('btn-tema');
    const btnAdd = document.querySelector('.btn-add');

    if (boletimAberto) {
        if (ed) ed.style.display = 'none';
        if (bo) bo.style.display = 'block';
        if (btn) { btn.classList.add('ativo'); btn.innerHTML = '<i data-lucide="pencil"></i>'; }
        if (btnAdd) btnAdd.style.display = 'none';
        if (btnTemaEl) btnTemaEl.style.display = '';   // ✅ mostra o botão de tema
        renderBoletim();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        if (ed) ed.style.display = '';
        if (bo) bo.style.display = 'none';
        if (btn) { btn.classList.remove('ativo'); btn.innerHTML = '<i data-lucide="clipboard-list"></i>'; }
        if (btnAdd) btnAdd.style.display = '';
        if (btnTemaEl) btnTemaEl.style.display = 'none';   // ✅ esconde o botão de tema
    }
    if (window.lucide) lucide.createIcons();
}

/* ═══════════════ COMPARTILHAR ═══════════════ */
async function compartilharBoletim() {
    const btn = $('btn-share-boletim');
    if (btn) { btn.disabled = true; }

    let container = document.getElementById('bol-share-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'bol-share-container';
        container.style.cssText = 'position:fixed; left:-9999px; top:0;';
        document.body.appendChild(container);
    }

    const cfg = (window.HBNotas && window.HBNotas.getCfg && window.HBNotas.getCfg()) || {
        numPeriodos: 4, media: 6,
        labels: ['1º BIM', '2º BIM', '3º BIM', '4º BIM']
    };
    const materias = (window.HBNotas && window.HBNotas.getMaterias()) || [];
    const nome = (localStorage.getItem('dt_user_name') || 'Estudante').toUpperCase();
    const d = new Date();
    const dataStr = String(d.getDate()).padStart(2, '0') + '/' +
        String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    const ehClaro = document.body.classList.contains('tema-claro');

    const periodoTxt = periodo === 'media' ? 'MÉDIA FINAL' : cfg.labels[parseInt(periodo) - 1];

    const linhas = materias.map(m => {
        const notas = getNotas(m, cfg.numPeriodos);
        let notaFinal = null;
        if (periodo === 'media') {
            const vs = notas.filter(n => n !== null && !isNaN(n));
            if (vs.length > 0) notaFinal = vs.reduce((a, b) => a + b, 0) / vs.length;
        } else {
            const v = notas[parseInt(periodo) - 1];
            if (v !== null && !isNaN(v)) notaFinal = v;
        }
        const sit = notaFinal === null ? { txt: '—', cls: 'sem' } : situacaoDaNota(notaFinal, cfg);
        return { nome: m.nome, nota: notaFinal, sit };
    });

    const validas = linhas.filter(l => l.nota !== null);
    const mediaGeral = validas.length > 0 ? (validas.reduce((a, l) => a + l.nota, 0) / validas.length) : 0;
    const aprovadas = validas.filter(l => l.nota >= cfg.media).length;

    const bg1 = ehClaro ? '#ffffff' : '#0d0d12';
    const bg2 = ehClaro ? '#f5f3fa' : '#08080c';
    const txt = ehClaro ? '#1a1a1c' : '#ffffff';
    const txtDim = ehClaro ? '#999' : '#666';
    const roxo = '#8a2be2';
    const verde = '#00c851';
    const amarelo = '#ffbb33';
    const vermelho = '#ff4455';

    const corSit = (sit) => sit === 'aprovado' ? verde : sit === 'recuperacao' ? amarelo : sit === 'reprovado' ? vermelho : txtDim;

    container.innerHTML = `
        <div style="width:1080px; min-height:1350px; padding:80px 70px; background:linear-gradient(160deg, ${bg1}, ${bg2}); color:${txt}; font-family:'Outfit',sans-serif; position:relative; overflow:hidden;">
            <div style="position:absolute; right:-80px; bottom:-80px; opacity:0.05; transform:rotate(-12deg); width:420px;">
                <img src="icon-514_20260512_161420_0000.png" style="width:100%;">
            </div>

            <div style="position:relative; z-index:1;">
                <h1 style="font-size:44px; font-weight:900; text-align:center; letter-spacing:8px; margin:0; color:${txt};">BOLETIM ESCOLAR</h1>
                <div style="height:4px; margin:22px auto 40px; width:60%; background:linear-gradient(90deg, transparent, ${roxo} 50%, transparent); border-radius:4px;"></div>

                <div style="display:grid; grid-template-columns:1fr auto; gap:20px; margin-bottom:36px; padding:20px 26px; border-radius:18px; background:${ehClaro ? 'rgba(138,43,226,0.06)' : 'rgba(138,43,226,0.08)'}; border:1px solid ${ehClaro ? 'rgba(138,43,226,0.2)' : 'rgba(138,43,226,0.25)'};">
                    <div>
                        <span style="display:block; font-size:11px; font-weight:800; letter-spacing:2px; color:${txtDim}; margin-bottom:6px;">ALUNO</span>
                        <strong style="font-size:22px; font-weight:900; color:${txt}; letter-spacing:1px;">${nome}</strong>
                    </div>
                    <div style="text-align:right;">
                        <span style="display:block; font-size:11px; font-weight:800; letter-spacing:2px; color:${txtDim}; margin-bottom:6px;">DATA</span>
                        <strong style="font-size:18px; font-weight:800; color:${txt};">${dataStr}</strong>
                    </div>
                </div>

                <div style="text-align:center; margin-bottom:28px;">
                    <span style="display:inline-block; padding:10px 26px; border-radius:20px; background:${ehClaro ? 'rgba(138,43,226,0.1)' : 'rgba(138,43,226,0.15)'}; color:${roxo}; font-size:14px; font-weight:900; letter-spacing:3px;">${periodoTxt}</span>
                </div>

                <div style="margin-bottom:32px;">
                    <div style="display:grid; grid-template-columns:1fr 120px 180px; gap:12px; padding:14px 18px; font-size:12px; font-weight:800; letter-spacing:2px; color:${txtDim}; border-bottom:2px solid ${ehClaro ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'};">
                        <span>DISCIPLINA</span>
                        <span style="text-align:center;">NOTA</span>
                        <span style="text-align:center;">SITUAÇÃO</span>
                    </div>
                    ${linhas.map(l => `
                        <div style="display:grid; grid-template-columns:1fr 120px 180px; gap:12px; align-items:center; padding:16px 18px; border-bottom:1px dashed ${ehClaro ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'};">
                            <span style="font-weight:800; font-size:18px; color:${txt}; text-transform:uppercase; letter-spacing:0.5px;">${l.nome}</span>
                            <span style="text-align:center; font-weight:900; font-size:24px; color:${l.nota === null ? txtDim : txt};">${l.nota === null ? '—' : l.nota.toFixed(1)}</span>
                            <span style="text-align:center; font-weight:900; font-size:12px; letter-spacing:1px; padding:8px 10px; border-radius:20px; color:${corSit(l.sit.cls)}; background:${corSit(l.sit.cls)}1a;">${l.sit.txt}</span>
                        </div>
                    `).join('')}
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; padding:26px; border-radius:20px; background:linear-gradient(135deg, ${ehClaro ? 'rgba(138,43,226,0.1)' : 'rgba(138,43,226,0.18)'}, ${ehClaro ? 'rgba(138,43,226,0.02)' : 'rgba(138,43,226,0.05)'}); border:1px solid ${ehClaro ? 'rgba(138,43,226,0.25)' : 'rgba(138,43,226,0.35)'}; margin-bottom:40px;">
                    <div style="text-align:center;">
                        <span style="display:block; font-size:11px; font-weight:800; letter-spacing:2px; color:${txtDim}; margin-bottom:6px;">MÉDIA GERAL</span>
                        <strong style="font-size:36px; font-weight:900; color:${roxo};">${mediaGeral.toFixed(1)}</strong>
                    </div>
                    <div style="text-align:center;">
                        <span style="display:block; font-size:11px; font-weight:800; letter-spacing:2px; color:${txtDim}; margin-bottom:6px;">APROVADAS</span>
                        <strong style="font-size:36px; font-weight:900; color:${roxo};">${aprovadas}/${materias.length}</strong>
                    </div>
                    <div style="text-align:center;">
                        <span style="display:block; font-size:11px; font-weight:800; letter-spacing:2px; color:${txtDim}; margin-bottom:6px;">SITUAÇÃO</span>
                        <strong style="font-size:20px; font-weight:900; color:${mediaGeral >= cfg.media ? verde : mediaGeral > 0 ? amarelo : txtDim}; padding-top:12px; display:block;">${mediaGeral >= cfg.media ? 'APROVADO' : mediaGeral > 0 ? 'RECUPERAÇÃO' : '—'}</strong>
                    </div>
                </div>

                <div style="text-align:center; margin-top:60px;">
                    <div style="width:280px; height:1px; background:${ehClaro ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}; margin:0 auto 10px;"></div>
                    <span style="font-size:12px; font-weight:700; color:${txtDim}; letter-spacing:2px; text-transform:uppercase;">Coordenação Hub Brain</span>
                </div>

                <div style="text-align:center; margin-top:50px;">
                    <div style="font-size:22px; font-weight:900; color:${roxo}; letter-spacing:4px;">HUB BRAIN</div>
                    <div style="font-size:14px; color:${txtDim}; margin-top:6px;">hubbrain.netlify.app</div>
                </div>
            </div>
        </div>
    `;

    await new Promise(r => setTimeout(r, 250));

    try {
        if (!window.html2canvas) throw new Error('html2canvas não carregou');

        const alvo = container.firstElementChild;
        const canvas = await html2canvas(alvo, {
            backgroundColor: ehClaro ? '#ffffff' : '#0d0d12',
            scale: 1, useCORS: true
        });

        canvas.toBlob(async blob => {
            const file = new File([blob], 'Boletim_HubBrain.png', { type: 'image/png' });
            const texto = `📚 Meu boletim no Hub Brain — ${periodoTxt}\nMédia: ${mediaGeral.toFixed(1)}\n\nhttps://hubbrain.netlify.app`;

            if (navigator.share) {
                try { await navigator.share({ title: 'Meu Boletim', text: texto, files: [file] }); }
                catch (e) { if (e.name !== 'AbortError') console.error(e); }
            } else {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'Boletim_HubBrain.png';
                a.click();
            }
            container.innerHTML = '';
            if (btn) btn.disabled = false;
        });
    } catch (e) {
        console.error('[boletim]', e);
        container.innerHTML = '';
        if (btn) btn.disabled = false;
        alert('Erro ao gerar imagem: ' + e.message);
    }
}

/* ═══════════════ INIT ═══════════════ */
function iniciar() {
    aplicarTema();

    const btnBol = $('btn-boletim');
    const btnTema = $('btn-tema');
    const btnShare = $('btn-share-boletim');

    if (btnBol) btnBol.addEventListener('click', alternarModo);
    if (btnTema) btnTema.addEventListener('click', toggleTema);
    if (btnShare) btnShare.addEventListener('click', compartilharBoletim);

    // Restaura modo salvo
    if (localStorage.getItem('hb_notas_modo') === 'boletim') {
        setTimeout(() => alternarModo(), 400);
    }

    if (window.lucide) lucide.createIcons();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
