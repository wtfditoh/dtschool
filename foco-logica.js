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

let timer, segs = 0, total = 0, isPaused = false;

// Elementos
const setupView = document.getElementById('setup-view');
const clockActive = document.getElementById('active-clock');
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnQuit = document.getElementById('btn-quit');

const startFoco = () => {
    const h = parseInt(document.getElementById('h-val').innerText);
    const m = parseInt(document.getElementById('m-val').innerText);
    if(h === 0 && m === 0) return;

    segs = (h * 3600) + (m * 60);
    total = segs;

    setupView.style.display = 'none';
    btnStart.style.display = 'none';
    clockActive.style.display = 'flex';
    btnPause.style.display = 'block';
    btnQuit.style.display = 'block';

    timer = setInterval(() => {
        if (!isPaused) {
            segs--;
            render();
            if (segs <= 0) finalize(true);
        }
    }, 1000);
};

const render = () => {
    const hrs = Math.floor(segs / 3600);
    const min = Math.floor((segs % 3600) / 60);
    const s = segs % 60;
    document.getElementById('big-time').innerText = `${hrs > 0 ? hrs + ':' : ''}${min < 10 ? '0' + min : min}`;
    document.getElementById('small-sec').innerText = s < 10 ? '0' + s : s;
};

const finalize = async (done) => {
    clearInterval(timer);
    const passed = (total - segs) / 60;
    let xp = Math.floor((passed / 25) * 10);
    if (!done) xp = Math.floor(xp / 2);

    if (xp > 0 && userPhone) {
        try {
            await updateDoc(doc(db, "notas", userPhone), { xp: increment(xp) });
        } catch (e) { console.error(e); }
    }
    window.location.reload();
};

// Eventos de clique
btnStart.onclick = startFoco;
btnPause.onclick = () => {
    isPaused = !isPaused;
    btnPause.innerText = isPaused ? "RETOMAR" : "PAUSAR";
};
btnQuit.onclick = () => document.getElementById('modal-quit').style.display = 'flex';
document.getElementById('btn-confirm-quit').onclick = () => finalize(false);
