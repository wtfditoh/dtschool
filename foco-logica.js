import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
  authDomain: "dt-scho0l.firebaseapp.com",
  projectId: "dt-scho0l",
  storageBucket: "dt-scho0l.firebasestorage.app",
  messagingSenderId: "78578509391",
  appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a",
  measurementId: "G-F7TG23TBTL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const userPhone = localStorage.getItem('dt_user_phone');

let timer;
let h = 0, m = 25;
let segundosRestantes = 0;
let totalSegundosOriginais = 0;
let isRunning = false;

const hDisp = document.getElementById('h-display');
const mDisp = document.getElementById('m-display');
const xpVal = document.getElementById('xp-val');
const ring = document.getElementById('ring');
const btnStart = document.getElementById('btn-start');

window.ajustar = (tipo, val) => {
    if(isRunning) return;
    if(tipo === 'h') h = Math.max(0, Math.min(12, h + val));
    else {
        m += val;
        if(m < 0) m = 55; if(m > 55) m = 0;
    }
    if(h === 0 && m < 5) m = 5;
    atualizarUI();
};

function atualizarUI() {
    hDisp.innerText = h < 10 ? '0'+h : h;
    mDisp.innerText = m < 10 ? '0'+m : m;
    const totalMin = (h * 60) + m;
    xpVal.innerText = Math.floor((totalMin / 25) * 10);
}

window.toggleTimer = () => {
    if(!isRunning) {
        if(segundosRestantes === 0) {
            segundosRestantes = (h * 3600) + (m * 60);
            totalSegundosOriginais = segundosRestantes;
        }
        isRunning = true;
        btnStart.innerText = "PAUSAR";
        ring.style.display = "block";
        document.querySelectorAll('.btn-adj').forEach(b => b.style.visibility = 'hidden');
        
        timer = setInterval(() => {
            segundosRestantes--;
            renderTimer();
            if(segundosRestantes <= 0) finalizar(true);
        }, 1000);
    } else {
        clearInterval(timer);
        isRunning = false;
        btnStart.innerText = "RETOMAR";
        ring.style.display = "none";
    }
};

function renderTimer() {
    const hrs = Math.floor(segundosRestantes / 3600);
    const min = Math.floor((segundosRestantes % 3600) / 60);
    hDisp.innerText = hrs < 10 ? '0'+hrs : hrs;
    mDisp.innerText = min < 10 ? '0'+min : min;
}

window.handleReset = async () => {
    if(segundosRestantes > 0 && segundosRestantes < totalSegundosOriginais) {
        if(confirm("Desistir agora? Você ganhará apenas METADE do XP pelo tempo estudado.")) {
            await finalizar(false);
        }
    } else { resetState(); }
};

async function finalizar(concluiu) {
    clearInterval(timer);
    const segundosEstudados = totalSegundosOriginais - segundosRestantes;
    const minEstudados = segundosEstudados / 60;
    let xp = Math.floor((minEstudados / 25) * 10);

    if(!concluiu) xp = Math.floor(xp / 2);
    else if(minEstudados >= 60) xp += 5; // Bônus Persistência

    if(xp > 0 && userPhone) {
        try {
            await updateDoc(doc(db, "notas", userPhone), { xp: increment(xp) });
            alert(concluiu ? `🔥 FOCO TOTAL! +${xp} XP!` : `⚠️ Interrompido. +${xp} XP (Penalidade aplicada).`);
        } catch(e) { console.error(e); }
    }
    resetState();
}

function resetState() {
    clearInterval(timer);
    isRunning = false; segundosRestantes = 0; h = 0; m = 25;
    atualizarUI();
    ring.style.display = "none";
    btnStart.innerText = "INICIAR FOCO";
    document.querySelectorAll('.btn-adj').forEach(b => b.style.visibility = 'visible');
}
