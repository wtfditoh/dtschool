import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    setPersistence, 
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- CONFIGURAÇÃO (COLOQUE SEUS DADOS AQUI) ---
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "ID",
    appId: "ID_APP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- SELETORES ---
const inputEmail = document.getElementById('user-email');
const inputPass = document.getElementById('user-pass');
const monster = document.getElementById('monster-ui');
const status = document.getElementById('login-status');

// --- ANIMAÇÃO DO MONSTRINHO (REVISADA) ---
if (monster && inputEmail && inputPass) {
    inputEmail.addEventListener('focus', () => {
        monster.classList.add('looking');
        monster.classList.remove('shame');
    });

    inputPass.addEventListener('focus', () => {
        monster.classList.add('shame');
        monster.classList.remove('looking');
    });

    [inputEmail, inputPass].forEach(el => {
        el.addEventListener('blur', () => monster.classList.remove('shame', 'looking'));
    });

    document.addEventListener('mousemove', (e) => {
        if (!monster.classList.contains('shame')) {
            const pupils = document.querySelectorAll('.pupil');
            let x = (e.clientX / window.innerWidth - 0.5) * 10;
            let y = (e.clientY / window.innerHeight - 0.5) * 10;
            pupils.forEach(p => p.style.transform = `translate(${x}px, ${y}px)`);
        }
    });
}

// --- FUNÇÃO DE LOGIN ---
window.tentarLogar = async () => {
    const email = inputEmail.value;
    const pass = inputPass.value;
    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, email, pass);
        window.location.href = 'index.html';
    } catch (e) { status.innerText = "Erro no login: " + e.code; }
};

// --- FUNÇÃO DE CADASTRO ---
window.realizarCadastro = async () => {
    const email = inputEmail.value;
    const pass = inputPass.value;
    if (pass.length < 6) { status.innerText = "Senha deve ter 6+ dígitos"; return; }
    try {
        await createUserWithEmailAndPassword(auth, email, pass);
        alert("Conta criada! Redirecionando...");
        window.location.href = 'index.html';
    } catch (e) { status.innerText = "Erro ao cadastrar: " + e.code; }
};

window.entrarComoVisitante = () => {
    localStorage.setItem('dt_user_phone', 'visitante');
    window.location.href = 'index.html';
};
