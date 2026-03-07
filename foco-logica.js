import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// COLE SUA CONFIG AQUI
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

window.atualizarXP = () => {
    const h = parseInt(document.getElementById('h-pick').value);
    const m = parseInt(document.getElementById('m-pick').value);
    const xp = Math.floor(((h * 60 + m) / 25) * 10);
    document.getElementById('xp-preview-val').innerText = xp;
};

window.iniciarSessao = () => {
    const h = parseInt(document.getElementById('h-pick').value);
    const m = parseInt(document.getElementById('m-pick').value);
    if(h === 0 && m === 0) return alert("Escolha um tempo!");

    segs = (h * 3600) + (m * 60);
    totalOriginal = segs;

    document.getElementById('setup-ui').style.display = 'none';
    document.getElementById('timer-display').style.display = 'block';
    document.getElementById('btn-pause').style.display = 'block';
    document.getElementById('btn-exit').style.display = 'block';

    timer = setInterval(() => {
        if(!isPaused) {
            segs--;
            renderTime();
            if(segs <= 0) finalizar(true);
        }
    }, 1000);
};

function renderTime() {
    const hrs = Math.floor(segs / 3600);
    const min = Math.floor((segs % 3600) / 60);
    const scs = segs % 60;
    document.getElementById('timer-display').innerText = 
        `${hrs > 0 ? hrs+':' : ''}${min < 10 ? '0'+min : min}:${scs < 10 ? '0'+scs : scs}`;
}

window.pausarRetomar = () => {
    isPaused = !isPaused;
    document.getElementById('btn-pause').innerText = isPaused ? "RETOMAR" : "PAUSAR";
};

window.abrirModal = () => document.getElementById('modal-desistir').style.display = 'flex';
window.fecharModal = () => document.getElementById('modal-desistir').style.display = 'none';
window.desistirReal = () => { fecharModal(); finalizar(false); };

async function finalizar(concluiu) {
    clearInterval(timer);
    const minEstudados = (totalOriginal - segs) / 60;
    let xp = Math.floor((minEstudados / 25) * 10);
    if(!concluiu) xp = Math.floor(xp / 2);

    if(xp > 0 && userPhone) {
        try {
            await updateDoc(doc(db, "notas", userPhone), { xp: increment(xp) });
            alert(concluiu ? `Incrível! +${xp} XP ganhos!` : `Parou cedo, mas ganhou +${xp} XP.`);
        } catch(e) { console.error(e); }
    }
    window.location.reload();
}
