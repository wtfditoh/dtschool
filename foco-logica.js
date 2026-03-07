import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { /* Sua Config Aqui */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const userPhone = localStorage.getItem('dt_user_phone');

let timer;
let segundosRestantes = 0;
let totalOriginal = 0;
let isPaused = false;

window.iniciarFoco = () => {
    const h = parseInt(document.getElementById('select-h').value);
    const m = parseInt(document.getElementById('select-m').value);
    
    segundosRestantes = (h * 3600) + (m * 60);
    totalOriginal = segundosRestantes;
    
    document.getElementById('setup-area').style.display = 'none';
    document.getElementById('active-area').style.display = 'block';
    document.getElementById('xp-target').innerText = Math.floor(((h * 60 + m) / 25) * 10);
    
    runTimer();
};

function runTimer() {
    timer = setInterval(() => {
        if(!isPaused) {
            segundosRestantes--;
            atualizarRelogio();
            if(segundosRestantes <= 0) finalizar(true);
        }
    }, 1000);
}

function atualizarRelogio() {
    const h = Math.floor(segundosRestantes / 3600);
    const m = Math.floor((segundosRestantes % 3600) / 60);
    const s = segundosRestantes % 60;
    document.getElementById('timer-display').innerText = 
        `${h > 0 ? h + ':' : ''}${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

window.togglePause = () => {
    isPaused = !isPaused;
    document.getElementById('btn-pause').innerText = isPaused ? "RETOMAR" : "PAUSAR";
};

window.abrirModal = () => document.getElementById('modal-exit').style.display = 'flex';
window.fecharModal = () => document.getElementById('modal-exit').style.display = 'none';

window.confirmarDesistencia = () => {
    fecharModal();
    finalizar(false);
};

async function finalizar(concluiu) {
    clearInterval(timer);
    const minPassados = (totalOriginal - segundosRestantes) / 60;
    let xp = Math.floor((minPassados / 25) * 10);
    if(!concluiu) xp = Math.floor(xp / 2);

    if(xp > 0 && userPhone) {
        await updateDoc(doc(db, "notas", userPhone), { xp: increment(xp) });
        alert(concluiu ? `Foco finalizado! +${xp} XP` : `Interrompido. +${xp} XP creditados.`);
    }
    location.reload(); // Reseta para a tela inicial
}
