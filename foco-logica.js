import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const userPhone = localStorage.getItem('dt_user_phone');

let timer;
let segs = 0;
let totalOriginal = 0;
let isPaused = false;

// Seleção de Elementos
const setupUI = document.getElementById('setup-ui');
const clockActive = document.getElementById('clock-active');
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnQuit = document.getElementById('btn-quit');
const modalQuit = document.getElementById('modal-quit');

// FUNÇÕES DE AÇÃO
const iniciar = () => {
    const h = parseInt(document.getElementById('h-val').innerText);
    const m = parseInt(document.getElementById('m-val').innerText);
    if (h === 0 && m === 0) return alert("Defina um tempo!");

    segs = (h * 3600) + (m * 60);
    totalOriginal = segs;

    setupUI.style.display = 'none';
    btnStart.style.display = 'none';
    clockActive.style.display = 'flex';
    btnPause.style.display = 'block';
    btnQuit.style.display = 'block';

    timer = setInterval(() => {
        if (!isPaused) {
            segs--;
            renderTime();
            if (segs <= 0) finalizar(true);
        }
    }, 1000);
};

const renderTime = () => {
    const h = Math.floor(segs / 3600);
    const m = Math.floor((segs % 3600) / 60);
    const s = segs % 60;
    document.getElementById('main-time').innerText = `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}`;
    document.getElementById('seconds-tiny').innerText = s < 10 ? '0' + s : s;
};

const pausar = () => {
    isPaused = !isPaused;
    btnPause.innerText = isPaused ? "RETOMAR" : "PAUSAR";
};

const finalizar = async (concluiu) => {
    clearInterval(timer);
    const minPassados = (totalOriginal - segs) / 60;
    let xp = Math.floor((minPassados / 25) * 10);
    if (!concluiu) xp = Math.floor(xp / 2);

    if (xp > 0 && userPhone) {
        try {
            await updateDoc(doc(db, "notas", userPhone), { xp: increment(xp) });
        } catch (e) { console.error(e); }
    }
    window.location.reload();
};

// Event Listeners (Garante que os botões funcionem)
if (btnStart) btnStart.onclick = iniciar;
if (btnPause) btnPause.onclick = pausar;
if (btnQuit) btnQuit.onclick = () => modalQuit.style.display = 'flex';
document.getElementById('btn-voltar').onclick = () => modalQuit.style.display = 'none';
document.getElementById('btn-confirm-exit').onclick = () => finalizar(false);
