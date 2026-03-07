import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const monster = document.getElementById('monster-ui');
const status = document.getElementById('login-status');

// MOVIMENTO DOS OLHOS
document.addEventListener('mousemove', (e) => {
    if (monster && !monster.classList.contains('shame')) {
        const pupils = document.querySelectorAll('.pupil');
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 15;
        pupils.forEach(p => p.style.transform = `translate(${x}px, ${y}px)`);
    }
});

// REAÇÕES DE INPUT
const passIn = document.getElementById('user-pass');
if(passIn) {
    passIn.addEventListener('focus', () => monster.classList.add('shame'));
    passIn.addEventListener('blur', () => monster.classList.remove('shame'));
}

function mostrarErro(msg) {
    status.innerText = "⚠ " + msg;
    status.style.opacity = "1";
    setTimeout(() => status.style.opacity = "0", 3000);
}

// FUNÇÕES GLOBAIS
window.tentarLogar = async () => {
    const email = document.getElementById('user-email').value;
    const pass = document.getElementById('user-pass').value;
    if (!email || !pass) return mostrarErro("Preencha tudo!");
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        localStorage.setItem('dt_user_phone', email);
        localStorage.setItem('dt_user_type', 'firebase');
        window.location.href = 'index.html';
    } catch (e) { mostrarErro("Acesso negado."); }
};

window.entrarComoVisitante = () => {
    localStorage.setItem('dt_user_phone', '00000000000');
    localStorage.setItem('dt_user_type', 'local');
    window.location.href = 'index.html';
};
