import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// SUAS CHAVES REAIS DO PROJETO DT-SCHO0L
const firebaseConfig = {
  apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
  authDomain: "dt-scho0l.firebaseapp.com",
  projectId: "dt-scho0l",
  storageBucket: "dt-scho0l.firebasestorage.app",
  messagingSenderId: "78578509391",
  appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a",
  measurementId: "G-F7TG23TBTL"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Seleção de Elementos
const status = document.getElementById('login-status');
const card = document.querySelector('.login-card');
const monster = document.getElementById('monster-ui');
const inputEmail = document.getElementById('user-email');
const inputPass = document.getElementById('user-pass');
const pupils = document.querySelectorAll('.pupil');

// --- FUNÇÃO DE ERRO (O MONSTRINHO BRAVO) ---
function mostrarErro(msg) {
    if (status) {
        status.innerText = "⚠ " + msg;
        status.style.opacity = "1";
    }
    if (card) card.classList.add('shake-error');
    if (monster) monster.classList.add('angry');

    setTimeout(() => {
        if (status) status.style.opacity = "0";
        if (monster) monster.classList.remove('angry');
        if (card) card.classList.remove('shake-error');
    }, 3000);
}

// --- ANIMAÇÃO DO MONSTRINHO ---
document.addEventListener('mousemove', (e) => {
    if (monster && !monster.classList.contains('shame') && !monster.classList.contains('angry')) {
        let x = (e.clientX / window.innerWidth - 0.5) * 15;
        let y = (e.clientY / window.innerHeight - 0.5) * 15;
        pupils.forEach(p => p.style.transform = `translate(${x}px, ${y}px)`);
    }
});

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

// --- LOGIN CORRIGIDO (SEM REFRESH) ---
window.tentarLogar = async (e) => {
    if (e) e.preventDefault(); // PARA O REFRESH DA PÁGINA

    const email = inputEmail.value.trim();
    const pass = inputPass.value;
    
    if (!email || !pass) return mostrarErro("Vazio? Aí não né, patrão!");

    try {
        await setPersistence(auth, browserLocalPersistence);
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        
        // Sincroniza o nome antes de entrar
        const nomeParaSalvar = userCredential.user.displayName || "Estudante";
        localStorage.setItem('dt_user_name', nomeParaSalvar);

        console.log("Sucesso! Redirecionando...");
        window.location.replace('index.html');
    } catch (error) {
        console.error("Erro no login:", error.code);
        mostrarErro("E-mail ou senha inválidos!");
    }
};

// --- CADASTRO COMPLETO CORRIGIDO ---
window.realizarCadastro = async (e) => {
    if (e) e.preventDefault(); // PARA O REFRESH DA PÁGINA

    const nomeInput = document.getElementById('user-name');
    const nome = nomeInput ? nomeInput.value.trim() : "";
    const email = inputEmail.value.trim();
    const pass = inputPass.value;

    if (!nome || !email || !pass) return mostrarErro("Preencha tudo pro Ranking!");
    if (pass.length < 6) return mostrarErro("Senha curta (mín. 6)!");

    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(res.user, { displayName: nome });

        // Garante que o sistema saiba quem você é antes de criar o doc
        localStorage.setItem('dt_user_name', nome);

        await setDoc(doc(db, "notas", email), {
            nome: nome,
            xp: 0,
            avatar: "user",
            email: email,
            criadoEm: serverTimestamp()
        });

        // Gatilho de e-mail
        await setDoc(doc(db, "mail", email), {
            to: email,
            message: {
                subject: `Bem-vindo ao Hub Brain, ${nome}!`,
                html: `<div style="text-align:center; background:#0a0a0a; color:#fff; padding:20px; border:1px solid #8a2be2;">
                        <h1 style="color:#8a2be2;">HUB BRAIN</h1>
                        <p>Fala, <b>${nome}</b>! Conta criada com sucesso.</p>
                       </div>`
            }
        });

        window.location.replace('index.html');

    } catch (error) {
        console.error("ERRO NO CADASTRO:", error);
        if (error.code === 'auth/email-already-in-use') mostrarErro("E-mail já cadastrado!");
        else mostrarErro("Erro ao cadastrar!");
    }
};

window.entrarComoVisitante = () => {
    localStorage.clear(); 
    localStorage.setItem('dt_user_name', 'Visitante');
    window.location.replace('index.html');
};
