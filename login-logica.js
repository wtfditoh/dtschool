import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

const status = document.getElementById('login-status');
const monster = document.getElementById('monster-ui');
const card = document.querySelector('.login-card');

function mostrarErro(msg) {
    status.innerText = "⚠ " + msg;
    card.classList.add('shake-error');
    setTimeout(() => card.classList.remove('shake-error'), 400);
}

// ANIMAÇÕES DO MONSTRINHO
const inputEmail = document.getElementById('user-email');
const inputPass = document.getElementById('user-pass');

if (monster && inputEmail && inputPass) {
    inputEmail.addEventListener('focus', () => monster.classList.add('looking'));
    inputPass.addEventListener('focus', () => monster.classList.add('shame'));
    [inputEmail, inputPass].forEach(el => el.addEventListener('blur', () => {
        monster.classList.remove('looking', 'shame');
    }));
}

// LOGIN
window.tentarLogar = async () => {
    const email = inputEmail.value;
    const pass = inputPass.value;
    const manter = document.getElementById('keep-logged').checked;

    if (!email || !pass) return mostrarErro("Vazio? Aí não né, patrão!");

    try {
        await setPersistence(auth, manter ? browserLocalPersistence : browserSessionPersistence);
        await signInWithEmailAndPassword(auth, email, pass);
        window.location.href = 'index.html';
    } catch (e) { mostrarErro("E-mail ou senha incorretos!"); }
};

// CADASTRO
window.realizarCadastro = async () => {
    const nome = document.getElementById('user-name').value.trim();
    const email = inputEmail.value;
    const pass = inputPass.value;

    if (!nome || !email || !pass) return mostrarErro("Preencha tudo para o Ranking!");

    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(res.user, { displayName: nome });
        localStorage.setItem('dt_user_name', nome);
        window.location.href = 'index.html';
    } catch (e) { mostrarErro("Erro ao criar conta!"); }
};

window.entrarComoVisitante = () => {
    localStorage.setItem('dt_user_name', 'Visitante');
    window.location.href = 'index.html';
};
