import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
  authDomain: "dt-scho0l.firebaseapp.com",
  projectId: "dt-scho0l",
  storageBucket: "dt-scho0l.firebasestorage.app",
  messagingSenderId: "78578509391",
  appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const status = document.getElementById('login-status');
const card = document.querySelector('.login-card');
const monster = document.getElementById('monster-ui');

function mostrarErro(msg) {
    status.innerText = "⚠ " + msg;
    status.style.opacity = "1";
    card.classList.add('shake-error');
    monster.classList.add('angry'); // Fica bravo!

    // Limpa o erro e acalma o monstrinho após 3s
    setTimeout(() => {
        status.style.opacity = "0";
        monster.classList.remove('angry');
        card.classList.remove('shake-error');
        setTimeout(() => { status.innerText = ""; }, 300);
    }, 3000);
}

const inputEmail = document.getElementById('user-email');
const inputPass = document.getElementById('user-pass');

if (monster && inputEmail && inputPass) {
    inputEmail.addEventListener('focus', () => { 
        if(!monster.classList.contains('angry')){
            monster.classList.add('looking'); monster.classList.remove('shame'); 
        }
    });
    inputPass.addEventListener('focus', () => { 
        if(!monster.classList.contains('angry')){
            monster.classList.add('shame'); monster.classList.remove('looking'); 
        }
    });
    [inputEmail, inputPass].forEach(el => el.addEventListener('blur', () => monster.classList.remove('looking', 'shame')));
    
    document.addEventListener('mousemove', (e) => {
        if (monster && !monster.classList.contains('shame') && !monster.classList.contains('angry')) {
            const pupils = document.querySelectorAll('.pupil');
            let x = (e.clientX / window.innerWidth - 0.5) * 10;
            let y = (e.clientY / window.innerHeight - 0.5) * 10;
            pupils.forEach(p => p.style.transform = `translate(${x}px, ${y}px)`);
        }
    });
}

window.tentarLogar = async () => {
    const email = inputEmail.value.trim();
    const pass = inputPass.value;
    if (!email || !pass) return mostrarErro("Vazio? Aí não né, patrão!");
    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, email, pass);
        window.location.href = 'index.html';
    } catch (e) { mostrarErro("Dados inválidos!"); }
};

window.realizarCadastro = async () => {
    const nome = document.getElementById('user-name').value.trim();
    const email = inputEmail.value.trim();
    const pass = inputPass.value;
    if (!nome || !email || !pass) return mostrarErro("Preencha tudo pro Ranking!");
    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(res.user, { displayName: nome });
        localStorage.setItem('dt_user_name', nome);
        window.location.href = 'index.html';
    } catch (e) { mostrarErro("Erro ao cadastrar!"); }
};

window.entrarComoVisitante = () => {
    localStorage.setItem('dt_user_name', 'Visitante');
    localStorage.setItem('dt_user_phone', 'visitante');
    localStorage.setItem('dt_user_type', 'local');
    window.location.href = 'index.html';
};
