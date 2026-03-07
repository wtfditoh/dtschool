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
const circle = document.getElementById('circle-bar');
const radius = circle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;

circle.style.strokeDasharray = `${circumference} ${circumference}`;

const setProgress = (percent) => {
    const offset = circumference - (percent / 100 * circumference);
    circle.style.strokeDashoffset = offset;
};

const start = () => {
    const h = parseInt(document.getElementById('h-val').innerText);
    const m = parseInt(document.getElementById('m-val').innerText);
    if(h === 0 && m === 0) return;

    segs = (h * 3600) + (m * 60);
    total = segs;

    document.getElementById('setup-view').style.display = 'none';
    document.getElementById('btn-start').style.display = 'none';
    document.getElementById('active-clock').style.display = 'block';
    document.getElementById('btn-pause').style.display = 'block';
    document.getElementById('btn-quit').style.display = 'block';

    timer = setInterval(() => {
        if (!isPaused) {
            segs--;
            const mins = Math.floor(segs / 60);
            const s = segs % 60;
            document.getElementById('main-time').innerText = `${mins < 10 ? '0'+mins : mins}:${s < 10 ? '0'+s : s}`;
            
            setProgress((segs / total) * 100);

            if (segs <= 0) finish(true);
        }
    }, 1000);
};

const finish = async (win) => {
    clearInterval(timer);
    if (win && userPhone) {
        const xp = Math.floor((total/1500)*10);
        await updateDoc(doc(db, "notas", userPhone), { xp: increment(xp) });
    }
    window.location.reload();
};

// Eventos
document.getElementById('btn-start').onclick = start;
document.getElementById('h-up').onclick = () => { let v = parseInt(document.getElementById('h-val').innerText); v++; document.getElementById('h-val').innerText = v < 10 ? '0'+v : v; };
document.getElementById('h-down').onclick = () => { let v = parseInt(document.getElementById('h-val').innerText); if(v>0) v--; document.getElementById('h-val').innerText = v < 10 ? '0'+v : v; };
document.getElementById('m-up').onclick = () => { let v = parseInt(document.getElementById('m-val').innerText); if(v<55) v+=5; document.getElementById('m-val').innerText = v < 10 ? '0'+v : v; };
document.getElementById('m-down').onclick = () => { let v = parseInt(document.getElementById('m-val').innerText); if(v>0) v-=5; document.getElementById('m-val').innerText = v < 10 ? '0'+v : v; };

document.getElementById('btn-pause').onclick = () => {
    isPaused = !isPaused;
    document.getElementById('btn-pause').innerText = isPaused ? "RETOMAR" : "PAUSAR";
};

document.getElementById('btn-quit').onclick = () => document.getElementById('modal-quit').style.display = 'flex';
document.getElementById('btn-resume').onclick = () => document.getElementById('modal-quit').style.display = 'none';
document.getElementById('btn-confirm-quit').onclick = () => finish(false);
document.getElementById('back-nav').onclick = () => window.history.back();

lucide.createIcons();
