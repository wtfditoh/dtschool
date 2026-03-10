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

const tipoUsuario = localStorage.getItem('dt_user_type');

function atualizarUI(nome, xp, materias) {
    document.getElementById('user-display-name').innerText = nome;
    document.getElementById('user-xp').innerText = xp;
    document.getElementById('user-mats').innerText = materias;
    if(window.lucide) lucide.createIcons();
}

// LOGICA VISITANTE VS LOGADO
if (tipoUsuario === 'local') {
    const nome = localStorage.getItem('dt_user_name') || "Visitante";
    const materias = JSON.parse(localStorage.getItem('materias_local') || "[]");
    atualizarUI(nome, "---", materias.length);
} else {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            onSnapshot(doc(db, "notas", user.email.toLowerCase()), (docSnap) => {
                if (docSnap.exists()) {
                    const d = docSnap.data();
                    atualizarUI(d.nome, d.xp || 0, d.materias?.length || 0);
                }
            });
        } else {
            window.location.replace('login.html');
        }
    });
}

// ACOES DOS BOTOES
const logoutAcao = async () => {
    if (tipoUsuario !== 'local') await signOut(auth);
    localStorage.clear();
    window.location.replace('login.html');
};

document.getElementById('logout-link').onclick = logoutAcao;

document.getElementById('btn-mural-main').onclick = () => alert("Mural em breve!");
document.getElementById('btn-mural-side').onclick = () => alert("Mural em breve!");

// INICIALIZAR MENU LATERAL (Aproveitando seu menu.js)
const btnMenu = document.getElementById('open-menu');
if (btnMenu && window.toggleMenu) {
    btnMenu.onclick = window.toggleMenu;
}
