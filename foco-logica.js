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

// --- SISTEMA DE SOM (Tick-Tack) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const playTick = () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, audioCtx.currentTime); 
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
};

// --- ATUALIZAR ESTIMATIVA DE XP ---
const updateXP = () => {
    const h = parseInt(document.getElementById('h-val').innerText);
    const m = parseInt(document.getElementById('m-val').innerText);
    const totalMin = (h * 60) + m;
    const xp = Math.floor(totalMin / 25 * 10);
    document.getElementById('xp-num').innerText = xp;
};

// --- LOGICA DO TIMER ---
document.getElementById('btn-start').onclick = () => {
    const h = parseInt(document.getElementById('h-val').innerText);
    const m = parseInt(document.getElementById('m-val').innerText);
    if(h === 0 && m === 0) return;

    if (audioCtx.state === 'suspended') audioCtx.resume();

    segs = (h * 3600) + (m * 60);
    total = segs;

    document.getElementById('setup-view').style.display = 'none';
    document.getElementById('active-clock').style.display = 'block';
    document.getElementById('btn-start').style.display = 'none';
    document.getElementById('btn-pause').style.display = 'block';
    document.getElementById('btn-quit').style.display = 'block';

    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = 0;

    timer = setInterval(() => {
        if(!isPaused){
            segs--;
            playTick();
            const hrs = Math.floor(segs / 3600);
            const mins = Math.floor((segs % 3600) / 60);
            const s = segs % 60;
            
            document.getElementById('main-time').innerText = 
                `${hrs > 0 ? hrs + ':' : ''}${mins < 10 ? '0'+mins : mins}:${s < 10 ? '0'+s : s}`;
            
            circle.style.strokeDashoffset = (circumference - (segs / total) * circumference);
            
            if(segs <= 0) finish(true);
        }
    }, 1000);
};

const finish = async (win) => {
    clearInterval(timer);
    if(win && userPhone) {
        const xpGanho = Math.floor(total / 1500 * 10);
        try {
            await updateDoc(doc(db, "notas", userPhone), { xp: increment(xpGanho) });
        } catch(e) { console.error(e); }
    }
    location.reload();
};

// --- CONTROLES DE INTERFACE ---
document.getElementById('h-up').onclick = () => { 
    let v = parseInt(document.getElementById('h-val').innerText); 
    if(v < 12) v++; 
    document.getElementById('h-val').innerText = v < 10 ? '0'+v : v; updateXP(); 
};
document.getElementById('h-down').onclick = () => { 
    let v = parseInt(document.getElementById('h-val').innerText); 
    if(v > 0) v--; 
    document.getElementById('h-val').innerText = v < 10 ? '0'+v : v; updateXP(); 
};
document.getElementById('m-up').onclick = () => { 
    let v = parseInt(document.getElementById('m-val').innerText); 
    if(v < 55) v += 5; 
    document.getElementById('m-val').innerText = v < 10 ? '0'+v : v; updateXP(); 
};
document.getElementById('m-down').onclick = () => { 
    let v = parseInt(document.getElementById('m-val').innerText); 
    if(v > 0) v -= 5; 
    document.getElementById('m-val').innerText = v < 10 ? '0'+v : v; updateXP(); 
};

document.getElementById('btn-pause').onclick = () => { 
    isPaused = !isPaused; 
    document.getElementById('btn-pause').innerText = isPaused ? "RETOMAR" : "PAUSAR"; 
};

document.getElementById('btn-quit').onclick = () => { 
    isPaused = true; 
    document.getElementById('modal-confirm').style.display = 'flex'; 
};

document.getElementById('btn-keep-going').onclick = () => { 
    isPaused = false; 
    document.getElementById('modal-confirm').style.display = 'none'; 
};

document.getElementById('btn-really-quit').onclick = () => location.reload();

updateXP();
