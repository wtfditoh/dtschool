import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const emailMestre = "ditoh2008@gmail.com";
const emailLogado = (localStorage.getItem('dt_user_email') || "").toLowerCase();

function gerarFraseIA() {
    const v = ["Evolua", "Conquiste", "Domine", "Foque em", "Acelere"];
    const m = ["seu futuro", "os estudos", "o ranking", "sua rotina", "seus sonhos"];
    const emojis = ["🚀", "🧠", "🔥", "✨", "🎯"];
    return `${v[Math.floor(Math.random()*v.length)]} ${m[Math.floor(Math.random()*m.length)]} ${emojis[Math.floor(Math.random()*emojis.length)]}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Frase IA e Usuário
    document.getElementById('frase-ia').innerText = gerarFraseIA();
    const nome = localStorage.getItem('dt_user_name') || "ESTUDANTE";
    document.getElementById('user-display-name').innerText = nome.split(' ')[0].toUpperCase();
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});

    // 2. Verificação de Manutenção e Aviso Global
    onSnapshot(doc(db, "config", "status_sistema"), (s) => {
        const d = s.data();
        if (d?.emManutencao && emailLogado !== emailMestre) {
            document.getElementById('manutencao-screen').style.display = 'flex';
        } else {
            document.getElementById('manutencao-screen').style.display = 'none';
        }
    });

    onSnapshot(doc(db, "config", "aviso_global"), (s) => {
        const d = s.data();
        const alertBox = document.getElementById('global-alert');
        if (d?.ativo) {
            alertBox.style.display = 'flex';
            alertBox.innerHTML = `<i data-lucide="megaphone" style="width:14px"></i> <span>${d.mensagem}</span>`;
            if(window.lucide) lucide.createIcons();
        } else {
            alertBox.style.display = 'none';
        }
    });

    // 3. XP Real
    if (emailLogado) {
        const userSnap = await getDoc(doc(db, "notas", emailLogado));
        if (userSnap.exists()) {
            document.getElementById('xp-display').innerText = `+${userSnap.data().xp || 0} XP`;
        }
    }

    // 4. Mural Firebase
    onSnapshot(doc(db, "config", "mural"), (snap) => {
        if (snap.exists()) {
            const d = snap.data();
            document.getElementById('mural-preview').innerText = d.texto.substring(0, 30) + "...";
            document.getElementById('btn-mural-main').onclick = () => {
                document.getElementById('mural-msg').innerText = d.texto;
                document.getElementById('modal-mural').style.display = 'flex';
            };
        }
    });

    if (window.lucide) lucide.createIcons();
});
