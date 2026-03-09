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

// FUNÇÃO DE MENSAGENS (ERRO OU SUCESSO)
function avisar(msg, tipo = "erro") {
    if (!status) return;
    
    status.innerText = (tipo === "erro" ? "⚠ " : "✓ ") + msg;
    status.classList.remove('sucesso');
    
    if (tipo === "sucesso") {
        status.classList.add('sucesso');
    } else {
        if (card) card.classList.add('shake-error');
        if (monster) monster.classList.add('angry');
    }

    status.style.opacity = "1";

    setTimeout(() => {
        status.style.opacity = "0";
        if (monster) monster.classList.remove('angry');
        if (card) card.classList.remove('shake-error');
    }, 1500);
}

// OLHOS DO MONSTRO
document.addEventListener('mousemove', (e) => {
    if (monster && !monster.classList.contains('shame') && !monster.classList.contains('angry')) {
        let x = (e.clientX / window.innerWidth - 0.5) * 15;
        let y = (e.clientY / window.innerHeight - 0.5) * 15;
        pupils.forEach(p => p.style.transform = `translate(${x}px, ${y}px)`);
    }
});

if (inputEmail && inputPass) {
    inputEmail.addEventListener('focus', () => { monster.classList.add('looking'); monster.classList.remove('shame'); });
    inputPass.addEventListener('focus', () => { monster.classList.add('shame'); monster.classList.remove('looking'); });
    [inputEmail, inputPass].forEach(el => el.addEventListener('blur', () => monster.classList.remove('looking', 'shame')));
}

// LOGIN - AJUSTADO PARA SALVAR EMAIL E TIPO
window.tentarLogar = async (e) => {
    if (e) e.preventDefault();
    const email = inputEmail.value.trim();
    const pass = inputPass.value;
    if (!email || !pass) return avisar("Faltam dados, mestre!");

    try {
        await signOut(auth);
        const persistencia = (checkManter && checkManter.checked) ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistencia);
        
        const res = await signInWithEmailAndPassword(auth, email, pass);
        
        // --- AJUSTE AQUI: Salvando dados para o funcoes.js ler ---
        localStorage.setItem('dt_user_name', res.user.displayName || "Estudante");
        localStorage.setItem('dt_user_email', email.toLowerCase());
        localStorage.setItem('dt_user_type', 'google'); 
        
        window.location.replace('index.html');
    } catch (error) { 
        console.error(error);
        avisar("E-mail ou senha inválidos!"); 
    }
};

// CADASTRO - AJUSTADO PARA SALVAR EMAIL E TIPO
window.realizarCadastro = async (e) => {
    if (e) e.preventDefault();
    const nomeInput = document.getElementById('user-name');
    const nome = nomeInput ? nomeInput.value.trim() : "";
    const email = inputEmail.value.trim();
    const pass = inputPass.value;

    if (!nome || !email || !pass) {
        return avisar("Preencha todos os campos!");
    }

    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(res.user, { displayName: nome });
        
        // --- AJUSTE AQUI: Salvando dados para o funcoes.js ler ---
        localStorage.setItem('dt_user_name', nome);
        localStorage.setItem('dt_user_email', email.toLowerCase());
        localStorage.setItem('dt_user_type', 'google');

        await setDoc(doc(db, "notas", email.toLowerCase()), {
            nome: nome, 
            xp: 0, 
            avatar: "user", 
            materias: [], 
            email: email.toLowerCase(), 
            criadoEm: serverTimestamp()
        });
        
        window.location.replace('index.html');
    } catch (error) {
        console.error(error);
        avisar("Erro ao criar conta. E-mail já existe?");
    }
};

// RECUPERAR SENHA
window.executarRecuperacao = async () => {
    const email = inputEmail.value.trim();
    if (!email) return avisar("Digite o e-mail primeiro!");

    try {
        await sendPasswordResetEmail(auth, email);
        avisar("Link enviado! Olhe seu e-mail.", "sucesso");
    } catch (error) {
        avisar("Erro ao enviar link de recuperação.");
    }
};

window.entrarComoVisitante = () => {
    localStorage.clear(); 
    localStorage.setItem('dt_user_name', 'Visitante');
    localStorage.setItem('dt_user_type', 'local'); // Define como local para não tentar subir pro Firebase
    window.location.replace('index.html');
};
