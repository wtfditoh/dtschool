import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// FUNÇÃO PARA CARREGAR DADOS NA TELA
function preencherTela(nome, xp, materiasCount) {
    document.getElementById('user-display-name').innerText = nome || "Estudante";
    document.getElementById('user-xp').innerText = (xp || 0) + " XP";
    document.getElementById('user-mats').innerText = materiasCount || 0;
}

// LOGICA DE VERIFICAÇÃO DE USUÁRIO
const tipoUsuario = localStorage.getItem('dt_user_type');

if (tipoUsuario === 'local') {
    // SE FOR VISITANTE: Pega tudo do localStorage
    const nomeLocal = localStorage.getItem('dt_user_name') || "Visitante";
    const notasLocais = JSON.parse(localStorage.getItem('materias_local') || "[]");
    
    // Calcula XP local (soma de todas as notas se você quiser, ou deixa 0)
    preencherTela(nomeLocal, "---", notasLocais.length);

} else {
    // SE FOR GOOGLE/FIREBASE: Escuta o banco de dados
    onAuthStateChanged(auth, (user) => {
        if (user) {
            onSnapshot(doc(db, "notas", user.email.toLowerCase()), (docSnap) => {
                if (docSnap.exists()) {
                    const dados = docSnap.data();
                    preencherTela(dados.nome, dados.xp, dados.materias?.length);
                }
            });
        } else {
            window.location.replace('login.html');
        }
    });
}

// BOTÃO DE SAIR (Limpa tudo e volta pro login)
document.getElementById('logout-btn').onclick = async () => {
    if (tipoUsuario !== 'local') await signOut(auth);
    localStorage.clear();
    window.location.replace('login.html');
};

// LOGICA DO MURAL (OPCIONAL)
document.getElementById('btn-mural').onclick = () => {
    // Se for visitante, você pode avisar que o mural é só para alunos reais
    if (tipoUsuario === 'local') {
        alert("O Mural de Avisos está disponível apenas para alunos registados.");
    } else {
        // Aqui você abriria o modal do mural
        document.getElementById('modal-mural').style.display = 'flex';
    }
};
