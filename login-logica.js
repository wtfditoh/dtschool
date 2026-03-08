import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, setPersistence, browserLocalPersistence, browserSessionPersistence, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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

// --- REATIVANDO A ALMA DO MONSTRINHO (OLHOS) ---
document.addEventListener('mousemove', (e) => {
    if (monster && !monster.classList.contains('shame') && !monster.classList.contains('angry')) {
        let x = (e.clientX / window.innerWidth - 0.5) * 15;
        let y = (e.clientY / window.innerHeight - 0.5) * 15;
        pupils.forEach(p => p.style.transform = `translate(${x}px, ${y}px)`);
    }
});

// ESTA É A PARTE QUE TINHA SUMIDO (A REAÇÃO AO CLIQUE):
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

// LOGIN COM PERSISTÊNCIA INTELIGENTE
window.tentarLogar = async (e) => {
    if (e) e.preventDefault();
    const email = inputEmail.value.trim();
    const pass = inputPass.value;
    if (!email || !pass) return mostrarErro("Vazio? Aí não né, patrão!");

    try {
        // LIMPEZA DE CHOQUE: Desloga antes de definir a nova persistência
        await signOut(auth);

        const persistencia = (checkManter && checkManter.checked) 
            ? browserLocalPersistence 
            : browserSessionPersistence;

        await setPersistence(auth, persistencia);
        const res = await signInWithEmailAndPassword(auth, email, pass);
        
        // Garante que o nome seja salvo no LocalStorage para o Perfil não criar "Visitante"
        localStorage.setItem('dt_user_name', res.user.displayName || "Estudante");
        
        window.location.replace('index.html');
    } catch (error) {
        console.error(error);
        mostrarErro("E-mail ou senha inválidos!");
    }
};

window.realizarCadastro = async (e) => {
    if (e) e.preventDefault();
    const nomeInput = document.getElementById('user-name');
    const nome = nomeInput ? nomeInput.value.trim() : "";
    const email = inputEmail.value.trim();
    const pass = inputPass.value;

    if (!nome || !email || !pass) return mostrarErro("Preencha tudo!");

    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(res.user, { displayName: nome });
        
        // Salva o nome imediatamente
        localStorage.setItem('dt_user_name', nome);

        await setDoc(doc(db, "notas", email), {
            nome: nome, 
            xp: 0, 
            avatar: "user", 
            materias: [], // Adicionado para evitar erro de undefined no perfil
            email: email, 
            criadoEm: serverTimestamp()
        });

        window.location.replace('index.html');
    } catch (error) {
        console.error(error);
        mostrarErro("Erro ao cadastrar!");
    }
};

window.entrarComoVisitante = () => {
    localStorage.clear(); 
    localStorage.setItem('dt_user_name', 'Visitante');
    window.location.replace('index.html');
};
