import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { verificarConquistas, mostrarPopupConquista } from "./conquistas.js";

const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const userEmail = localStorage.getItem('dt_user_email');

/* ═══════════════ ESTADO ═══════════════ */
let timer = null;
let targetTime = 0;         // timestamp alvo pra corrigir drift
let segsRestantes = 0;
let totalSegs = 0;
let isPaused = false;
let materiaSelecionada = "Geral";
let sessionActive = false;
let modoAtual = 'timer';

let livreSegs = 0;
let livreTimer = null;
let livreTargetTime = 0;

/* ═══════════════ CONFIG SALVA ═══════════════ */
const CFG_KEY = 'hb_foco_cfg';
const cfg = Object.assign({
    relogio: 'flip',        // flip | digital | minimal
    som: 'tick',            // tick | click | wood | bip | silencioso
    somFinal: 'alarme'      // alarme | suave | silencioso
}, JSON.parse(localStorage.getItem(CFG_KEY) || '{}'));

function salvarCfg() {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

/* ═══════════════ ÁUDIO ═══════════════ */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function tocarSom(tipo) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    if (tipo === 'tick') {
        // Tick suave — onda senoidal baixa
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, t);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.07);

    } else if (tipo === 'click') {
        // Click curto e seco — square wave altinho
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(850, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.025);

    } else if (tipo === 'wood') {
        // Madeira / metrônomo — ruído branco curtinho
        const bufferSize = audioCtx.sampleRate * 0.02;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
        }
        const src = audioCtx.createBufferSource();
        src.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.35, t);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        src.start(t);

    } else if (tipo === 'bip') {
        // Bip digital — onda triangular aguda
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.04);
    }
}

function playTick() {
    if (cfg.som === 'silencioso') return;
    tocarSom(cfg.som);
}

function tocarSomFinal() {
    if (cfg.somFinal === 'silencioso') return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    if (cfg.somFinal === 'alarme') {
        // 3 bips fortes
        for (let i = 0; i < 3; i++) {
            const start = t + i * 0.4;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, start);
            gain.gain.setValueAtTime(0.3, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(start);
            osc.stop(start + 0.25);
        }
    } else if (cfg.somFinal === 'suave') {
        // Sino suave
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.4);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 1.2);
    }
}

/* ═══════════════ HELPERS ═══════════════ */
const pad = n => String(n).padStart(2, '0');
const formatarTempo = (min) => {
    if (min < 60) return min + 'm';
    const h = Math.floor(min / 60), m = min % 60;
    return m > 0 ? h + 'h ' + m + 'm' : h + 'h';
};
const getHojeStr = () => new Date().toISOString().split('T')[0];

/* ═══════════════ RELÓGIO (3 estilos) ═══════════════ */
let prevH = '00', prevM = '25', prevS = '00';

function flipCard(unit, newVal) {
    const flap = document.getElementById('flap-' + unit);
    const flapTxt = document.getElementById('flap-' + unit + '-txt');
    const topCur = document.getElementById('top-' + unit + '-cur');
    const botCur = document.getElementById('bot-' + unit + '-cur');
    flapTxt.innerText = topCur.innerText;
    flap.classList.remove('flipping');
    void flap.offsetWidth;
    flap.classList.add('flipping');
    setTimeout(() => { topCur.innerText = newVal; botCur.innerText = newVal; flapTxt.innerText = newVal; }, 200);
    setTimeout(() => { flap.classList.remove('flipping'); }, 400);
}

function atualizarFlip(h, m, s) {
    const hStr = pad(h), mStr = pad(m), sStr = pad(s);
    if (hStr !== prevH) { flipCard('h', hStr); prevH = hStr; }
    if (mStr !== prevM) { flipCard('m', mStr); prevM = mStr; }
    if (sStr !== prevS) { flipCard('s', sStr); prevS = sStr; }
}

function atualizarDigital(h, m, s) {
    document.getElementById('dig-h').innerText = pad(h);
    document.getElementById('dig-m').innerText = pad(m);
    document.getElementById('dig-s').innerText = pad(s);
}

function atualizarMinimal(h, m, s) {
    document.getElementById('min-h').innerText = pad(h);
    document.getElementById('min-m').innerText = pad(m);
    document.getElementById('min-s').innerText = pad(s);
}

function atualizarRelogio(h, m, s) {
    atualizarFlip(h, m, s);
    atualizarDigital(h, m, s);
    atualizarMinimal(h, m, s);
}

function setFlipStatic(h, m, s) {
    const hStr = pad(h), mStr = pad(m), sStr = pad(s);
    ['h','m','s'].forEach((u, i) => {
        const val = [hStr, mStr, sStr][i];
        const topEl = document.getElementById('top-' + u + '-cur');
        const botEl = document.getElementById('bot-' + u + '-cur');
        const flapEl = document.getElementById('flap-' + u + '-txt');
        if (topEl) topEl.innerText = val;
        if (botEl) botEl.innerText = val;
        if (flapEl) flapEl.innerText = val;
    });
    prevH = hStr; prevM = mStr; prevS = sStr;
}

function setRelogioStatic(h, m, s) {
    setFlipStatic(h, m, s);
    atualizarDigital(h, m, s);
    atualizarMinimal(h, m, s);
}

/* ═══════════════ APLICAR ESTILO DO RELÓGIO ═══════════════ */
function aplicarEstiloRelogio() {
    const wrap = document.getElementById('clock-wrap');
    if (wrap) wrap.dataset.estilo = cfg.relogio;
}

/* ═══════════════ MODO SELECTOR ═══════════════ */
window.selecionarModo = (modo) => {
    if (sessionActive) return;
    modoAtual = modo;
    document.getElementById('modo-btn-timer').classList.toggle('active', modo === 'timer');
    document.getElementById('modo-btn-livre').classList.toggle('active', modo === 'livre');
    document.getElementById('setup-controls').style.display = modo === 'timer' ? 'block' : 'none';
    document.getElementById('livre-info').style.display = modo === 'livre' ? 'block' : 'none';
    document.getElementById('xp-tag').style.display = modo === 'timer' ? 'block' : 'none';
    if (modo === 'livre') {
        setRelogioStatic(0, 0, 0);
    } else {
        atualizarSetup();
    }
};

/* ═══════════════ TROCA DE VIEW ═══════════════ */
window.trocarView = (view) => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.querySelectorAll('.tab-btn')[view === 'timer' ? 0 : 1].classList.add('active');
    if (view === 'historico') carregarHistorico();
};

/* ═══════════════ MATÉRIAS ═══════════════ */
async function carregarMaterias() {
    const chips = document.getElementById('chips-materias');
    let materias = ['Geral'];
    try {
        if (userEmail) {
            const snap = await getDoc(doc(db, "notas", userEmail));
            if (snap.exists() && snap.data().materias) {
                materias = ['Geral', ...snap.data().materias.map(m => m.nome)];
            }
        }
        const local = JSON.parse(localStorage.getItem('materias') || '[]');
        if (local.length > 0 && materias.length === 1) {
            materias = ['Geral', ...local.map(m => m.nome)];
        }
    } catch(e) {}

    chips.innerHTML = materias.map(m => `
        <div class="chip-materia ${m === 'Geral' ? 'selected' : ''}" data-materia="${m}" onclick="selecionarMateria('${m}')">${m}</div>
    `).join('');
}

window.selecionarMateria = (nome) => {
    if (sessionActive) return;
    materiaSelecionada = nome;
    document.querySelectorAll('.chip-materia').forEach(c => {
        c.classList.toggle('selected', c.dataset.materia === nome);
    });
};

/* ═══════════════ AJUSTE DE TEMPO ═══════════════ */
const getH = () => parseInt(document.getElementById('h-val').innerText);
const getM = () => parseInt(document.getElementById('m-val').innerText);

const atualizarSetup = () => {
    document.getElementById('xp-num').innerText = Math.max(5, Math.floor((getH() * 60 + getM()) / 25 * 10));
    setRelogioStatic(getH(), getM(), 0);
};

document.getElementById('h-up').onclick   = () => { const v = getH(); if(v < 12) document.getElementById('h-val').innerText = v + 1; atualizarSetup(); };
document.getElementById('h-down').onclick  = () => { const v = getH(); if(v > 0)  document.getElementById('h-val').innerText = v - 1; atualizarSetup(); };
document.getElementById('m-up').onclick   = () => { const v = getM(); document.getElementById('m-val').innerText = v < 55 ? v + 5 : 0; atualizarSetup(); };
document.getElementById('m-down').onclick  = () => { const v = getM(); if(v >= 5) document.getElementById('m-val').innerText = v - 5; atualizarSetup(); };

/* ═══════════════════════════════════════════════════ */
/* TIMER PRECISO — corrige drift baseado no alvo real */
/* ═══════════════════════════════════════════════════ */
function tick() {
    if (isPaused) return;
    const agora = Date.now();
    segsRestantes = Math.max(0, Math.round((targetTime - agora) / 1000));

    const h = Math.floor(segsRestantes / 3600);
    const m = Math.floor((segsRestantes % 3600) / 60);
    const s = segsRestantes % 60;

    // Só toca o som quando o SEGUNDO muda de fato
    if (s !== parseInt(prevS, 10)) playTick();

    atualizarRelogio(h, m, s);

    const pct = totalSegs > 0 ? Math.round(((totalSegs - segsRestantes) / totalSegs) * 100) : 0;
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progresso-pct').innerText = pct + '%';

    if (segsRestantes <= 0) {
        tocarSomFinal();
        finalizarSessao(true, Math.floor(totalSegs / 60));
    }
}

/* ═══════════════ INICIAR TIMER ═══════════════ */
document.getElementById('btn-start').onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (modoAtual === 'livre') {
        iniciarModoLivre();
        return;
    }

    const h = getH(), m = getM();
    if (h === 0 && m === 0) return;

    segsRestantes = h * 3600 + m * 60;
    totalSegs = segsRestantes;
    targetTime = Date.now() + segsRestantes * 1000;
    sessionActive = true;
    document.body.classList.add('session-active');

    document.getElementById('setup-controls').style.display = 'none';
    document.getElementById('modo-selector').style.display = 'none';
    document.getElementById('progress-wrap').style.display = 'flex';
    document.getElementById('btn-start').style.display = 'none';
    document.getElementById('btn-pause').style.display = 'block';
    document.getElementById('btn-quit').style.display = 'block';
    document.getElementById('xp-tag').style.display = 'none';
    document.getElementById('materia-ativa-label').innerText = materiaSelecionada.toUpperCase();
    document.querySelectorAll('.chip-materia').forEach(c => c.style.opacity = '0.3');

    // Intervalo curto de 250ms mas recalcula sempre pelo alvo → sem drift
    timer = setInterval(tick, 250);
};

/* ═══════════════ MODO LIVRE ═══════════════ */
function iniciarModoLivre() {
    livreSegs = 0;
    livreTargetTime = Date.now();
    sessionActive = true;
    document.body.classList.add('session-active');

    document.getElementById('livre-info').style.display = 'none';
    document.getElementById('modo-selector').style.display = 'none';
    document.getElementById('livre-progress-wrap').style.display = 'flex';
    document.getElementById('btn-start').style.display = 'none';
    document.getElementById('btn-pause').style.display = 'block';
    document.getElementById('btn-parar-livre').style.display = 'block';
    document.getElementById('btn-quit').style.display = 'block';
    document.getElementById('livre-materia-label').innerText = materiaSelecionada.toUpperCase();
    document.querySelectorAll('.chip-materia').forEach(c => c.style.opacity = '0.3');

    livreTimer = setInterval(tickLivre, 250);
}

function tickLivre() {
    if (isPaused) return;
    livreSegs = Math.round((Date.now() - livreTargetTime) / 1000);

    const h = Math.floor(livreSegs / 3600);
    const m = Math.floor((livreSegs % 3600) / 60);
    const s = livreSegs % 60;

    if (s !== parseInt(prevS, 10)) playTick();

    atualizarRelogio(h, m, s);

    const minutos = Math.floor(livreSegs / 60);
    const xpAcum = Math.floor(minutos / 25 * 10);
    document.getElementById('livre-xp-badge').innerText = '+' + xpAcum + ' XP acumulado';
}

document.getElementById('btn-parar-livre').onclick = async () => {
    clearInterval(livreTimer);
    const minutos = Math.floor(livreSegs / 60);
    if (minutos < 1) {
        alert('Você precisa estudar pelo menos 1 minuto!');
        livreTimer = setInterval(tickLivre, 250);
        return;
    }
    tocarSomFinal();
    await finalizarSessao(true, minutos);
};

/* ═══════════════ PAUSAR ═══════════════ */
document.getElementById('btn-pause').onclick = () => {
    isPaused = !isPaused;
    document.getElementById('btn-pause').innerText = isPaused ? 'RETOMAR' : 'PAUSAR';

    // Ajusta o alvo pra não perder tempo parado
    if (isPaused) {
        // nada — os ticks vão ignorar, e ao retomar recalcula
    } else {
        targetTime = Date.now() + segsRestantes * 1000;
        livreTargetTime = Date.now() - livreSegs * 1000;
    }
};

/* ═══════════════ DESISTIR ═══════════════ */
document.getElementById('btn-quit').onclick = () => {
    isPaused = true;
    document.getElementById('modal-confirm').style.display = 'flex';
};
document.getElementById('btn-keep-going').onclick = () => {
    isPaused = false;
    // Retoma de onde parou
    targetTime = Date.now() + segsRestantes * 1000;
    livreTargetTime = Date.now() - livreSegs * 1000;
    document.getElementById('modal-confirm').style.display = 'none';
};
document.getElementById('btn-really-quit').onclick = async () => {
    clearInterval(timer);
    clearInterval(livreTimer);
    const segsFeitos = modoAtual === 'livre' ? livreSegs : (totalSegs - segsRestantes);
    const xp = Math.floor((segsFeitos / 60) / 25 * 10 / 2);
    if (xp > 0 && userEmail) {
        try { await updateDoc(doc(db, "notas", userEmail), { xp: increment(xp) }); } catch(e) {}
    }
    location.reload();
};

/* ═══════════════ FINALIZAR ═══════════════ */
const finalizarSessao = async (completa, minutosParam) => {
    clearInterval(timer);
    clearInterval(livreTimer);
    const minutos = minutosParam || Math.floor(totalSegs / 60);
    const xp = Math.floor(minutos / 25 * 10);
    let temNovas = false;

    if (userEmail && completa) {
        try {
            const hoje = getHojeStr();
            await setDoc(doc(db, "notas", userEmail), {
                xp: increment(xp),
                historico_foco: arrayUnion({
                    materia: materiaSelecionada,
                    minutos: minutos,
                    data: hoje,
                    timestamp: Date.now(),
                    modo: modoAtual
                })
            }, { merge: true });

            const snap = await getDoc(doc(db, "notas", userEmail));
            if (snap.exists()) {
                const dados = { ...snap.data(), _sessaoAgora: true };
                const novas = await verificarConquistas(userEmail, dados);
                if (novas.length > 0) {
                    temNovas = true;
                    mostrarPopupConquista(novas);
                }
            }
        } catch(e) { console.error(e); }
    }

    setTimeout(() => location.reload(), temNovas ? 4000 : 800);
};

/* ═══════════════ HISTÓRICO ═══════════════ */
async function carregarHistorico() {
    if (!userEmail) return;
    try {
        const snap = await getDoc(doc(db, "notas", userEmail));
        if (!snap.exists()) return;
        const historico = snap.data().historico_foco || [];
        const hoje = getHojeStr();

        const totalMin = historico.reduce((a, s) => a + (s.minutos || 0), 0);
        const hojeMin  = historico.filter(s => s.data === hoje).reduce((a, s) => a + (s.minutos || 0), 0);

        let streak = 0;
        const dias = [...new Set(historico.map(s => s.data))].sort().reverse();
        let dCheck = new Date(hoje);
        for (const d of dias) {
            if (d === dCheck.toISOString().split('T')[0]) { streak++; dCheck.setDate(dCheck.getDate() - 1); }
            else break;
        }

        document.getElementById('stat-hoje').innerText     = Math.floor(hojeMin / 60) + 'h';
        document.getElementById('stat-hoje-min').innerText = (hojeMin % 60) + 'min';
        document.getElementById('stat-total').innerText    = Math.floor(totalMin / 60) + 'h';
        document.getElementById('stat-total-min').innerText = (totalMin % 60) + 'min';
        document.getElementById('stat-sessoes').innerText  = historico.length;
        document.getElementById('stat-streak').innerText   = streak;

        const porMateria = {};
        historico.forEach(s => { porMateria[s.materia] = (porMateria[s.materia] || 0) + (s.minutos || 0); });
        const maxMin = Math.max(...Object.values(porMateria), 1);

        document.getElementById('lista-por-materia').innerHTML = Object.keys(porMateria).length === 0
            ? '<div class="empty-state"><p>Nenhuma sessão ainda</p></div>'
            : Object.entries(porMateria).sort((a,b) => b[1]-a[1]).map(([nome, min]) => `
                <div class="materia-bar-item">
                    <div class="materia-bar-header">
                        <span class="materia-bar-nome">${nome}</span>
                        <span class="materia-bar-tempo">${formatarTempo(min)}</span>
                    </div>
                    <div class="materia-bar-track">
                        <div class="materia-bar-fill" style="width:${(min/maxMin)*100}%"></div>
                    </div>
                </div>`).join('');

        const recentes = [...historico].sort((a,b) => b.timestamp - a.timestamp).slice(0, 10);
        document.getElementById('lista-sessoes').innerHTML = recentes.length === 0
            ? '<div class="empty-state"><p>Complete sua primeira sessão!</p></div>'
            : recentes.map(s => {
                const d = new Date(s.timestamp);
                const modoLabel = s.modo === 'livre' ? '∞' : '';
                return `<div class="sessao-item">
                    <div class="sessao-dot"></div>
                    <div class="sessao-info">
                        <div class="sessao-materia">${s.materia} ${modoLabel}</div>
                        <div class="sessao-data">${d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} às ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    <div class="sessao-duracao">${formatarTempo(s.minutos)}</div>
                </div>`;
            }).join('');

    } catch(e) { console.error(e); }
}

/* ═══════════════ MODAL DE SETTINGS ═══════════════ */
function abrirSettings() {
    document.getElementById('modal-settings').style.display = 'flex';
    marcarOpcoes();
}
function fecharSettings() {
    document.getElementById('modal-settings').style.display = 'none';
}
function marcarOpcoes() {
    document.querySelectorAll('#opcoes-relogio [data-relogio]').forEach(b => {
        b.classList.toggle('on', b.dataset.relogio === cfg.relogio);
    });
    document.querySelectorAll('#opcoes-som [data-som]').forEach(b => {
        b.classList.toggle('on', b.dataset.som === cfg.som);
    });
    document.querySelectorAll('#opcoes-final [data-final]').forEach(b => {
        b.classList.toggle('on', b.dataset.final === cfg.somFinal);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const btnSet = document.getElementById('btn-settings');
    if (btnSet) btnSet.addEventListener('click', abrirSettings);

    const btnX = document.getElementById('settings-x');
    if (btnX) btnX.addEventListener('click', fecharSettings);

    const btnOk = document.getElementById('settings-ok');
    if (btnOk) btnOk.addEventListener('click', fecharSettings);

    const modalSet = document.getElementById('modal-settings');
    if (modalSet) modalSet.addEventListener('click', (e) => {
        if (e.target === modalSet) fecharSettings();
    });

    // Cliques nas opções
    document.querySelectorAll('#opcoes-relogio [data-relogio]').forEach(b => {
        b.addEventListener('click', () => {
            cfg.relogio = b.dataset.relogio;
            salvarCfg();
            aplicarEstiloRelogio();
            marcarOpcoes();
        });
    });
    document.querySelectorAll('#opcoes-som [data-som]').forEach(b => {
        b.addEventListener('click', () => {
            cfg.som = b.dataset.som;
            salvarCfg();
            marcarOpcoes();
            // Preview do som ao escolher (menos se for silencioso)
            if (cfg.som !== 'silencioso') tocarSom(cfg.som);
        });
    });
    document.querySelectorAll('#opcoes-final [data-final]').forEach(b => {
        b.addEventListener('click', () => {
            cfg.somFinal = b.dataset.final;
            salvarCfg();
            marcarOpcoes();
        });
    });
});

/* ═══════════════ PRÉ-PREENCHIMENTO (Agenda → Foco) ═══════════════ */
function aplicarPrefillAgenda() {
    let bruto = null;
    try { bruto = localStorage.getItem('hb_foco_prefill'); localStorage.removeItem('hb_foco_prefill'); } catch (e) {}
    if (!bruto) return;
    let p;
    try { p = JSON.parse(bruto); } catch (e) { return; }
    if (!p || (p.ts && Date.now() - p.ts > 10 * 60 * 1000)) return;

    const materia = String(p.materia || 'Geral');
    if (![...document.querySelectorAll('.chip-materia')].some(c => c.dataset.materia === materia)) {
        const chip = document.createElement('div');
        chip.className = 'chip-materia';
        chip.dataset.materia = materia;
        chip.textContent = materia;
        chip.onclick = () => window.selecionarMateria(materia);
        document.getElementById('chips-materias').appendChild(chip);
    }
    window.selecionarMateria(materia);

    let min = Math.round((parseInt(p.minutos) || 25) / 5) * 5;
    min = Math.max(5, Math.min(min, 12 * 60));
    document.getElementById('h-val').innerText = Math.floor(min / 60);
    document.getElementById('m-val').innerText = min % 60;
    atualizarSetup();

    if (p.tarefaNome) {
        const tag = document.createElement('div');
        tag.textContent = '🎯 ' + p.tarefaNome;
        tag.style.cssText = 'text-align:center;font-size:13px;font-weight:700;color:#c084fc;background:rgba(138,43,226,0.12);border:1px solid rgba(138,43,226,0.3);border-radius:14px;padding:10px 14px;margin:0 16px 12px;word-break:break-word;';
        const chips = document.getElementById('chips-materias');
        chips.parentNode.insertBefore(tag, chips);
    }
}

/* ═══════════════ INIT ═══════════════ */
document.addEventListener('DOMContentLoaded', () => {
    aplicarEstiloRelogio();
    carregarMaterias().then(aplicarPrefillAgenda);
    atualizarSetup();
    if (window.lucide) lucide.createIcons();
});
