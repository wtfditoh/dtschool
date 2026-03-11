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
    // 1. Frase IA e Nome
    const fraseEl = document.getElementById('frase-ia');
    if(fraseEl) fraseEl.innerText = gerarFraseIA();
    
    const nome = localStorage.getItem('dt_user_name') || "ESTUDANTE";
    const nomeDisplay = document.getElementById('user-display-name');
    if(nomeDisplay) nomeDisplay.innerText = nome.split(' ')[0].toUpperCase();
    
    const dataEl = document.getElementById('current-date');
    if(dataEl) dataEl.innerText = new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});

    // 2. Verificação de Manutenção
    onSnapshot(doc(db, "config", "status_sistema"), (s) => {
        if (s.exists()) {
            const d = s.data();
            const telaM = document.getElementById('manutencao-screen');
            if (telaM) {
                telaM.style.display = (d.emManutencao && emailLogado !== emailMestre) ? 'flex' : 'none';
            }
        }
    });

    // 3. XP Real
    if (emailLogado) {
        const userSnap = await getDoc(doc(db, "notas", emailLogado));
        if (userSnap.exists()) {
            const xpDisplay = document.getElementById('xp-display');
            if(xpDisplay) xpDisplay.innerText = `+${userSnap.data().xp || 0} XP`;
        }
    }

    // 4. LÓGICA DO MURAL (Onde estava o erro)
    const btnMural = document.getElementById('btn-mural-main');
    const modalMural = document.getElementById('modal-mural');
    const muralMsg = document.getElementById('mural-msg');
    const muralPreview = document.getElementById('mural-preview');

    onSnapshot(doc(db, "config", "mural"), (snap) => {
        if (snap.exists()) {
            const d = snap.data();
            
            // Atualiza o textinho que fica aparecendo no card
            if(muralPreview) muralPreview.innerText = d.texto.substring(0, 30) + "...";

            // Quando clicar no card do mural...
            if (btnMural) {
                btnMural.onclick = () => {
                    console.log("Abrindo mural..."); // Debug no console
                    if (modalMural && muralMsg) {
                        muralMsg.innerHTML = `
                            <p style="white-space: pre-wrap;">${d.texto}</p>
                            <br>
                            <div style="border-top: 1px solid rgba(138,43,226,0.2); padding-top: 10px; text-align: right;">
                                <small style="color:#8a2be2; font-weight:bold;">Autor: ${d.autor || 'Sistema'}</small>
                            </div>
                        `;
                        modalMural.style.display = 'flex'; // Abre o modal
                    }
                };
            }
        }
    });

    if (window.lucide) lucide.createIcons();
});
