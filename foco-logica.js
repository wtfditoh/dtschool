import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const userEmail = localStorage.getItem('dt_user_email');

let timer = null;
let segsRestantes = 0;
let totalSegs = 0;
let isPaused = false;
let materiaSelecionada = "Geral";
let sessionActive = false;

// --- SOM ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const playTick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
};

const pad = n => String(n).padStart(2, '0');
const formatarTempo = (min) => {
    if (min < 60) return min + 'm';
    const h = Math.floor(min / 60), m = min % 60;
    return m > 0 ? h + 'h ' + m + 'm' : h + 'h';
};
const getHojeStr = () => new Date().toISOString().split('T')[0];

// --- FLIP CLOCK ---
let prevH = '00', prevM = '25', prevS = '00';

const flipCard = (unit, newVal) => {
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
};

const atualizarFlip = (h, m, s) => {
    const hStr = pad(h), mStr = pad(m), sStr = pad(s);
    if (hStr !== prevH) { flipCard('h', hStr); prevH = hStr; }
    if (mStr !== prevM) { flipCard('m', mStr); prevM = mStr; }
    if (sStr !== prevS) { flipCard('s', sStr); prevS = sStr; }
};

const setFlipStatic = (h, m, s) => {
    const hStr = pad(h), mStr = pad(m), sStr = pad(s);
    ['h','m','s'].forEach((u, i) => {
        const val = [hStr, mStr, sStr][i];
        document.getElementById('top-' + u + '-cur').innerText = val;
        document.getElementById('bot-' + u + '-cur').innerText = val;
        document.getElementById('flap-' + u + '-txt').innerText = val;
    });
    prevH = hStr; prevM = mStr; prevS = sStr;
};

// --- TROCA DE VIEW ---
window.trocarView = (view) => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.querySelectorAll('.tab-btn')[view === 'timer' ? 0 : 1].classList.add('active');
    if (view === 'historico') carregarHistorico();
};

// --- MATÉRIAS ---
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

// --- CONTROLES ---
const getH = () => parseInt(document.getElementById('h-val').innerText);
const getM = () => parseInt(document.getElementById('m-val').innerText);

const atualizarSetup = () => {
    document.getElementById('xp-num').innerText = Math.max(5, Math.floor((getH() * 60 + getM()) / 25 * 10));
    setFlipStatic(getH(), getM(), 0);
};

document.getElementById('h-up').onclick   = () => { const v = getH(); if(v < 12) document.getElementById('h-val').innerText = v + 1; atualizarSetup(); };
document.getElementById('h-down').onclick  = () => { const v = getH(); if(v > 0)  document.getElementById('h-val').innerText = v - 1; atualizarSetup(); };
document.getElementById('m-up').onclick   = () => { const v = getM(); document.getElementById('m-val').innerText = v < 55 ? v + 5 : 0; atualizarSetup(); };
document.getElementById('m-down').onclick  = () => { const v = getM(); if(v >= 5) document.getElementById('m-val').innerText = v - 5; atualizarSetup(); };

// --- INICIAR ---
document.getElementById('btn-start').onclick = () => {
    const h = getH(), m = getM();
    if (h === 0 && m === 0) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    segsRestantes = h * 3600 + m * 60;
    totalSegs = segsRestantes;
    sessionActive = true;
    document.getElementById('setup-controls').style.display = 'none';
    document.getElementById('progress-wrap').style.display = 'flex';
    document.getElementById('btn-start').style.display = 'none';
    document.getElementById('btn-pause').style.display = 'block';
    document.getElementById('btn-quit').style.display = 'block';
    document.getElementById('xp-tag').style.display = 'none';
    document.getElementById('materia-ativa-label').innerText = materiaSelecionada.toUpperCase();
    document.querySelectorAll('.chip-materia').forEach(c => c.style.opacity = '0.3');
    timer = setInterval(tick, 1000);
};

const tick = () => {
    if (isPaused) return;
    segsRestantes--;
    playTick();
    const h = Math.floor(segsRestantes / 3600);
    const m = Math.floor((segsRestantes % 3600) / 60);
    const s = segsRestantes % 60;
    atualizarFlip(h, m, s);
    const pct = Math.round(((totalSegs - segsRestantes) / totalSegs) * 100);
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progresso-pct').innerText = pct + '%';
    if (segsRestantes <= 0) finalizarSessao(true);
};

// --- PAUSAR ---
document.getElementById('btn-pause').onclick = () => {
    isPaused = !isPaused;
    document.getElementById('btn-pause').innerText = isPaused ? 'RETOMAR' : 'PAUSAR';
};

// --- DESISTIR ---
document.getElementById('btn-quit').onclick = () => {
    isPaused = true;
    document.getElementById('modal-confirm').style.display = 'flex';
};
document.getElementById('btn-keep-going').onclick = () => {
    isPaused = false;
    document.getElementById('modal-confirm').style.display = 'none';
};
document.getElementById('btn-really-quit').onclick = async () => {
    clearInterval(timer);
    const xp = Math.floor(((totalSegs - segsRestantes) / 60 / 25) * 10 / 2);
    if (xp > 0 && userEmail) {
        try { await updateDoc(doc(db, "notas", userEmail), { xp: increment(xp) }); } catch(e) {}
    }
    location.reload();
};

// --- FINALIZAR ---
const finalizarSessao = async (completa) => {
    clearInterval(timer);
    const minutos = Math.floor(totalSegs / 60);
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
                    timestamp: Date.now()
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

    setTimeout(() => location.reload(), temNovas ? 4000 : 500);
};

// --- HISTÓRICO ---
async function carregarHistorico() {
    if (!userEmail) return;
    try {
        const snap = await getDoc(doc(db, "notas", userEmail));
        if (!snap.exists()) return;
        const historico = snap.data().historico_foco || [];
        const hoje = getHojeStr();

        const totalMin = historico.reduce((a, s) => a + s.minutos, 0);
        const hojeMin  = historico.filter(s => s.data === hoje).reduce((a, s) => a + s.minutos, 0);

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
        historico.forEach(s => { porMateria[s.materia] = (porMateria[s.materia] || 0) + s.minutos; });
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
                return `<div class="sessao-item">
                    <div class="sessao-dot"></div>
                    <div class="sessao-info">
                        <div class="sessao-materia">${s.materia}</div>
                        <div class="sessao-data">${d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} às ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    <div class="sessao-duracao">${formatarTempo(s.minutos)}</div>
                </div>`;
            }).join('');

    } catch(e) { console.error(e); }
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    carregarMaterias();
    atualizarSetup();
    if (window.lucide) lucide.createIcons();
});
