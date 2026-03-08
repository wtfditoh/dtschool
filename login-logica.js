import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, setPersistence, browserLocalPersistence, browserSessionPersistence, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

const status = document.getElementById('login-status');
const card = document.querySelector('.login-card');
const monster = document.getElementById('monster-ui');
const inputEmail = document.getElementById('user-email');
const inputPass = document.getElementById('user-pass');
const pupils = document.querySelectorAll('.pupil');
const checkManter = document.getElementById('manter-conectado');

function mostrarErro(msg) {
    if (status) { status.innerText = "⚠ " + msg; status.style.opacity = "1"; }
    if (card) card.classList.add('shake-error');
    if (monster) monster.classList.add('angry');
    setTimeout(() => {
        if (status) status.style.opacity = "0";
        if (monster) monster.classList.remove('angry');
        if (card) card.classList.remove('shake-error');
    }, 3000);
}

// OLHOS DO MONSTRO
document.addEventListener('mousemove', (e) => {
    if (monster && !monster.classList.contains('shame') && !monster.classList.contains('angry')) {
        let x = (e.clientX / window.innerWidth - 0.5) * 15;
        let y = (e.clientY / window.innerHeight - 0.5) * 15;
        pupils.forEach(p => p.style.transform = `translate(${x}px, ${y}px)`);
    }
});

// REAÇÕES AO FOCO
if (inputEmail && inputPass) {
    inputEmail.addEventListener('focus', () => {
        monster.classList.add('looking');
        monster.classList.remove('shame');
    });
    inputPass.addEventListener('focus', () => {
        monster.classList.add('shame');
        monster.classList.remove('looking');
    });
    [inputEmail, inputPass].forEach(el => el.addEventListener('blur', () => {
        monster.classList.remove('looking', 'shame');
    }));
}

// LOGIN
window.tentarLogar = async (e) => {
    if (e) e.preventDefault();
    const email = inputEmail.value.trim();
    const pass = inputPass.value;
    if (!email || !pass) return mostrarErro("Vazio? Aí não né, patrão!");

    try {
        await signOut(auth);
        const persistencia = (checkManter && checkManter.checked) 
            ? browserLocalPersistence 
            : browserSessionPersistence;

        await setPersistence(auth, persistencia);
        const res = await signInWithEmailAndPassword(auth, email, pass);
        localStorage.setItem('dt_user_name', res.user.displayName || "Estudante");
        window.location.replace('index.html');
    } catch (error) {
        console.error(error);
        mostrarErro("E-mail ou senha inválidos!");
    }
};

// RECUPERAR SENHA
window.executarRecuperacao = async () => {
    const email = inputEmail.value.trim();
    if (!email) return mostrarErro("Digite o e-mail no campo acima!");

    try {
        await sendPasswordResetEmail(auth, email);
        alert("Sucesso! Link de recuperação enviado para: " + email);
    } catch (error) {
        console.error(error);
        mostrarErro("Erro ao enviar e-mail!");
    }
};

window.entrarComoVisitante = () => {
    localStorage.clear(); 
    localStorage.setItem('dt_user_name', 'Visitante');
    window.location.replace('index.html');
};
