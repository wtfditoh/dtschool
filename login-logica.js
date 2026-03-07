// --- IMPORTAÇÃO DO FIREBASE (Certifique-se de que o HTML chama este script como type="module") ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    setPersistence, 
    browserLocalPersistence, 
    browserSessionPersistence 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 1. CONFIGURAÇÃO DO SEU FIREBASE (Substitua pelos seus dados do console)
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

// --- ELEMENTOS DA INTERFACE ---
const inputEmail = document.getElementById('user-email');
const inputPass = document.getElementById('user-pass');
const checkKeep = document.getElementById('keep-logged');
const monster = document.getElementById('monster-avatar');
const status = document.getElementById('login-status');

// --- CONTROLE DO MONSTRINHO ROXO ---
if (inputEmail && inputPass && monster) {
    // Quando foca no e-mail, ele olha pra baixo
    inputEmail.addEventListener('focus', () => {
        monster.classList.add('looking');
        monster.classList.remove('shame');
    });

    // Quando foca na senha, ele tampa os olhos
    inputPass.addEventListener('focus', () => {
        monster.classList.add('shame');
        monster.classList.remove('looking');
    });

    // Quando clica fora, volta ao normal
    [inputEmail, inputPass].forEach(el => {
        el.addEventListener('blur', () => {
            monster.classList.remove('shame', 'looking');
        });
    });

    // Movimento das pupilas seguindo o mouse (O toque de mestre)
    document.addEventListener('mousemove', (e) => {
        if (!monster.classList.contains('shame')) {
            const pupils = document.querySelectorAll('.pupil');
            let x = (e.clientX / window.innerWidth) * 5;
            let y = (e.clientY / window.innerHeight) * 5;
            pupils.forEach(p => {
                p.style.transform = `translate(${x}px, ${y}px)`;
            });
        }
    });
}

// --- FUNÇÕES DE LOGIN ---

function mostrarErro(msg) {
    status.innerText = msg;
    setTimeout(() => { status.innerText = ""; }, 3000);
}

// Tornamos a função global para o botão do HTML conseguir chamar
window.tentarLogar = async () => {
    const email = inputEmail.value.trim();
    const pass = inputPass.value;
    const manter = checkKeep.checked;

    if (!email || !pass) {
        mostrarErro("Preencha todos os campos!");
        return;
    }

    try {
        // Define a persistência (Manter Conectado)
        const tipoPersistencia = manter ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, tipoPersistencia);

        // Tenta o Login
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // --- COMPATIBILIDADE COM O RESTO DO SITE ---
        // Salvamos o UID ou e-mail no lugar onde antes era o telefone
        localStorage.setItem('dt_user_phone', user.email); 
        localStorage.setItem('dt_user_type', 'cloud');
        localStorage.setItem('dt_user_uid', user.uid);

        // Redireciona para a home
        window.location.href = 'index.html';

    } catch (error) {
        console.error("Erro no login:", error.code);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            mostrarErro("E-mail ou senha incorretos!");
        } else if (error.code === 'auth/invalid-email') {
            mostrarErro("Formato de e-mail inválido!");
        } else {
            mostrarErro("Erro ao conectar ao servidor.");
        }
    }
};

window.entrarComoVisitante = () => {
    localStorage.setItem('dt_user_phone', 'visitante');
    localStorage.setItem('dt_user_type', 'local');
    window.location.href = 'index.html';
};
