/* ═══════════════════════════════════════════════════════════════════════════
   FÍSICA E MATEMÁTICA - SIMULAÇÕES E CÁLCULOS
   Hub Brain Edition
   ═══════════════════════════════════════════════════════════════════════════ */

const R_GAS = 8.314;
const g = 9.8;

// ════════════════════════════════════════════════════════════════════════════
// GASES — BALÕES + CALCULADORA DE EXERCÍCIOS (Lei Geral P1V1/T1 = P2V2/T2)
// ════════════════════════════════════════════════════════════════════════════

let balaoAnimFrame = null;
let balaoState = { V1: 5, V2: 8, P1: 2, P2: null, T1: 300, T2: 400 };

function desenharBaloes(V1, V2) {
    const canvas = document.getElementById('canvas-baloes');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Fundo sutil
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, 'rgba(10,5,20,0)');
    bg.addColorStop(1, 'rgba(30,10,60,0.15)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Escala: raio proporcional à raiz cúbica do volume
    const maxV = Math.max(V1, V2, 1);
    const BASE_R = Math.min(W / 5, H * 0.38);

    function drawBalloon(cx, volume, maxVol, label, valLabel, colorTop, colorBot) {
        const r = BASE_R * Math.cbrt(volume / maxVol);
        const balloonBottom = H * 0.72;
        const cy = balloonBottom - r;

        // Sombra
        ctx.save();
        ctx.shadowColor = colorTop;
        ctx.shadowBlur = 28;

        // Corpo do balão
        const grad = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.28, r * 0.08, cx, cy, r);
        grad.addColorStop(0, colorTop);
        grad.addColorStop(0.6, colorBot);
        grad.addColorStop(1, 'rgba(10,5,30,0.9)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 1.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // Brilho
        const shine = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.32, 0, cx - r * 0.2, cy - r * 0.2, r * 0.55);
        shine.addColorStop(0, 'rgba(255,255,255,0.55)');
        shine.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = shine;
        ctx.beginPath();
        ctx.ellipse(cx - r * 0.28, cy - r * 0.28, r * 0.42, r * 0.38, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Nó do balão
        ctx.fillStyle = colorBot;
        ctx.beginPath();
        ctx.ellipse(cx, balloonBottom + 4, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cordinha
        ctx.strokeStyle = 'rgba(200,180,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, balloonBottom + 13);
        // Leve curva na cordinha
        ctx.bezierCurveTo(cx + 10, balloonBottom + 35, cx - 10, balloonBottom + 55, cx, balloonBottom + 70);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label em cima
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `bold 13px 'Outfit', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, cy - r - 14);

        // Valor do volume
        ctx.fillStyle = colorTop;
        ctx.font = `bold 15px 'Outfit', sans-serif`;
        ctx.fillText(valLabel, cx, cy - r - 32);
    }

    const cx1 = W * 0.3;
    const cx2 = W * 0.7;

    drawBalloon(cx1, V1, maxV, 'Estado 1', `V₁ = ${parseFloat(V1).toFixed(1)} L`, '#7dd3fc', '#2563eb');
    drawBalloon(cx2, V2, maxV, 'Estado 2', `V₂ = ${parseFloat(V2).toFixed(1)} L`, '#86efac', '#16a34a');

    // Fórmula no centro
    ctx.fillStyle = 'rgba(192,132,252,0.85)';
    ctx.font = `bold 14px 'Outfit', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('P₁V₁/T₁ = P₂V₂/T₂', W / 2, H - 12);
}

function calcularExercicio() {
    const campos = ['gas-p1', 'gas-v1', 'gas-t1', 'gas-p2', 'gas-v2', 'gas-t2'];
    const vals = {};
    let vazios = [];

    campos.forEach(id => {
        const el = document.getElementById(id);
        const v = el.value.trim();
        if (v === '' || isNaN(parseFloat(v))) {
            vazios.push(id);
            vals[id] = null;
        } else {
            vals[id] = parseFloat(v);
        }
    });

    const resultEl = document.getElementById('gas-result');
    const resultLabel = document.getElementById('gas-result-label');
    const resultVal = document.getElementById('gas-result-value');
    const resultEq = document.getElementById('gas-result-eq');
    const resultBox = document.getElementById('gas-result-box');

    if (vazios.length !== 1) {
        resultBox.style.display = 'block';
        resultLabel.textContent = 'Atenção';
        resultVal.textContent = '—';
        resultEq.textContent = vazios.length === 0
            ? 'Deixe exatamente 1 campo vazio — o que você quer calcular.'
            : `Deixe apenas 1 campo vazio. Você deixou ${vazios.length}.`;
        return;
    }

    const incognita = vazios[0];
    const { 'gas-p1': P1, 'gas-v1': V1, 'gas-t1': T1, 'gas-p2': P2, 'gas-v2': V2, 'gas-t2': T2 } = vals;

    // P1V1/T1 = P2V2/T2  →  resultado
    let resposta, label, unidade, eq;

    try {
        switch (incognita) {
            case 'gas-p1':
                resposta = (P2 * V2 * T1) / (T2 * V1);
                label = 'P₁'; unidade = 'atm';
                eq = `P₁ = P₂·V₂·T₁ / (T₂·V₁) = ${P2}·${V2}·${T1} / (${T2}·${V1})`;
                break;
            case 'gas-v1':
                resposta = (P2 * V2 * T1) / (T2 * P1);
                label = 'V₁'; unidade = 'L';
                eq = `V₁ = P₂·V₂·T₁ / (T₂·P₁) = ${P2}·${V2}·${T1} / (${T2}·${P1})`;
                break;
            case 'gas-t1':
                resposta = (P1 * V1 * T2) / (P2 * V2);
                label = 'T₁'; unidade = 'K';
                eq = `T₁ = P₁·V₁·T₂ / (P₂·V₂) = ${P1}·${V1}·${T2} / (${P2}·${V2})`;
                break;
            case 'gas-p2':
                resposta = (P1 * V1 * T2) / (T1 * V2);
                label = 'P₂'; unidade = 'atm';
                eq = `P₂ = P₁·V₁·T₂ / (T₁·V₂) = ${P1}·${V1}·${T2} / (${T1}·${V2})`;
                break;
            case 'gas-v2':
                resposta = (P1 * V1 * T2) / (T1 * P2);
                label = 'V₂'; unidade = 'L';
                eq = `V₂ = P₁·V₁·T₂ / (T₁·P₂) = ${P1}·${V1}·${T2} / (${T1}·${P2})`;
                break;
            case 'gas-t2':
                resposta = (P2 * V2 * T1) / (P1 * V1);
                label = 'T₂'; unidade = 'K';
                eq = `T₂ = P₂·V₂·T₁ / (P₁·V₁) = ${P2}·${V2}·${T1} / (${P1}·${V1})`;
                break;
        }

        if (!isFinite(resposta) || resposta <= 0) {
            resultLabel.textContent = 'Erro';
            resultVal.textContent = '—';
            resultEq.textContent = 'Valores inválidos (divisão por zero ou resultado negativo).';
        } else {
            resultLabel.textContent = label + ' =';
            resultVal.textContent = `${resposta.toFixed(3)} ${unidade}`;
            resultEq.textContent = eq;

            // Atualizar balões: usar V1 e V2 se disponíveis
            const bV1 = vals['gas-v1'] ?? resposta;
            const bV2 = vals['gas-v2'] ?? resposta;
            desenharBaloes(bV1, bV2);
        }
        resultBox.style.display = 'block';

    } catch (e) {
        resultLabel.textContent = 'Erro';
        resultVal.textContent = '—';
        resultEq.textContent = 'Verifique os valores inseridos.';
        resultBox.style.display = 'block';
    }
}

function limparGases() {
    ['gas-p1','gas-v1','gas-t1','gas-p2','gas-v2','gas-t2'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('gas-result-box').style.display = 'none';
    desenharBaloes(5, 8);
}

// ════════════════════════════════════════════════════════════════════════════
// TRIGONOMETRIA — GRÁFICO INTERATIVO + TABELA
// ════════════════════════════════════════════════════════════════════════════

let trigState = {
    func: 'sen',      // 'sen' | 'cos'
    a: 1,             // deslocamento vertical
    b: 1,             // amplitude
    c: 1,             // coeficiente do x (frequência)
    d: 0,             // deslocamento horizontal (em graus)
    angulo: 45,       // ângulo do ponto marcado (graus)
    mode: 'grafico'   // 'grafico' | 'tabela'
};

const TRIG_TABLE_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];
const TRIG_EXACT = {
    0:   { sen: '0',        cos: '1',        tan: '0' },
    30:  { sen: '½',        cos: '√3/2',     tan: '√3/3' },
    45:  { sen: '√2/2',     cos: '√2/2',     tan: '1' },
    60:  { sen: '√3/2',     cos: '½',        tan: '√3' },
    90:  { sen: '1',        cos: '0',        tan: '∞' },
    120: { sen: '√3/2',     cos: '-½',       tan: '-√3' },
    135: { sen: '√2/2',     cos: '-√2/2',    tan: '-1' },
    150: { sen: '½',        cos: '-√3/2',    tan: '-√3/3' },
    180: { sen: '0',        cos: '-1',       tan: '0' },
    210: { sen: '-½',       cos: '-√3/2',    tan: '√3/3' },
    225: { sen: '-√2/2',    cos: '-√2/2',    tan: '1' },
    240: { sen: '-√3/2',    cos: '-½',       tan: '√3' },
    270: { sen: '-1',       cos: '0',        tan: '∞' },
    300: { sen: '-√3/2',    cos: '½',        tan: '-√3' },
    315: { sen: '-√2/2',    cos: '√2/2',     tan: '-1' },
    330: { sen: '-½',       cos: '√3/2',     tan: '-√3/3' },
    360: { sen: '0',        cos: '1',        tan: '0' },
};

function trigF(xDeg) {
    const { func, a, b, c, d } = trigState;
    const rad = ((c * xDeg + d) * Math.PI) / 180;
    return a + b * (func === 'sen' ? Math.sin(rad) : Math.cos(rad));
}

function atualizarTrigonometria() {
    // Ler controles
    const s = trigState;
    s.func   = document.getElementById('trig-func')?.value  ?? s.func;
    s.a      = parseFloat(document.getElementById('trig-a')?.value  ?? s.a);
    s.b      = parseFloat(document.getElementById('trig-b')?.value  ?? s.b);
    s.c      = parseFloat(document.getElementById('trig-c')?.value  ?? s.c);
    s.d      = parseFloat(document.getElementById('trig-d')?.value  ?? s.d);
    s.angulo = parseFloat(document.getElementById('trig-angulo')?.value ?? s.angulo);

    // Atualizar displays
    document.getElementById('trig-val-a').textContent = s.a % 1 === 0 ? s.a : s.a.toFixed(1);
    document.getElementById('trig-val-b').textContent = s.b % 1 === 0 ? s.b : s.b.toFixed(1);
    document.getElementById('trig-val-c').textContent = s.c % 1 === 0 ? s.c : s.c.toFixed(1);
    document.getElementById('trig-val-d').textContent = s.d + '°';
    document.getElementById('trig-val-angulo').textContent = s.angulo + '°';

    // Período e amplitude
    const periodo = 360 / Math.abs(s.c);
    const amp = Math.abs(s.b);
    document.getElementById('trig-periodo').textContent = periodo % 1 === 0 ? periodo + '°' : periodo.toFixed(1) + '°';
    document.getElementById('trig-amplitude').textContent = amp % 1 === 0 ? amp : amp.toFixed(2);
    document.getElementById('trig-maximo').textContent   = (s.a + amp) % 1 === 0 ? (s.a + amp) : (s.a + amp).toFixed(2);
    document.getElementById('trig-minimo').textContent   = (s.a - amp) % 1 === 0 ? (s.a - amp) : (s.a - amp).toFixed(2);

    // Valor no ponto
    const yPonto = trigF(s.angulo);
    document.getElementById('trig-val-ponto').textContent = yPonto.toFixed(4);

    // Fórmula dinâmica
    const funcName = s.func;
    const fmtA = s.a === 0 ? '' : (s.a > 0 ? `${s.a} + ` : `${s.a} + `);
    const fmtB = s.b === 1 ? '' : (s.b === -1 ? '-' : `${s.b}·`);
    const fmtC = s.c === 1 ? '' : `${s.c}`;
    const fmtD = s.d === 0 ? '' : (s.d > 0 ? ` + ${s.d}°` : ` - ${Math.abs(s.d)}°`);
    document.getElementById('trig-formula').textContent = `f(x) = ${fmtA}${fmtB}${funcName}(${fmtC}x${fmtD})`;

    desenharGraficoTrig();
    atualizarTabelaTrig();
}

function desenharGraficoTrig() {
    const canvas = document.getElementById('canvas-trig');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Fundo
    ctx.fillStyle = 'rgba(5, 5, 15, 0.95)';
    ctx.fillRect(0, 0, W, H);

    const PAD_L = 44, PAD_R = 20, PAD_T = 20, PAD_B = 30;
    const graphW = W - PAD_L - PAD_R;
    const graphH = H - PAD_T - PAD_B;

    // Domínio visível: 0 a 720°
    const xMin = 0, xMax = 720;
    const { a, b } = trigState;
    const amp = Math.abs(b);
    const yMax = a + amp + 0.5;
    const yMin = a - amp - 0.5;

    function toCanvasX(deg) { return PAD_L + ((deg - xMin) / (xMax - xMin)) * graphW; }
    function toCanvasY(val) { return PAD_T + ((yMax - val) / (yMax - yMin)) * graphH; }

    // Grade
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let deg = 0; deg <= xMax; deg += 90) {
        const px = toCanvasX(deg);
        ctx.beginPath(); ctx.moveTo(px, PAD_T); ctx.lineTo(px, PAD_T + graphH); ctx.stroke();
    }
    const yStep = amp > 0 ? amp : 1;
    for (let yv = Math.ceil(yMin); yv <= Math.floor(yMax); yv += (yStep >= 2 ? Math.ceil(yStep) : 1)) {
        const py = toCanvasY(yv);
        if (py < PAD_T || py > PAD_T + graphH) continue;
        ctx.beginPath(); ctx.moveTo(PAD_L, py); ctx.lineTo(PAD_L + graphW, py); ctx.stroke();
    }

    // Eixo X (y=0 ou y=a se a≠0)
    const yAxisX = toCanvasY(0);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    if (yAxisX >= PAD_T && yAxisX <= PAD_T + graphH) {
        ctx.beginPath(); ctx.moveTo(PAD_L, yAxisX); ctx.lineTo(PAD_L + graphW, yAxisX); ctx.stroke();
    }

    // Eixo Y
    ctx.beginPath(); ctx.moveTo(PAD_L, PAD_T); ctx.lineTo(PAD_L, PAD_T + graphH); ctx.stroke();

    // Rótulos X
    ctx.fillStyle = 'rgba(180,160,255,0.8)';
    ctx.font = '10px Outfit';
    ctx.textAlign = 'center';
    [0, 90, 180, 270, 360, 450, 540, 630, 720].forEach(deg => {
        const px = toCanvasX(deg);
        ctx.fillText(deg + '°', px, PAD_T + graphH + 18);
    });

    // Rótulos Y
    ctx.textAlign = 'right';
    for (let yv = Math.ceil(yMin); yv <= Math.floor(yMax + 0.01); yv++) {
        const py = toCanvasY(yv);
        if (py < PAD_T || py > PAD_T + graphH) continue;
        ctx.fillText(yv, PAD_L - 6, py + 4);
    }

    // Curva principal
    const grad = ctx.createLinearGradient(PAD_L, 0, PAD_L + graphW, 0);
    grad.addColorStop(0, '#a855f7');
    grad.addColorStop(0.5, '#c084fc');
    grad.addColorStop(1, '#818cf8');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    let first = true;
    for (let px = 0; px <= graphW; px++) {
        const deg = xMin + (px / graphW) * (xMax - xMin);
        const yv = trigF(deg);
        const cx2 = PAD_L + px;
        const cy2 = toCanvasY(yv);
        if (first) { ctx.moveTo(cx2, cy2); first = false; }
        else ctx.lineTo(cx2, cy2);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Ponto marcado
    const angulo = trigState.angulo;
    const yPonto = trigF(angulo);
    if (angulo >= xMin && angulo <= xMax) {
        const px = toCanvasX(angulo);
        const py = toCanvasY(yPonto);

        // Linhas tracejadas de referência
        ctx.strokeStyle = 'rgba(0,229,160,0.45)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, PAD_T + graphH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(PAD_L, py); ctx.stroke();
        ctx.setLineDash([]);

        // Ponto
        ctx.fillStyle = '#00e5a0';
        ctx.shadowColor = '#00e5a0';
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Rótulo do ponto
        ctx.fillStyle = '#00e5a0';
        ctx.font = 'bold 11px Outfit';
        ctx.textAlign = px > W - 80 ? 'right' : 'left';
        ctx.fillText(`(${angulo}°, ${yPonto.toFixed(3)})`, px + (px > W - 80 ? -8 : 8), py - 8);
    }
}

function atualizarTabelaTrig() {
    const tbody = document.getElementById('trig-tabela-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    TRIG_TABLE_ANGLES.forEach(ang => {
        const exact = TRIG_EXACT[ang] ?? {};
        const rad = (ang * Math.PI) / 180;

        const senEx = exact.sen ?? Math.sin(rad).toFixed(3);
        const cosEx = exact.cos ?? Math.cos(rad).toFixed(3);
        const tanEx = exact.tan ?? (Math.abs(Math.tan(rad)) > 999 ? '∞' : Math.tan(rad).toFixed(3));

        const isSelected = ang === trigState.angulo;
        const tr = document.createElement('tr');
        tr.className = isSelected ? 'trig-row-selected' : '';
        tr.innerHTML = `
            <td>${ang}°</td>
            <td>${senEx}</td>
            <td>${cosEx}</td>
            <td>${tanEx}</td>
        `;
        tbody.appendChild(tr);
    });
}

function switchTrigMode(mode) {
    trigState.mode = mode;
    document.getElementById('trig-panel-grafico').style.display = mode === 'grafico' ? 'block' : 'none';
    document.getElementById('trig-panel-tabela').style.display  = mode === 'tabela'  ? 'block' : 'none';
    document.querySelectorAll('.trig-mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.trig-mode-btn[data-mode="${mode}"]`)?.classList.add('active');
    if (mode === 'grafico') setTimeout(desenharGraficoTrig, 50);
}

// ────────────────────────────────────────────────────────────────────────────
// ANÁLISE COMBINATÓRIA
// ────────────────────────────────────────────────────────────────────────────

function fatorial(n) {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
}

function calcularCombinatoria() {
    const n = parseInt(document.getElementById('input-n').value);
    const k = parseInt(document.getElementById('input-k').value);
    if (k > n) { alert('K não pode ser maior que N!'); return; }
    document.getElementById('result-comb').textContent = Math.round(fatorial(n) / (fatorial(k) * fatorial(n - k)));
    document.getElementById('result-arr').textContent  = Math.round(fatorial(n) / fatorial(n - k));
    document.getElementById('result-perm').textContent = Math.round(fatorial(n));
}

// ────────────────────────────────────────────────────────────────────────────
// PROBABILIDADE
// ────────────────────────────────────────────────────────────────────────────

let frequenciasDados = [0,0,0,0,0,0];
let frequenciasMoeda = [0,0];

function simularDados() {
    const valor = Math.floor(Math.random() * 6) + 1;
    frequenciasDados[valor - 1]++;
    desenharGraficoProbabilidade();
}
function simularMoeda() {
    frequenciasMoeda[Math.floor(Math.random() * 2)]++;
    desenharGraficoProbabilidade();
}
function desenharGraficoProbabilidade() {
    const canvas = document.getElementById('canvas-prob');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(5,5,8,0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let dados = frequenciasDados.some(x => x > 0) ? frequenciasDados : frequenciasMoeda;
    const maxFreq = Math.max(...dados, 1);
    const barWidth = canvas.width / dados.length;
    const padding = 20;
    const graphHeight = canvas.height - 2 * padding;
    dados.forEach((freq, idx) => {
        const barHeight = (freq / maxFreq) * graphHeight;
        const x = idx * barWidth + barWidth / 4;
        const y = canvas.height - barHeight - padding;
        ctx.fillStyle = `rgba(138,43,226,0.7)`;
        ctx.fillRect(x, y, barWidth / 2, barHeight);
        ctx.fillStyle = '#aaa';
        ctx.font = '10px Outfit';
        ctx.fillText(freq, x + barWidth / 4 - 5, canvas.height - 5);
    });
}

// ────────────────────────────────────────────────────────────────────────────
// CINEMÁTICA
// ────────────────────────────────────────────────────────────────────────────

function atualizarCinematica() {
    const angulo = parseFloat(document.getElementById('slider-angulo-lan').value);
    const vel = parseFloat(document.getElementById('slider-vel').value);
    document.getElementById('val-angulo-lan').textContent = angulo + '°';
    document.getElementById('val-vel').textContent = vel + ' m/s';
    const rad = (angulo * Math.PI) / 180;
    const hmax = (vel * vel * Math.sin(rad) ** 2) / (2 * g);
    const alcance = (vel * vel * Math.sin(2 * rad)) / g;
    document.getElementById('result-hmax').textContent = hmax.toFixed(2) + ' m';
    document.getElementById('result-alcance').textContent = alcance.toFixed(2) + ' m';
    desenharProjetil(angulo, vel, hmax, alcance);
}
function simularLancamento() { atualizarCinematica(); }
function desenharProjetil(angulo, vel, hmax, alcance) {
    const canvas = document.getElementById('canvas-cine');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(5,5,8,0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const escalaX = (canvas.width - 40) / Math.max(alcance, 100);
    const escalaY = (canvas.height - 40) / Math.max(hmax, 50);
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, canvas.height - 30); ctx.lineTo(canvas.width - 20, canvas.height - 30); ctx.stroke();
    ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2;
    ctx.beginPath();
    const rad = (angulo * Math.PI) / 180;
    for (let t = 0; t <= 20; t += 0.05) {
        const x = vel * Math.cos(rad) * t;
        const y = vel * Math.sin(rad) * t - 0.5 * g * t * t;
        const px = 20 + x * escalaX;
        const py = canvas.height - 30 - y * escalaY;
        if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        if (y < 0) break;
    }
    ctx.stroke();
    ctx.fillStyle = '#00e5a0';
    ctx.beginPath(); ctx.arc(20, canvas.height - 30, 4, 0, Math.PI * 2); ctx.fill();
}

// ────────────────────────────────────────────────────────────────────────────
// ENERGIA
// ────────────────────────────────────────────────────────────────────────────

function atualizarEnergia() {
    const m = parseFloat(document.getElementById('slider-massa').value);
    const v = parseFloat(document.getElementById('slider-vel-en').value);
    const h = parseFloat(document.getElementById('slider-altura').value);
    document.getElementById('val-massa').textContent = m + ' kg';
    document.getElementById('val-vel-en').textContent = v + ' m/s';
    document.getElementById('val-altura').textContent = h + ' m';
    document.getElementById('result-ec').textContent = (0.5 * m * v * v).toFixed(1) + ' J';
    document.getElementById('result-ep').textContent = (m * g * h).toFixed(1) + ' J';
    document.getElementById('result-etotal').textContent = (0.5 * m * v * v + m * g * h).toFixed(1) + ' J';
}

// ────────────────────────────────────────────────────────────────────────────
// ONDAS
// ────────────────────────────────────────────────────────────────────────────

function atualizarOndas() {
    const amp = parseFloat(document.getElementById('slider-amp').value);
    const freq = parseFloat(document.getElementById('slider-freq').value);
    document.getElementById('val-amp').textContent = amp;
    document.getElementById('val-freq').textContent = freq + ' Hz';
    document.getElementById('result-lambda').textContent = (300 / freq).toFixed(0) + ' px';
    document.getElementById('result-periodo').textContent = (1 / freq).toFixed(2);
    const canvas = document.getElementById('canvas-ondas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(5,5,8,0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const centerY = canvas.height / 2;
    ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x++) {
        const y = centerY + amp * Math.sin((x / (300 / freq)) * Math.PI * 2);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(canvas.width, centerY); ctx.stroke();
}

// ────────────────────────────────────────────────────────────────────────────
// ÓPTICA
// ────────────────────────────────────────────────────────────────────────────

function atualizarOptica() {
    const thetaI = parseFloat(document.getElementById('slider-ang-inci').value);
    const n2 = parseFloat(document.getElementById('slider-n2').value);
    document.getElementById('val-ang-inci').textContent = thetaI + '°';
    document.getElementById('val-n2').textContent = n2.toFixed(1);
    const radI = (thetaI * Math.PI) / 180;
    const senThetaR = Math.sin(radI) / n2;
    const thetaR = (Math.asin(Math.min(senThetaR, 1)) * 180) / Math.PI;
    document.getElementById('result-ang-refr').textContent = thetaR.toFixed(1) + '°';
    desenharRefracao(thetaI, thetaR);
}
function desenharRefracao(thetaI, thetaR) {
    const canvas = document.getElementById('canvas-optica');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(5,5,8,0.8)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const cx = canvas.width / 2, cy = canvas.height / 2, rayLen = 100;
    ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(canvas.width, cy); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.setLineDash([5,5]);
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height); ctx.stroke();
    ctx.setLineDash([]);
    const radI = (thetaI * Math.PI) / 180;
    ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + rayLen * Math.sin(radI), cy - rayLen * Math.cos(radI)); ctx.stroke();
    const radR = (thetaR * Math.PI) / 180;
    ctx.strokeStyle = '#00e5a0';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + rayLen * Math.sin(radR), cy + rayLen * Math.cos(radR)); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
}

// ────────────────────────────────────────────────────────────────────────────
// ELETRICIDADE
// ────────────────────────────────────────────────────────────────────────────

function atualizarEletricidade() {
    const V = parseFloat(document.getElementById('slider-tensao').value);
    const Res = parseFloat(document.getElementById('slider-resist').value);
    document.getElementById('val-tensao').textContent = V + ' V';
    document.getElementById('val-resist').textContent = Res + ' Ω';
    const I = V / Res;
    document.getElementById('result-corrente').textContent = I.toFixed(2) + ' A';
    document.getElementById('result-potencia').textContent = (V * I).toFixed(1) + ' W';
}

// ────────────────────────────────────────────────────────────────────────────
// INICIALIZAR
// ────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Gases: desenhar balões iniciais
    desenharBaloes(5, 8);
    document.getElementById('gas-result-box').style.display = 'none';

    // Trig: inicializar
    atualizarTrigonometria();

    calcularCombinatoria();
    atualizarEnergia();
    atualizarOndas();
    atualizarOptica();
    atualizarEletricidade();
});
