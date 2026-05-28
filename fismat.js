/* ═══════════════════════════════════════════════════════════════════════════
   FÍSICA E MATEMÁTICA - SIMULAÇÕES E CÁLCULOS
   Hub Brain Edition
   ═══════════════════════════════════════════════════════════════════════════ */

const R = 8.314; // Constante dos gases (J/(mol·K))
const g = 9.8; // Gravidade (m/s²)

// ────────────────────────────────────────────────────────────────────────────
// GASES - PV = nRT
// ────────────────────────────────────────────────────────────────────────────

function atualizarGases() {
    const T = parseFloat(document.getElementById('slider-temp').value);
    const V = parseFloat(document.getElementById('slider-vol').value);
    const n = parseFloat(document.getElementById('slider-mol').value);

    // Atualiza valores
    document.getElementById('val-temp').textContent = T + ' K';
    document.getElementById('val-vol').textContent = V + ' L';
    document.getElementById('val-mol').textContent = n.toFixed(1) + ' mol';

    // Calcula pressão: P = nRT/V (em kPa)
    const P = (n * R * T) / (V * 0.001) / 1000; // Converte para kPa
    document.getElementById('result-pressao').textContent = P.toFixed(1) + ' kPa';

    // Desenha simulação
    desenharGases(T, V, n);
}

function desenharGases(T, V, n) {
    const canvas = document.getElementById('canvas-gases');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(5, 5, 8, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha container
    const padding = 40;
    const w = canvas.width - 2 * padding;
    const h = canvas.height - 2 * padding;
    
    ctx.strokeStyle = 'rgba(138, 43, 226, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, padding, w, h);

    // Desenha partículas
    const numParticulas = Math.min(30, Math.round(n * 10));
    const velocidade = Math.sqrt(T / 50); // Maior T = mais rápido

    ctx.fillStyle = 'rgba(192, 132, 252, 0.6)';
    
    for (let i = 0; i < numParticulas; i++) {
        const x = padding + Math.random() * w;
        const y = padding + Math.random() * h;
        const raio = 3 + velocidade;
        
        ctx.beginPath();
        ctx.arc(x, y, raio, 0, Math.PI * 2);
        ctx.fill();
    }

    // Texto
    ctx.fillStyle = '#aaa';
    ctx.font = '12px Outfit';
    ctx.fillText(`P ≈ ${((n * R * T) / (V * 0.001) / 1000).toFixed(1)} kPa`, padding + 10, canvas.height - 10);
}

// ────────────────────────────────────────────────────────────────────────────
// TRIGONOMETRIA - CÍRCULO UNITÁRIO
// ────────────────────────────────────────────────────────────────────────────

function atualizarTrigonometria() {
    const angulo = parseFloat(document.getElementById('slider-angulo').value);
    const rad = (angulo * Math.PI) / 180;

    document.getElementById('val-angulo').textContent = angulo + '°';
    document.getElementById('result-sen').textContent = Math.sin(rad).toFixed(3);
    document.getElementById('result-cos').textContent = Math.cos(rad).toFixed(3);
    document.getElementById('result-tan').textContent = Math.tan(rad).toFixed(3);

    desenharCirculoUnitario(angulo, rad);
}

function desenharCirculoUnitario(angulo, rad) {
    const canvas = document.getElementById('canvas-trig');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const raio = 100;

    // Fundo
    ctx.fillStyle = 'rgba(5, 5, 8, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Eixos
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(canvas.width, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, canvas.height);
    ctx.stroke();

    // Círculo
    ctx.strokeStyle = 'rgba(138, 43, 226, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, raio, 0, Math.PI * 2);
    ctx.stroke();

    // Ponto no círculo
    const x = cx + raio * Math.cos(rad);
    const y = cy - raio * Math.sin(rad);

    // Linhas de referência
    ctx.strokeStyle = 'rgba(0, 229, 160, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, cy);
    ctx.stroke();

    // Ponto
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Textos
    ctx.fillStyle = '#aaa';
    ctx.font = '11px Outfit';
    ctx.fillText('cos', cx + 60, cy + 20);
    ctx.fillText('sen', cx - 20, cy - 80);
    ctx.fillText(angulo + '°', x - 20, y - 20);
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

    if (k > n) {
        alert('K não pode ser maior que N!');
        return;
    }

    // Combinação: C(n,k) = n! / (k!(n-k)!)
    const comb = fatorial(n) / (fatorial(k) * fatorial(n - k));

    // Arranjo: A(n,k) = n! / (n-k)!
    const arr = fatorial(n) / fatorial(n - k);

    // Permutação: P(n) = n!
    const perm = fatorial(n);

    document.getElementById('result-comb').textContent = Math.round(comb);
    document.getElementById('result-arr').textContent = Math.round(arr);
    document.getElementById('result-perm').textContent = Math.round(perm);
}

// ────────────────────────────────────────────────────────────────────────────
// PROBABILIDADE
// ────────────────────────────────────────────────────────────────────────────

let frequenciasDados = [0, 0, 0, 0, 0, 0];
let frequenciasMoeda = [0, 0];

function simularDados() {
    const valor = Math.floor(Math.random() * 6) + 1;
    frequenciasDados[valor - 1]++;
    desenharGraficoProbabilidade();
}

function simularMoeda() {
    const valor = Math.floor(Math.random() * 2);
    frequenciasMoeda[valor]++;
    desenharGraficoProbabilidade();
}

function desenharGraficoProbabilidade() {
    const canvas = document.getElementById('canvas-prob');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(5, 5, 8, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Usa dados se houver, senão moeda
    let dados = frequenciasDados.some(x => x > 0) ? frequenciasDados : frequenciasMoeda;
    const maxFreq = Math.max(...dados, 1);
    const barWidth = canvas.width / dados.length;
    const padding = 20;
    const graphHeight = canvas.height - 2 * padding;

    // Desenha barras
    dados.forEach((freq, idx) => {
        const barHeight = (freq / maxFreq) * graphHeight;
        const x = idx * barWidth + barWidth / 4;
        const y = canvas.height - barHeight - padding;

        ctx.fillStyle = `rgba(138, 43, 226, 0.7)`;
        ctx.fillRect(x, y, barWidth / 2, barHeight);

        // Labels
        ctx.fillStyle = '#aaa';
        ctx.font = '10px Outfit';
        ctx.fillText(freq, x + barWidth / 4 - 5, canvas.height - 5);
    });
}

// ────────────────────────────────────────────────────────────────────────────
// CINEMÁTICA - LANÇAMENTO DE PROJÉTIL
// ────────────────────────────────────────────────────────────────────────────

function atualizarCinematica() {
    const angulo = parseFloat(document.getElementById('slider-angulo-lan').value);
    const vel = parseFloat(document.getElementById('slider-vel').value);

    document.getElementById('val-angulo-lan').textContent = angulo + '°';
    document.getElementById('val-vel').textContent = vel + ' m/s';

    const rad = (angulo * Math.PI) / 180;
    const hmax = (vel * vel * Math.sin(rad) * Math.sin(rad)) / (2 * g);
    const alcance = (vel * vel * Math.sin(2 * rad)) / g;
    const tempo = (2 * vel * Math.sin(rad)) / g;

    document.getElementById('result-hmax').textContent = hmax.toFixed(2) + ' m';
    document.getElementById('result-alcance').textContent = alcance.toFixed(2) + ' m';

    desenharProjetil(angulo, vel, hmax, alcance);
}

function simularLancamento() {
    atualizarCinematica();
}

function desenharProjetil(angulo, vel, hmax, alcance) {
    const canvas = document.getElementById('canvas-cine');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(5, 5, 8, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Escala
    const escalaX = (canvas.width - 40) / Math.max(alcance, 100);
    const escalaY = (canvas.height - 40) / Math.max(hmax, 50);
    const offsetY = 20;

    // Grade
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }

    // Eixo
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 30);
    ctx.lineTo(canvas.width - 20, canvas.height - 30);
    ctx.stroke();

    // Trajetória
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const rad = (angulo * Math.PI) / 180;
    for (let t = 0; t <= 0.1; t += 0.002) {
        const x = vel * Math.cos(rad) * t;
        const y = vel * Math.sin(rad) * t - 0.5 * g * t * t;
        const px = 20 + x * escalaX;
        const py = canvas.height - 30 - y * escalaY;
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        if (y < 0) break;
    }
    ctx.stroke();

    // Ponto de saída
    ctx.fillStyle = '#00e5a0';
    ctx.beginPath();
    ctx.arc(20, canvas.height - 30, 4, 0, Math.PI * 2);
    ctx.fill();
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

    const Ec = 0.5 * m * v * v;
    const Ep = m * g * h;
    const Etotal = Ec + Ep;

    document.getElementById('result-ec').textContent = Ec.toFixed(1) + ' J';
    document.getElementById('result-ep').textContent = Ep.toFixed(1) + ' J';
    document.getElementById('result-etotal').textContent = Etotal.toFixed(1) + ' J';
}

// ────────────────────────────────────────────────────────────────────────────
// ONDAS
// ────────────────────────────────────────────────────────────────────────────

function atualizarOndas() {
    const amp = parseFloat(document.getElementById('slider-amp').value);
    const freq = parseFloat(document.getElementById('slider-freq').value);

    document.getElementById('val-amp').textContent = amp;
    document.getElementById('val-freq').textContent = freq + ' Hz';

    const periodo = 1 / freq;
    const lambda = 300 / freq; // Comprimento de onda (escala)

    document.getElementById('result-lambda').textContent = lambda.toFixed(0) + ' px';
    document.getElementById('result-periodo').textContent = periodo.toFixed(2);

    desenharOndas(amp, freq);
}

function desenharOndas(amp, freq) {
    const canvas = document.getElementById('canvas-ondas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(5, 5, 8, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerY = canvas.height / 2;
    const wavelength = 300 / freq;

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    ctx.beginPath();

    for (let x = 0; x < canvas.width; x++) {
        const y = centerY + amp * Math.sin((x / wavelength) * Math.PI * 2);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Eixo
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
}

// ────────────────────────────────────────────────────────────────────────────
// ÓPTICA - LEI DE SNELL
// ────────────────────────────────────────────────────────────────────────────

function atualizarOptica() {
    const thetaI = parseFloat(document.getElementById('slider-ang-inci').value);
    const n2 = parseFloat(document.getElementById('slider-n2').value);
    const n1 = 1; // Ar

    document.getElementById('val-ang-inci').textContent = thetaI + '°';
    document.getElementById('val-n2').textContent = n2.toFixed(1);

    const radI = (thetaI * Math.PI) / 180;
    const senThetaR = (n1 * Math.sin(radI)) / n2;
    const thetaR = (Math.asin(Math.min(senThetaR, 1)) * 180) / Math.PI;

    document.getElementById('result-ang-refr').textContent = thetaR.toFixed(1) + '°';

    desenharRefricao(thetaI, thetaR);
}

function desenharRefricao(thetaI, thetaR) {
    const canvas = document.getElementById('canvas-optica');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(5, 5, 8, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const rayLen = 100;

    // Interface
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(canvas.width, cy);
    ctx.stroke();

    // Normal (linha tracejada)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Raio incidente
    const radI = (thetaI * Math.PI) / 180;
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + rayLen * Math.sin(radI), cy - rayLen * Math.cos(radI));
    ctx.stroke();

    // Raio refratado
    const radR = (thetaR * Math.PI) / 180;
    ctx.strokeStyle = '#00e5a0';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + rayLen * Math.sin(radR), cy + rayLen * Math.cos(radR));
    ctx.stroke();

    // Ponto
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
}

// ────────────────────────────────────────────────────────────────────────────
// ELETRICIDADE - LEI DE OHM
// ────────────────────────────────────────────────────────────────────────────

function atualizarEletricidade() {
    const V = parseFloat(document.getElementById('slider-tensao').value);
    const R = parseFloat(document.getElementById('slider-resist').value);

    document.getElementById('val-tensao').textContent = V + ' V';
    document.getElementById('val-resist').textContent = R + ' Ω';

    const I = V / R;
    const P = V * I;

    document.getElementById('result-corrente').textContent = I.toFixed(2) + ' A';
    document.getElementById('result-potencia').textContent = P.toFixed(1) + ' W';
}

// ────────────────────────────────────────────────────────────────────────────
// INICIALIZAR
// ────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    atualizarGases();
    atualizarTrigonometria();
    calcularCombinatoria();
    atualizarEnergia();
    atualizarOndas();
    atualizarOptica();
    atualizarEletricidade();
});
