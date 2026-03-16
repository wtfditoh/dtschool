import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Usa email (corrigido)
const userEmail = localStorage.getItem('dt_user_email');

// --- ESTADO ---
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

// --- HELPERS ---
const pad = n => String(n).padStart(2, '0');

const formatarTempo = (minutos) => {
    if (minutos < 60) return `${minutos}m`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const getHojeStr = () => new Date().toISOString().split('T')[0];

// --- TROCA DE VIEW ---
window.trocarView = (view) => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.querySelectorAll('.tab-btn')[view === 'timer' ? 0 : 1].classList.add('active');
    if (view === 'historico') carregarHistorico();
};

// --- CARREGAR MATÉRIAS ---
async function carregarMaterias() {
    const chips = document.getElementById('chips-materias');
    let materias = ['Geral'];

    try {
        // Tenta pegar do Firebase
        if (userEmail) {
            const snap = await getDoc(doc(db, "notas", userEmail));
            if (snap.exists() && snap.data().materias) {
                const lista = snap.data().materias.map(m => m.nome);
                materias = ['Geral', ...lista];
            }
        }
        // Fallback pro localStorage
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

// --- CONTROLES DE TEMPO ---
const getH = () => parseInt(document.getElementById('h-val').innerText);
const getM = () => parseInt(document.getElementById('m-val').innerText);

const atualizarXPPreview = () => {
    const totalMin = getH() * 60 + getM();
    document.getElementById('xp-num').innerText = Math.max(5, Math.floor(totalMin / 25 * 10));
    // Atualiza o flip clock no setup
    document.getElementById('flip-h').innerText = pad(getH());
    document.getElementById('flip-m').innerText = pad(getM());
    document.getElementById('flip-s').innerText = '00';
};

document.getElementById('h-up').onclick = () => {
    const v = getH(); if (v < 12) document.getElementById('h-val').innerText = v + 1; atualizarXPPreview();
};
document.getElementById('h-down').onclick = () => {
    const v = getH(); if (v > 0) document.getElementById('h-val').innerText = v - 1; atualizarXPPreview();
};
document.getElementById('m-up').onclick = () => {
    const v = getM(); if (v < 55) document.getElementById('m-val').innerText = v + 5; else document.getElementById('m-val').innerText = 0; atualizarXPPreview();
};
document.getElementById('m-down').onclick = () => {
    const v = getM(); if (v >= 5) document.getElementById('m-val').innerText = v - 5; atualizarXPPreview();
};

// --- INICIAR ---
document.getElementById('btn-start').onclick = () => {
    const h = getH(), m = getM();
    if (h === 0 && m === 0) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    segsRestantes = h * 3600 + m * 60;
    totalSegs = segsRestantes;
    sessionActive = true;

    // UI
    document.getElementById('setup-controls').style.display = 'none';
    document.getElementById('progress-wrap').style.display = 'flex';
    document.getElementById('btn-start').style.display = 'none';
    document.getElementById('btn-pause').style.display = 'block';
    document.getElementById('btn-quit').style.display = 'block';
    document.getElementById('xp-tag').style.display = 'none';
    document.getElementById('materia-ativa-label').innerText = materiaSelecionada.toUpperCase();

    // Desabilita chips
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

    // Flip clock com animação
    const flipH = document.getElementById('flip-h');
    const flipM = document.getElementById('flip-m');
    const flipS = document.getElementById('flip-s');

    flipS.classList.add('tick');
    setTimeout(() => flipS.classList.remove('tick'), 100);

    if (s === 59) { flipM.classList.add('tick'); setTimeout(() => flipM.classList.remove('tick'), 100); }
    if (m === 59 && s === 59) { flipH.classList.add('tick'); setTimeout(() => flipH.classList.remove('tick'), 100); }

    flipH.innerText = pad(h);
    flipM.innerText = pad(m);
    flipS.innerText = pad(s);

    // Barra de progresso
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
    // XP pela metade se desistir
    const segsFeitos = totalSegs - segsRestantes;
    const xp = Math.floor((segsFeitos / 60 / 25) * 10 / 2);
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

    if (userEmail && completa) {
        try {
            const hoje = getHojeStr();
            const sessao = {
                materia: materiaSelecionada,
                minutos: minutos,
                data: hoje,
                timestamp: Date.now()
            };

            // Atualiza XP e histórico no Firebase
            await setDoc(doc(db, "notas", userEmail), {
                xp: increment(xp),
                historico_foco: arrayUnion(sessao)
            }, { merge: true });

        } catch(e) { console.error(e); }
    }

    location.reload();
};

// --- CARREGAR HISTÓRICO ---
async function carregarHistorico() {
    if (!userEmail) return;

    try {
        const snap = await getDoc(doc(db, "notas", userEmail));
        if (!snap.exists()) return;

        const historico = snap.data().historico_foco || [];
        const hoje = getHojeStr();

        // Stats gerais
        const totalMin = historico.reduce((a, s) => a + s.minutos, 0);
        const hojeMin = historico.filter(s => s.data === hoje).reduce((a, s) => a + s.minutos, 0);
        const sessoesCompletas = historico.length;

        // Streak
        let streak = 0;
        const diasUnicos = [...new Set(historico.map(s => s.data))].sort().reverse();
        let diaCheck = new Date(hoje);
        for (const dia of diasUnicos) {
            const diaStr = diaCheck.toISOString().split('T')[0];
            if (dia === diaStr) { streak++; diaCheck.setDate(diaCheck.getDate() - 1); }
            else break;
        }

        // Atualiza stats
        document.getElementById('stat-hoje').innerText = Math.floor(hojeMin / 60) + 'h';
        document.getElementById('stat-hoje-min').innerText = hojeMin % 60 > 0 ? `${hojeMin % 60}min a mais` : 'hoje';
        document.getElementById('stat-total').innerText = Math.floor(totalMin / 60) + 'h';
        document.getElementById('stat-total-min').innerText = `${totalMin % 60}min no total`;
        document.getElementById('stat-sessoes').innerText = sessoesCompletas;
        document.getElementById('stat-streak').innerText = streak;

        // Por matéria
        const porMateria = {};
        historico.forEach(s => {
            if (!porMateria[s.materia]) porMateria[s.materia] = 0;
            porMateria[s.materia] += s.minutos;
        });

        const maxMin = Math.max(...Object.values(porMateria), 1);
        const listaMaterias = document.getElementById('lista-por-materia');

        if (Object.keys(porMateria).length === 0) {
            listaMaterias.innerHTML = '<div class="empty-state"><p>Nenhuma sessão ainda</p></div>';
        } else {
            listaMaterias.innerHTML = Object.entries(porMateria)
                .sort((a, b) => b[1] - a[1])
                .map(([nome, min]) => `
                    <div class="materia-bar-item">
                        <div class="materia-bar-header">
                            <span class="materia-bar-nome">${nome}</span>
                            <span class="materia-bar-tempo">${formatarTempo(min)}</span>
                        </div>
                        <div class="materia-bar-track">
                            <div class="materia-bar-fill" style="width:${(min/maxMin)*100}%"></div>
                        </div>
                    </div>
                `).join('');
        }

        // Sessões recentes
        const listaSessoes = document.getElementById('lista-sessoes');
        const recentes = [...historico].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

        if (recentes.length === 0) {
            listaSessoes.innerHTML = '<div class="empty-state"><p>Complete sua primeira sessão!</p></div>';
        } else {
            listaSessoes.innerHTML = recentes.map(s => {
                const data = new Date(s.timestamp);
                const dataStr = data.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
                const hora = data.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
                return `
                    <div class="sessao-item">
                        <div class="sessao-dot"></div>
                        <div class="sessao-info">
                            <div class="sessao-materia">${s.materia}</div>
                            <div class="sessao-data">${dataStr} às ${hora}</div>
                        </div>
                        <div class="sessao-duracao">${formatarTempo(s.minutos)}</div>
                    </div>
                `;
            }).join('');
        }

    } catch(e) { console.error(e); }
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    carregarMaterias();
    atualizarXPPreview();
    if (window.lucide) lucide.createIcons();
});
    
