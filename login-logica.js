import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, setPersistence, browserLocalPersistence, browserSessionPersistence, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const status = document.getElementById('login-status');
const checkManter = document.getElementById('manter-conectado');
const inputEmail = document.getElementById('user-email');
const inputPass = document.getElementById('user-pass');

function avisar(msg, tipo = "erro") {
    if (!status) return;
    status.innerText = (tipo === "erro" ? "⚠ " : "✓ ") + msg;
    status.classList.remove('sucesso');
    if (tipo === "sucesso") {
        status.classList.add('sucesso');
        if (window.yetiSucesso) window.yetiSucesso();
    } else {
        if (window.yetiErro) window.yetiErro();
    }
    status.style.opacity = "1";
    setTimeout(() => { status.style.opacity = "0"; }, 2000);
}

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
        localStorage.setItem('dt_user_name', res.user.displayName || "Estudante");
        localStorage.setItem('dt_user_email', email.toLowerCase());
        localStorage.setItem('dt_user_type', 'google');
        avisar("Bem-vindo de volta!", "sucesso");
        setTimeout(() => window.location.replace('index.html'), 800);
    } catch (error) {
        avisar("E-mail ou senha inválidos!");
    }
};

window.realizarCadastro = async (e) => {
    if (e) e.preventDefault();
    const nomeInput = document.getElementById('user-name');
    const nome = nomeInput ? nomeInput.value.trim() : "";
    const email = inputEmail.value.trim();
    const pass = inputPass.value;
    if (!nome || !email || !pass) return avisar("Preencha todos os campos!");
    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(res.user, { displayName: nome });
        localStorage.setItem('dt_user_name', nome);
        localStorage.setItem('dt_user_email', email.toLowerCase());
        localStorage.setItem('dt_user_type', 'google');
        localStorage.removeItem('dt_onboarding_done');
        await setDoc(doc(db, "notas", email.toLowerCase()), {
            nome, xp: 0, avatar: "user", materias: [],
            email: email.toLowerCase(), criadoEm: serverTimestamp()
        });
        avisar("Conta criada!", "sucesso");
        setTimeout(() => window.location.replace('onboarding.html'), 800);
    } catch (error) {
        avisar("Erro ao criar conta. E-mail já existe?");
    }
};

window.executarRecuperacao = async () => {
    const email = inputEmail.value.trim();
    if (!email) return avisar("Digite o e-mail primeiro!");
    try {
        await sendPasswordResetEmail(auth, email);
        avisar("Link enviado! Olhe seu e-mail.", "sucesso");
    } catch (error) {
        avisar("Erro ao enviar link.");
    }
};

window.entrarComoVisitante = () => {
    localStorage.clear();
    localStorage.setItem('dt_user_name', 'Visitante');
    localStorage.setItem('dt_user_type', 'local');
    window.location.replace('index.html');
};
