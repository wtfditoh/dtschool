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
    const v = ["Evolua", "Conquiste", "Domine", "Foque em", "Acelere", "Supere"];
    const m = ["seu futuro", "os estudos", "o ranking", "sua rotina", "seus sonhos", "seus limites"];
    const emojis = ["🚀", "🧠", "🔥", "✨", "🎯", "⚡"];
    return `${v[Math.floor(Math.random()*v.length)]} ${m[Math.floor(Math.random()*m.length)]} ${emojis[Math.floor(Math.random()*emojis.length)]}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Interface (Nome, Frase e Data)
    const fraseEl = document.getElementById('frase-ia');
    if(fraseEl) fraseEl.innerText = gerarFraseIA();
    
    const nome = localStorage.getItem('dt_user_name') || "ESTUDANTE";
    const nomeDisplay = document.getElementById('user-display-name');
    if(nomeDisplay) nomeDisplay.innerText = nome.split(' ')[0].toUpperCase();
    
    const dataEl = document.getElementById('current-date');
    if(dataEl) dataEl.innerText = new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});

    // 2. Sistema de Manutenção
    onSnapshot(doc(db, "config", "status_sistema"), (s) => {
        if (s.exists()) {
            const d = s.data();
            const telaM = document.getElementById('manutencao-screen');
            if (telaM) {
                telaM.style.display = (d.emManutencao && emailLogado !== emailMestre) ? 'flex' : 'none';
            }
            const statusDesc = document.getElementById('status-desc');
            if(statusDesc) statusDesc.innerText = d.emManutencao ? "Em Manutenção" : "Sistema Online";
        }
    });

    // 3. XP Real do Aluno
    if (emailLogado) {
        try {
            const userSnap = await getDoc(doc(db, "notas", emailLogado));
            if (userSnap.exists()) {
                const xpDisplay = document.getElementById('xp-display');
                if(xpDisplay) xpDisplay.innerText = `+${userSnap.data().xp || 0} XP`;
            }
        } catch (err) { console.error("Erro XP:", err); }
    }

    // 4. Lógica do Mural com Efeito Glow
    onSnapshot(doc(db, "config", "mural"), (snap) => {
        if (snap.exists()) {
            const d = snap.data();
            const preview = document.getElementById('mural-preview');
            const cardMural = document.getElementById('btn-mural-main');
            
            if(preview) preview.innerText = d.texto.substring(0, 32) + "...";

            // ATIVA O GLOW se houver um aviso real
            if(cardMural) {
                if(d.texto !== "Nenhum aviso no momento.") {
                    cardMural.classList.add('mural-animado');
                } else {
                    cardMural.classList.remove('mural-animado');
                }
            }

            const btn = document.getElementById('btn-mural-main');
            if(btn) {
                btn.onclick = () => {
                    const modal = document.getElementById('modal-mural');
                    const msg = document.getElementById('mural-msg');
                    if(modal && msg) {
                        msg.innerHTML = `
                            <p style="white-space: pre-wrap; font-size: 15px; color: #ccc; line-height: 1.6;">${d.texto}</p>
                            <div style="margin-top: 20px; border-top: 1px solid rgba(138,43,226,0.2); padding-top: 10px; text-align: right;">
                                <small style="color:#8a2be2; font-weight:bold;">BY: ${d.autor}</small>
                            </div>
                        `;
                        modal.style.display = 'flex';
                    }
                };
            }
        }
    });

    if (window.lucide) lucide.createIcons();
});
