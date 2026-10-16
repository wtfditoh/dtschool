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

function avisar(msg, tipo = 'erro') {
    if (!status) return;
    status.textContent = (tipo === 'erro' ? '⚠ ' : '✓ ') + msg;
    status.classList.remove('show', 'success');
    if (tipo === 'sucesso') status.classList.add('success');
    // Força o reflow pra reanimar
    void status.offsetWidth;
    status.classList.add('show');
    setTimeout(() => status.classList.remove('show'), 2600);
}

/* ═══════════ LOGIN ═══════════ */
window.tentarLogar = async (e) => {
    if (e) e.preventDefault();
    const email = inputEmail.value.trim();
    const pass = inputPass.value;

    if (!email || !pass) return avisar('Faltam dados, mestre!');

    const btn = e?.target?.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
        await signOut(auth);
        const persistencia = (checkManter && checkManter.checked) ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistencia);
        const res = await signInWithEmailAndPassword(auth, email, pass);
        localStorage.setItem('dt_user_name', res.user.displayName || 'Estudante');
        localStorage.setItem('dt_user_email', email.toLowerCase());
        localStorage.setItem('dt_user_type', 'google');
        avisar('Bem-vindo de volta!', 'sucesso');
        setTimeout(() => window.location.replace('index.html'), 1200);
    } catch (error) {
        console.error(error);
        avisar('E-mail ou senha inválidos');
        if (btn) btn.disabled = false;
    }
};

/* ═══════════ CADASTRO ═══════════ */
window.realizarCadastro = async (e) => {
    if (e) e.preventDefault();

    const nomeInput = document.getElementById('user-name');
    const inputPass2 = document.getElementById('user-pass-2');
    const termos = document.getElementById('aceito-termos');

    const nome = nomeInput ? nomeInput.value.trim() : '';
    const email = inputEmail.value.trim();
    const pass = inputPass.value;
    const pass2 = inputPass2 ? inputPass2.value : '';

    // Validações
    if (!nome || !email || !pass || !pass2) return avisar('Preencha todos os campos');
    if (pass.length < 6) return avisar('Senha precisa ter 6+ caracteres');
    if (pass !== pass2) return avisar('As senhas não batem');
    if (termos && !termos.checked) return avisar('Aceite os termos pra continuar');

    const btn = e?.target?.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(res.user, { displayName: nome });

        localStorage.setItem('dt_user_name', nome);
        localStorage.setItem('dt_user_email', email.toLowerCase());
        localStorage.setItem('dt_user_type', 'google');
        localStorage.removeItem('dt_onboarding_done');

        await setDoc(doc(db, 'notas', email.toLowerCase()), {
            nome, xp: 0, avatar: 'user', materias: [],
            email: email.toLowerCase(), criadoEm: serverTimestamp()
        });

        avisar('Conta criada!', 'sucesso');
        setTimeout(() => window.location.replace('onboarding.html'), 1200);
    } catch (error) {
        console.error(error);
        let msg = 'Erro ao criar conta';
        if (error.code === 'auth/email-already-in-use') msg = 'Esse e-mail já tem conta';
        if (error.code === 'auth/invalid-email') msg = 'E-mail inválido';
        if (error.code === 'auth/weak-password') msg = 'Senha fraca demais';
        avisar(msg);
        if (btn) btn.disabled = false;
    }
};

/* ═══════════ RECUPERAÇÃO ═══════════ */
window.executarRecuperacao = async () => {
    const email = inputEmail.value.trim();
    if (!email) return avisar('Digite o e-mail primeiro');
    try {
        await sendPasswordResetEmail(auth, email);
        avisar('Link enviado! Olhe seu e-mail', 'sucesso');
    } catch (error) {
        console.error(error);
        avisar('Erro ao enviar link');
    }
};

/* ═══════════ VISITANTE ═══════════ */
window.entrarComoVisitante = () => {
    localStorage.clear();
    localStorage.setItem('dt_user_name', 'Visitante');
    localStorage.setItem('dt_user_type', 'local');
    window.location.replace('index.html');
};
