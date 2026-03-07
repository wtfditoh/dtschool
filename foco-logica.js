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

window.iniciar = () => {
    const h = parseInt(document.getElementById('h-val').innerText);
    const m = parseInt(document.getElementById('m-val').innerText);
    if(h === 0 && m === 0) return;

    segs = (h * 3600) + (m * 60);
    totalOriginal = segs;

    // UI Change
    document.getElementById('setup-ui').style.display = 'none';
    document.getElementById('btn-start').style.display = 'none';
    document.getElementById('timer-running').style.display = 'block';
    document.getElementById('btn-pause').style.display = 'block';
    document.getElementById('btn-exit').style.display = 'block';
    document.body.style.background = "#05020a"; // Fica mais escuro

    timer = setInterval(() => {
        if(!isPaused) {
            segs--;
            renderTime();
            if(segs <= 0) finalizar(true);
        }
    }, 1000);
};

function renderTime() {
    const h = Math.floor(segs / 3600);
    const m = Math.floor((segs % 3600) / 60);
    const s = segs % 60;
    document.getElementById('timer-running').innerText = 
        `${h > 0 ? h+':' : ''}${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

window.pausar = () => {
    isPaused = !isPaused;
    document.getElementById('btn-pause').innerText = isPaused ? "RETOMAR" : "PAUSAR";
};

window.abrirModal = () => document.getElementById('modal-quit').style.display = 'flex';
window.fecharModal = () => document.getElementById('modal-quit').style.display = 'none';
window.confirmarSair = () => { fecharModal(); finalizar(false); };

async function finalizar(concluiu) {
    clearInterval(timer);
    const minPassados = (totalOriginal - segs) / 60;
    let xp = Math.floor((minPassados / 25) * 10);
    if(!concluiu) xp = Math.floor(xp / 2);

    if(xp > 0 && userPhone) {
        try {
            await updateDoc(doc(db, "notas", userPhone), { xp: increment(xp) });
        } catch(e) { console.error(e); }
    }
    window.location.reload();
}
