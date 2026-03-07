import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Suas chaves reais do projeto dt-scho0l
const firebaseConfig = {
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

function mostrarErro(msg) {
    status.innerText = "⚠ " + msg;
    status.style.opacity = "1";
    card.classList.add('shake-error');
    monster.classList.add('angry');
    setTimeout(() => {
        status.style.opacity = "0";
        monster.classList.remove('angry');
        card.classList.remove('shake-error');
    }, 3000);
}

const inputEmail = document.getElementById('user-email');
const inputPass = document.getElementById('user-pass');

// --- LÓGICA DO MONSTRINHO ---
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
            let x = (e.clientX / window.innerWidth - 0.5) * 12;
            let y = (e.clientY / window.innerHeight - 0.5) * 12;
            pupils.forEach(p => p.style.transform = `translate(${x}px, ${y}px)`);
        }
    });
}

// --- FUNÇÃO DE LOGIN ---
window.tentarLogar = async () => {
    const email = inputEmail.value.trim();
    const pass = inputPass.value;
    if (!email || !pass) return mostrarErro("Vazio? Aí não né, patrão!");
    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, email, pass);
        window.location.href = 'index.html';
    } catch (e) { 
        console.error(e);
        mostrarErro("Dados inválidos!"); 
    }
};

// --- FUNÇÃO DE CADASTRO ---
window.realizarCadastro = async () => {
    const nome = document.getElementById('user-name').value.trim();
    const email = inputEmail.value.trim();
    const pass = inputPass.value;

    if (!nome || !email || !pass) return mostrarErro("Preencha tudo pro Ranking!");
    if (pass.length < 6) return mostrarErro("Senha curta (mín. 6)!");

    try {
        // 1. Cria no Auth
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        
        // 2. Atualiza o perfil
        await updateProfile(res.user, { displayName: nome });

        // 3. Salva no Firestore (Ranking)
        await setDoc(doc(db, "notas", email), {
            nome: nome,
            xp: 0,
            email: email,
            tipo: "estudante",
            criadoEm: new Date()
        });

        // 4. Prepara o gatilho do E-mail HTML
        await setDoc(doc(db, "mail", email), {
            to: email,
            message: {
                subject: 'Bem-vindo ao Hub Brain, ' + nome + '!',
                html: `
                    <div style="background-color: #0a0a0a; color: white; padding: 30px; border: 2px solid #8a2be2; border-radius: 15px; font-family: sans-serif; text-align: center;">
                        <h1 style="color: #8a2be2; margin-bottom: 20px;">HUB BRAIN</h1>
                        <p style="font-size: 18px;">Fala, <strong>${nome}</strong>!</p>
                        <p>Sua conta foi criada no naipe. Agora é foco total no Ranking!</p>
                        <div style="margin-top: 20px; padding: 10px; background: #8a2be2; border-radius: 5px; display: inline-block;">
                            BONS ESTUDOS!
                        </div>
                    </div>
                `
            }
        });

        localStorage.setItem('dt_user_name', nome);
        window.location.href = 'index.html';

    } catch (e) { 
        console.error("ERRO NO CADASTRO:", e);
        if (e.code === 'auth/email-already-in-use') mostrarErro("E-mail já existe!");
        else mostrarErro("Erro técnico! Veja o console.");
    }
};

window.entrarComoVisitante = () => {
    localStorage.setItem('dt_user_name', 'Visitante');
    window.location.href = 'index.html';
};
