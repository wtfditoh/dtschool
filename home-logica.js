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

    // 2. Manutenção
    onSnapshot(doc(db, "config", "status_sistema"), (s) => {
        if (s.exists()) {
            const d = s.data();
            const telaM = document.getElementById('manutencao-screen');
            if (telaM) telaM.style.display = (d.emManutencao && emailLogado !== emailMestre) ? 'flex' : 'none';
        }
    });

    // 3. XP Real
    if (emailLogado) {
        try {
            const userSnap = await getDoc(doc(db, "notas", emailLogado));
            if (userSnap.exists()) {
                const xpDisplay = document.getElementById('xp-display');
                if(xpDisplay) xpDisplay.innerText = `+${userSnap.data().xp || 0} XP`;
            }
        } catch (e) { console.error(e); }
    }

    // 4. LÓGICA DO MURAL (Cores Dinâmicas e Fix de Tela)
    onSnapshot(doc(db, "config", "mural"), (snap) => {
        if (snap.exists()) {
            const d = snap.data();
            const preview = document.getElementById('mural-preview');
            const cardMural = document.getElementById('btn-mural-main');
            const bolinha = cardMural?.querySelector('.pulse-circle');
            const labelAviso = cardMural?.querySelector('span[style*="letter-spacing"]');

            // Mapeamento de cores baseado no Admin
            const cores = {
                purple: { hex: "#8a2be2", shadow: "rgba(138,43,226,0.5)" },
                danger: { hex: "#ff3b30", shadow: "rgba(255,59,48,0.5)" },
                gold: { hex: "#ffcc00", shadow: "rgba(255,204,0,0.5)" }
            };

            const corAtual = cores[d.cor] || cores.purple;

            // 1. Limita o texto para não estourar a largura do card
            if(preview) {
                preview.innerText = d.texto.length > 28 ? d.texto.substring(0, 28) + "..." : d.texto;
            }

            // 2. Aplica as cores dinâmicas no card
            if(cardMural && d.texto !== "Nenhum aviso no momento.") {
                cardMural.classList.add('mural-animado');
                cardMural.style.setProperty('--glow-color', corAtual.shadow);
                cardMural.style.setProperty('--border-color', corAtual.hex);
                
                if(bolinha) {
                    bolinha.style.background = corAtual.hex;
                    bolinha.style.boxShadow = `0 0 10px ${corAtual.hex}`;
                }
                if(labelAviso) labelAviso.style.color = corAtual.hex;

                cardMural.classList.add('mural-animado');
            } else if (cardMural) {
                cardMural.classList.remove('mural-animado');
                cardMural.style.borderColor = "#1a1a1a";
                if(bolinha) { bolinha.style.background = "#333"; bolinha.style.boxShadow = "none"; }
                if(labelAviso) labelAviso.style.color = "#666";
            }

            // 3. Clique para abrir o modal
            if(cardMural) {
                cardMural.onclick = () => {
                    const modal = document.getElementById('modal-mural');
                    const msg = document.getElementById('mural-msg');
                    if (modal && msg) {
                        msg.innerHTML = `
                            <p style="white-space: pre-wrap; word-break: break-word; color: #eee; line-height: 1.6;">${d.texto}</p>
                            <div style="margin-top: 25px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; text-align: right;">
                                <small style="color:${corAtual.hex}; font-weight:bold; text-transform: uppercase;">Enviado por: ${d.autor}</small>
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
