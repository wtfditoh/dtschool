/* boletim.js — Hub Brain · Modo Boletim Escolar */

const $ = (id) => document.getElementById(id);

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

function calcularSituacao(notas, cfg) {
    const validas = notas.filter(n => n !== null && !isNaN(n));
    const total = notas.length;
    const faltam = total - validas.length;

    if (validas.length === 0) {
        return { txt: 'SEM NOTA', cls: 'sem' };
    }

    const soma = validas.reduce((a, b) => a + b, 0);
    const somaMinima = cfg.media * total;

    if (soma >= somaMinima) {
        return { txt: 'APROVADO', cls: 'aprovado' };
    }

    if (faltam > 0) {
        const somaMaxima = soma + faltam * cfg.notaMax;
        if (somaMaxima < somaMinima) {
            return { txt: 'REPROVADO', cls: 'reprovado' };
        }
        return { txt: 'EM CURSO', cls: 'em-curso' };
    }

    return { txt: 'REPROVADO', cls: 'reprovado' };
}

/* ═══════════════ RENDER BOLETIM ═══════════════ */
function renderBoletim() {
    const materias = (window.HBNotas && window.HBNotas.getMaterias()) || [];
    const cfg = (window.HBNotas && window.HBNotas.getCfg && window.HBNotas.getCfg()) || {
        numPeriodos: 4, notaMax: 10, media: 6,
        labels: ['1º BIM', '2º BIM', '3º BIM', '4º BIM']
    };

    const nome = localStorage.getItem('dt_user_name') || 'Estudante';
    $('bol-aluno').innerText = nome.toUpperCase();

    let cfgUser = {};
    try { cfgUser = JSON.parse(localStorage.getItem('dt_config') || '{}'); } catch(e) {}

    $('bol-escola').innerText = (cfgUser.escola || '—').toUpperCase();

    const serieMap = {
        '1em': '1° Ano EM', '2em': '2° Ano EM', '3em': '3° Ano EM',
        '6ef': '6° Ano', '7ef': '7° Ano', '8ef': '8° Ano', '9ef': '9° Ano',
        'fac': 'Faculdade'
    };
    const serie = serieMap[cfgUser.serie] || '';
    const turma = cfgUser.turma || '';
    const serieTurma = [serie, turma].filter(Boolean).join(' · ') || '—';
    $('bol-serie-turma').innerText = serieTurma;

    const ano = cfgUser.ano || new Date().getFullYear();
    $('bol-ano').innerText = 'ANO LETIVO ' + ano;

    const d = new Date();
    $('bol-data').innerText = String(d.getDate()).padStart(2, '0') + '/' +
        String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();

    const thead = $('bol-thead');
    const tbody = $('bol-tbody');

    const cols = ['DISCIPLINA'];
    for (let i = 0; i < cfg.numPeriodos; i++) cols.push(cfg.labels[i]);
    cols.push('MÉDIA');
    cols.push('SITUAÇÃO');

    thead.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;

    if (!materias.length) {
        tbody.innerHTML = `<tr><td colspan="${cols.length}" style="text-align:center; padding:30px; color:#666; font-size:13px;">Nenhuma disciplina cadastrada ainda.</td></tr>`;
    } else {
        tbody.innerHTML = materias.map(m => {
            const notas = getNotas(m, cfg.numPeriodos);
            const validas = notas.filter(n => n !== null && !isNaN(n));
            const media = validas.length > 0 ? (validas.reduce((a, b) => a + b, 0) / validas.length) : null;
            const sit = calcularSituacao(notas, cfg);

            const celulasNotas = notas.map(n => {
                if (n === null || isNaN(n)) return '<td class="bol-td-nota vazia">—</td>';
                const cls = n >= cfg.media ? 'boa' : (n >= 4 ? 'media' : 'baixa');
                return `<td class="bol-td-nota ${cls}">${n.toFixed(1)}</td>`;
            }).join('');

            const mediaTxt = media === null ? '—' : media.toFixed(1);
            const mediaCls = media === null ? 'vazia' : (media >= cfg.media ? 'boa' : (media >= 4 ? 'media' : 'baixa'));

            return `
                <tr>
                    <td class="bol-td-disc">${m.nome}</td>
                    ${celulasNotas}
                    <td class="bol-td-media ${mediaCls}">${mediaTxt}</td>
                    <td class="bol-td-sit"><span class="bol-sit ${sit.cls}">${sit.txt}</span></td>
                </tr>
            `;
        }).join('');
    }

    /* Contador — só conta como APROVADO se a situação for aprovado */
    let somaMedias = 0, comMedia = 0, aprovadas = 0;
    materias.forEach(m => {
        const notas = getNotas(m, cfg.numPeriodos);
        const validas = notas.filter(n => n !== null && !isNaN(n));
        if (validas.length > 0) {
            const media = validas.reduce((a, b) => a + b, 0) / validas.length;
            somaMedias += media;
            comMedia++;
            const sit = calcularSituacao(notas, cfg);
            if (sit.cls === 'aprovado') aprovadas++;
        }
    });
    const mediaGeral = comMedia > 0 ? (somaMedias / comMedia) : 0;

    $('bol-media-geral').innerText = mediaGeral.toFixed(1);
    $('bol-aprovadas').innerText = aprovadas + '/' + materias.length;

    let statusGeral = '—';
    let statusCor = '#666';
    if (comMedia > 0) {
        if (mediaGeral >= cfg.media) { statusGeral = 'APROVADO'; statusCor = '#00e5a0'; }
        else if (mediaGeral >= 4) { statusGeral = 'RECUPERAÇÃO'; statusCor = '#ffbb33'; }
        else { statusGeral = 'REPROVADO'; statusCor = '#ff4455'; }
    }
    const elStatus = $('bol-status-geral');
    elStatus.innerText = statusGeral;
    elStatus.style.color = statusCor;

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
        if (btnTemaEl) btnTemaEl.style.display = '';
        renderBoletim();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        if (ed) ed.style.display = '';
        if (bo) bo.style.display = 'none';
        if (btn) { btn.classList.remove('ativo'); btn.innerHTML = '<i data-lucide="clipboard-list"></i>'; }
        if (btnAdd) btnAdd.style.display = '';
        if (btnTemaEl) btnTemaEl.style.display = 'none';
    }
    if (window.lucide) lucide.createIcons();
}

/* ═══════════════ COMPARTILHAR (A4) ═══════════════ */
async function compartilharBoletim() {
    const btn = $('btn-share-boletim');
    if (btn) btn.disabled = true;

    let container = document.getElementById('bol-share-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'bol-share-container';
        container.style.cssText = 'position:fixed; left:-9999px; top:0;';
        document.body.appendChild(container);
    }

    const materias = (window.HBNotas && window.HBNotas.getMaterias()) || [];
    const cfg = (window.HBNotas && window.HBNotas.getCfg && window.HBNotas.getCfg()) || {
        numPeriodos: 4, notaMax: 10, media: 6,
        labels: ['1º BIM', '2º BIM', '3º BIM', '4º BIM']
    };

    let cfgUser = {};
    try { cfgUser = JSON.parse(localStorage.getItem('dt_config') || '{}'); } catch(e) {}

    const nome = (localStorage.getItem('dt_user_name') || 'Estudante').toUpperCase();
    const escola = (cfgUser.escola || '').toUpperCase() || '—';
    const serieMap = {
        '1em': '1° Ano EM', '2em': '2° Ano EM', '3em': '3° Ano EM',
        '6ef': '6° Ano', '7ef': '7° Ano', '8ef': '8° Ano', '9ef': '9° Ano',
        'fac': 'Faculdade'
    };
    const serieTurma = [serieMap[cfgUser.serie] || '', cfgUser.turma || ''].filter(Boolean).join(' · ') || '—';
    const anoLetivo = cfgUser.ano || new Date().getFullYear();

    const d = new Date();
    const dataStr = String(d.getDate()).padStart(2, '0') + '/' +
        String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();

    const ehClaro = document.body.classList.contains('tema-claro');
    const bg1 = ehClaro ? '#ffffff' : '#0d0d12';
    const bg2 = ehClaro ? '#f5f3fa' : '#08080c';
    const txt = ehClaro ? '#1a1a1c' : '#ffffff';
    const txtDim = ehClaro ? '#999' : '#666';
    const bordaSuave = ehClaro ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
    const assinaturaCor = ehClaro ? '#1a1a1c' : '#ffffff';
    const roxo = '#8a2be2';
    const verde = '#00c851';
    const amarelo = '#ffbb33';
    const vermelho = '#ff4455';

    const linhas = materias.map(m => {
        const notas = getNotas(m, cfg.numPeriodos);
        const validas = notas.filter(n => n !== null && !isNaN(n));
        const media = validas.length > 0 ? (validas.reduce((a, b) => a + b, 0) / validas.length) : null;
        const sit = calcularSituacao(notas, cfg);
        return { nome: m.nome, notas, media, sit };
    });

    const headCols = ['DISCIPLINA', ...cfg.labels, 'MÉDIA', 'SITUAÇÃO'];

    /* Contador correto */
    let somaMedias = 0, comMedia = 0, aprovadas = 0;
    linhas.forEach(l => {
        if (l.media !== null) {
            somaMedias += l.media;
            comMedia++;
            if (l.sit.cls === 'aprovado') aprovadas++;
        }
    });
    const mediaGeral = comMedia > 0 ? (somaMedias / comMedia) : 0;

    const corSitTxt = (cls) => cls === 'aprovado' ? verde : cls === 'reprovado' ? vermelho : cls === 'em-curso' ? roxo : txtDim;

    container.innerHTML = `
        <div style="width:1080px; height:1527px; padding:55px 65px 40px; background:linear-gradient(160deg, ${bg1}, ${bg2}); color:${txt}; font-family:'Outfit',sans-serif; position:relative; overflow:hidden; display:flex; flex-direction:column;">
            <div style="position:absolute; right:-80px; bottom:-80px; opacity:0.05; transform:rotate(-12deg); width:420px;">
                <img src="icon-514_20260512_161420_0000.png" style="width:100%;">
            </div>

            <div style="position:relative; z-index:1; display:flex; flex-direction:column; height:100%;">

                <h1 style="font-size:36px; font-weight:900; text-align:center; letter-spacing:7px; margin:0; color:${txt};">BOLETIM ESCOLAR</h1>
                <div style="text-align:center; font-size:12px; color:${txtDim}; letter-spacing:4px; margin-top:6px;">ANO LETIVO ${anoLetivo}</div>
                <div style="height:3px; margin:16px auto 22px; width:55%; background:linear-gradient(90deg, transparent, ${roxo} 50%, transparent); border-radius:3px;"></div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px 24px; margin-bottom:20px; padding:16px 20px; border-radius:14px; background:${ehClaro ? 'rgba(138,43,226,0.05)' : 'rgba(138,43,226,0.08)'}; border:1px solid ${ehClaro ? 'rgba(138,43,226,0.2)' : 'rgba(138,43,226,0.25)'};">
                    <div>
                        <span style="display:block; font-size:9px; font-weight:800; letter-spacing:2px; color:${txtDim}; margin-bottom:3px;">ALUNO</span>
                        <strong style="font-size:14px; font-weight:900; color:${txt}; letter-spacing:0.5px;">${nome}</strong>
                    </div>
                    <div>
                        <span style="display:block; font-size:9px; font-weight:800; letter-spacing:2px; color:${txtDim}; margin-bottom:3px;">DATA</span>
                        <strong style="font-size:14px; font-weight:800; color:${txt};">${dataStr}</strong>
                    </div>
                    <div>
                        <span style="display:block; font-size:9px; font-weight:800; letter-spacing:2px; color:${txtDim}; margin-bottom:3px;">ESCOLA</span>
                        <strong style="font-size:13px; font-weight:800; color:${txt};">${escola}</strong>
                    </div>
                    <div>
                        <span style="display:block; font-size:9px; font-weight:800; letter-spacing:2px; color:${txtDim}; margin-bottom:3px;">SÉRIE / TURMA</span>
                        <strong style="font-size:13px; font-weight:800; color:${txt};">${serieTurma}</strong>
                    </div>
                </div>

                <table style="width:100%; border-collapse:collapse; margin-bottom:18px;">
                    <thead>
                        <tr>
                            ${headCols.map((c, i) => `<th style="padding:9px 6px; font-size:9px; font-weight:900; letter-spacing:1.2px; color:${txtDim}; text-align:${i === 0 ? 'left' : 'center'}; border-bottom:2px solid ${bordaSuave};">${c}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${linhas.map(l => `
                            <tr>
                                <td style="padding:9px 6px; font-size:11px; font-weight:800; color:${txt}; text-transform:uppercase; letter-spacing:0.3px; border-bottom:1px dashed ${bordaSuave};">${l.nome}</td>
                                ${l.notas.map(n => `<td style="padding:9px 6px; text-align:center; font-size:13px; font-weight:900; color:${n === null ? txtDim : txt}; border-bottom:1px dashed ${bordaSuave};">${n === null ? '—' : n.toFixed(1)}</td>`).join('')}
                                <td style="padding:9px 6px; text-align:center; font-size:14px; font-weight:900; color:${l.media === null ? txtDim : txt}; border-bottom:1px dashed ${bordaSuave};">${l.media === null ? '—' : l.media.toFixed(1)}</td>
                                <td style="padding:9px 6px; text-align:center; border-bottom:1px dashed ${bordaSuave};">
                                    <span style="display:inline-block; padding:4px 9px; border-radius:12px; font-size:8px; font-weight:900; letter-spacing:0.8px; color:${corSitTxt(l.sit.cls)}; background:${corSitTxt(l.sit.cls)}1a;">${l.sit.txt}</span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; padding:18px; border-radius:16px; background:linear-gradient(135deg, ${ehClaro ? 'rgba(138,43,226,0.08)' : 'rgba(138,43,226,0.18)'}, ${ehClaro ? 'rgba(138,43,226,0.02)' : 'rgba(138,43,226,0.05)'}); border:1px solid ${ehClaro ? 'rgba(138,43,226,0.25)' : 'rgba(138,43,226,0.35)'}; margin-bottom:auto;">
                    <div style="text-align:center;">
                        <span style="display:block; font-size:9px; font-weight:800; letter-spacing:2px; color:${txtDim}; margin-bottom:4px;">MÉDIA GERAL</span>
                        <strong style="font-size:26px; font-weight:900; color:${roxo};">${mediaGeral.toFixed(1)}</strong>
                    </div>
                    <div style="text-align:center;">
                        <span style="display:block; font-size:9px; font-weight:800; letter-spacing:2px; color:${txtDim}; margin-bottom:4px;">APROVADAS</span>
                        <strong style="font-size:26px; font-weight:900; color:${roxo};">${aprovadas}/${materias.length}</strong>
                    </div>
                    <div style="text-align:center;">
                        <span style="display:block; font-size:9px; font-weight:800; letter-spacing:2px; color:${txtDim}; margin-bottom:4px;">SITUAÇÃO</span>
                        <strong style="font-size:15px; font-weight:900; color:${mediaGeral >= cfg.media ? verde : mediaGeral > 0 ? amarelo : txtDim}; display:block; padding-top:8px;">${mediaGeral >= cfg.media ? 'APROVADO' : mediaGeral > 0 ? 'RECUPERAÇÃO' : '—'}</strong>
                    </div>
                </div>

                <div style="text-align:center; margin-top:38px; position:relative;">
                    <div style="font-family:'Mrs Saint Delafield','Herr Von Muellerhoff','Alex Brush','Italianno',cursive; font-size:78px; font-weight:400; line-height:0.9; color:${assinaturaCor}; transform:rotate(-6deg); display:inline-block; letter-spacing:-2px; text-shadow:0 0 20px rgba(138,43,226,0.5), 0 0 40px rgba(138,43,226,0.2), 0 2px 4px rgba(0,0,0,0.4); padding-right:16px;">Ditoh</div>
                    <div style="width:220px; height:1px; background:linear-gradient(90deg, transparent, ${ehClaro ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.35)'}, transparent); margin:6px auto 10px;"></div>
                    <span style="font-family:'Outfit',sans-serif; font-size:10px; font-weight:800; color:${txtDim}; letter-spacing:3px; text-transform:uppercase;">Coordenação <span style="color:${roxo};">Hub Brain</span></span>
                </div>

                <div style="text-align:center; margin-top:26px;">
                    <div style="font-size:16px; font-weight:900; color:${roxo}; letter-spacing:4px;">HUB BRAIN</div>
                    <div style="font-size:11px; color:${txtDim}; margin-top:3px;">hubbrain.netlify.app</div>
                </div>

            </div>
        </div>
    `;

    await new Promise(r => setTimeout(r, 400));

    try {
        if (!window.html2canvas) throw new Error('html2canvas não carregou');

        const alvo = container.firstElementChild;
        const canvas = await html2canvas(alvo, {
            backgroundColor: ehClaro ? '#ffffff' : '#0d0d12',
            scale: 1, useCORS: true, allowTaint: true
        });

        canvas.toBlob(async blob => {
            const file = new File([blob], 'Boletim_HubBrain.png', { type: 'image/png' });
            const texto = `📚 Meu boletim no Hub Brain\nMédia: ${mediaGeral.toFixed(1)} · Aprovadas: ${aprovadas}/${materias.length}\n\nhttps://hubbrain.netlify.app`;

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

    if (localStorage.getItem('hb_notas_modo') === 'boletim') {
        setTimeout(() => alternarModo(), 400);
    }

    if (window.lucide) lucide.createIcons();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
