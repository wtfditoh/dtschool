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
const circumference = 130 * 2 * Math.PI;

const updateCircle = (percent) => {
    const offset = circumference - (percent / 100 * circumference);
    circle.style.strokeDashoffset = offset;
};

// FUNÇÃO DE XP QUE AGORA FUNCIONA
const updateXPPreview = () => {
    const h = parseInt(document.getElementById('h-val').innerText);
    const m = parseInt(document.getElementById('m-val').innerText);
    const totalMin = (h * 60) + m;
    // 10 XP a cada 25 min
    const xp = Math.floor((totalMin / 25) * 10);
    document.getElementById('xp-num').innerText = xp;
};

const start = () => {
    const h = parseInt(document.getElementById('h-val').innerText);
    const m = parseInt(document.getElementById('m-val').innerText);
    if(h === 0 && m === 0) return;

    segs = (h * 3600) + (m * 60);
    total = segs;
    updateCircle(100);

    document.getElementById('setup-view').style.display = 'none';
    document.getElementById('btn-start').style.display = 'none';
    document.getElementById('active-clock').style.display = 'block';
    document.getElementById('btn-pause').style.display = 'block';
    document.getElementById('btn-quit').style.display = 'block';

    timer = setInterval(() => {
        if (!isPaused) {
            segs--;
            const hrs = Math.floor(segs / 3600);
            const mins = Math.floor((segs % 3600) / 60);
            const s = segs % 60;
            document.getElementById('main-time').innerText = 
                `${hrs > 0 ? hrs + ':' : ''}${mins < 10 ? '0'+mins : mins}:${s < 10 ? '0'+s : s}`;
            updateCircle((segs / total) * 100);
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

// Eventos de Ajuste
document.getElementById('h-up').onclick = () => { let v = parseInt(document.getElementById('h-val').innerText); if(v<12) v++; document.getElementById('h-val').innerText = v < 10 ? '0'+v : v; updateXPPreview(); };
document.getElementById('h-down').onclick = () => { let v = parseInt(document.getElementById('h-val').innerText); if(v>0) v--; document.getElementById('h-val').innerText = v < 10 ? '0'+v : v; updateXPPreview(); };
document.getElementById('m-up').onclick = () => { let v = parseInt(document.getElementById('m-val').innerText); if(v<55) v+=5; document.getElementById('m-val').innerText = v < 10 ? '0'+v : v; updateXPPreview(); };
document.getElementById('m-down').onclick = () => { let v = parseInt(document.getElementById('m-val').innerText); if(v>0) v-=5; document.getElementById('m-val').innerText = v < 10 ? '0'+v : v; updateXPPreview(); };

// Botões de Ação
document.getElementById('btn-start').onclick = start;
document.getElementById('btn-pause').onclick = () => {
    isPaused = !isPaused;
    document.getElementById('btn-pause').innerText = isPaused ? "RETOMAR" : "PAUSAR";
};
document.getElementById('btn-quit').onclick = () => window.location.reload();
document.getElementById('back-nav').onclick = () => window.history.back();

// Inicialização
updateXPPreview();
lucide.createIcons();
