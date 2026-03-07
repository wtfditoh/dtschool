import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. CONFIGURAÇÃO DO SEU FIREBASE (Mantenha o seu original se for diferente)
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

// ELEMENTOS DA UI
const monster = document.getElementById('monster-ui');
const pupils = document.querySelectorAll('.pupil');
const statusMsg = document.getElementById('login-status');

// ==========================================
// 2. ALMA DO MONSTRO (ANIMAÇÕES E INTERAÇÃO)
// ==========================================

// Seguir o mouse com as pupilas
document.addEventListener('mousemove', (e) => {
    if (monster && !monster.classList.contains('shame')) {
        const { clientX, clientY } = e;
        const x = (clientX / window.innerWidth - 0.5) * 15;
        const y = (clientY / window.innerHeight - 0.5) * 10;
        
        pupils.forEach(p => {
            p.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        });
    }
});

// Reação ao focar na senha (tapar os olhos)
const passIn = document.getElementById('user-pass');
if (passIn) {
    passIn.addEventListener('focus', () => monster.classList.add('shame'));
    passIn.addEventListener('blur', () => monster.classList.remove('shame'));
}

// Função para mostrar erro com efeito de "raiva" no monstro
function mostrarErro(msg) {
    if (!statusMsg) return;
    statusMsg.innerText = "⚠ " + msg;
    statusMsg.style.opacity = "1";
    monster.classList.add('angry');
    
    setTimeout(() => {
        monster.classList.remove('angry');
        statusMsg.style.opacity = "0";
    }, 3000);
}

// ==========================================
// 3. LÓGICA DE AUTENTICAÇÃO
// ==========================================

// FUNÇÃO DE LOGIN
window.tentarLogar = async () => {
    const email = document.getElementById('user-email').value;
    const pass = document.getElementById('user-pass').value;

    if (!email || !pass) {
        mostrarErro("Preencha todos os campos!");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // Salva dados básicos para o sistema
        localStorage.setItem('dt_user_phone', email); // Usando email como chave de busca no seu Firestore antigo
        localStorage.setItem('dt_user_type', 'firebase');

        window.location.href = 'index.html'; // Altere para sua página inicial
    } catch (error) {
        console.error(error);
        mostrarErro("E-mail ou senha incorretos.");
    }
};

// FUNÇÃO DE CADASTRO
window.realizarCadastro = async () => {
    const nome = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const pass = document.getElementById('user-pass').value;

    if (!nome || !email || !pass) {
        mostrarErro("Preencha todos os dados!");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // 1. Salva o Nome no Perfil do Firebase (displayName)
        await updateProfile(user, { displayName: nome });

        // 2. Cria o documento inicial no Firestore (Para o Ranking e XP)
        await setDoc(doc(db, "notas", email), {
            nome: nome,
            xp: 0,
            avatar: "user",
            materias: []
        });

        localStorage.setItem('dt_user_phone', email);
        localStorage.setItem('dt_user_type', 'firebase');

        window.location.href = 'index.html';
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') {
            mostrarErro("Este e-mail já está cadastrado.");
        } else {
            mostrarErro("Erro ao criar conta.");
        }
    }
};

// FUNÇÃO DE VISITANTE
window.entrarComoVisitante = () => {
    localStorage.setItem('dt_user_phone', '00000000000');
    localStorage.setItem('dt_user_type', 'local');
    localStorage.setItem('dt_user_name', 'Visitante');
    window.location.href = 'index.html';
};
