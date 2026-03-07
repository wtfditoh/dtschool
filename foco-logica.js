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

let timer, segs=0, total=0, isPaused=false;

const setup = document.getElementById('setup-view');
const active = document.getElementById('active-timer');
const startBtn = document.getElementById('btn-start');
const pauseBtn = document.getElementById('btn-pause');
const quitBtn = document.getElementById('btn-quit');

const start = () => {
    const h = parseInt(document.getElementById('h-val').innerText);
    const m = parseInt(document.getElementById('m-val').innerText);
    if(h===0 && m===0) return;

    segs = (h*3600) + (m*60);
    total = segs;

    setup.style.display = 'none';
    startBtn.style.display = 'none';
    active.style.display = 'flex';
    pauseBtn.style.display = 'block';
    quitBtn.style.display = 'block';

    timer = setInterval(() => {
        if(!isPaused) {
            segs--;
            const hrs = Math.floor(segs / 3600);
            const min = Math.floor((segs % 3600) / 60);
            const s = segs % 60;
            document.getElementById('main-time').innerText = `${hrs>0?hrs+':':''}${min<10?'0'+min:min}`;
            document.getElementById('sec-time').innerText = s<10?'0'+s:s;
            if(segs<=0) finish(true);
        }
    }, 1000);
};

const finish = async (win) => {
    clearInterval(timer);
    const passed = (total - segs) / 60;
    let xp = Math.floor((passed/25)*10);
    if(!win) xp = Math.floor(xp/2);
    if(xp>0 && userPhone) await updateDoc(doc(db, "notas", userPhone), { xp: increment(xp) });
    window.location.reload();
};

// Eventos
startBtn.onclick = start;
pauseBtn.onclick = () => { isPaused = !isPaused; pauseBtn.innerText = isPaused ? "RETOMAR" : "PAUSAR"; };
quitBtn.onclick = () => document.getElementById('modal').style.display = 'flex';
document.getElementById('btn-resume').onclick = () => document.getElementById('modal').style.display = 'none';
document.getElementById('btn-confirm-quit').onclick = () => finish(false);
