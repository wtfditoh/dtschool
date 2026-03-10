import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
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
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    // 1. Identidade do usuário
    const nomeCompleto = localStorage.getItem('dt_user_name') || "ESTUDANTE";
    document.getElementById('user-display-name').innerText = nomeCompleto.split(' ')[0].toUpperCase();

    // 2. Data Atual
    const hoje = new Date();
    document.getElementById('current-date').innerText = hoje.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});

    // 3. Inicializar ícones
    if (window.lucide) lucide.createIcons();

    // 4. Lógica Real do Mural (Firebase)
    const btnMural = document.getElementById('btn-mural-main');
    const modalMural = document.getElementById('modal-mural');
    const muralTexto = document.getElementById('mural-msg');

    onSnapshot(doc(db, "config", "mural"), (docSnap) => {
        if (docSnap.exists()) {
            const d = docSnap.data();
            document.getElementById('mural-preview').innerText = d.texto.substring(0, 30) + "...";
            
            btnMural.onclick = () => {
                modalMural.style.display = 'flex';
                muralTexto.innerHTML = `
                    <div style="text-align:left; background:rgba(255,255,255,0.03); padding:15px; border-radius:15px;">
                        <p style="color:#eee; margin-bottom:15px;">${d.texto}</p>
                        <small style="color:#8a2be2; font-weight:bold; text-transform:uppercase;">Por: ${d.autor} • ${d.data}</small>
                    </div>
                `;
            };
        }
    });
});
