import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// IDENTIFICADOR MESTRE
const userEmail = localStorage.getItem('dt_user_email');
const meuID = (userEmail && userEmail !== "null") ? userEmail.toLowerCase() : null;

function getPatente(xp) {
    if (xp >= 8000) return "Lenda do Hub 🏆";
    if (xp >= 4000) return "Cérebro de Elite ⚡";
    if (xp >= 1500) return "Veterano 🟣";
    if (xp >= 500) return "Estudioso 🔵";
    return "Novato 🟢";
}

async function carregarRanking() {
    try {
        const querySnapshot = await getDocs(collection(db, "notas"));
        let listaRaw = [];
        
        querySnapshot.forEach(doc => {
            const d = doc.data();
            // Só entra se tiver nome e um e-mail para servir de ID único
            if (d.nome && d.email) {
                listaRaw.push({ 
                    id: d.email.toLowerCase(),
                    nome: d.nome, 
                    xp: Number(d.xp) || 0, 
                    avatar: d.avatar || "user" 
                });
            }
        });

        // REMOVE DUPLICADOS: Se o mesmo e-mail aparecer 2x, pega o que tem mais XP
        const listaUnica = Object.values(listaRaw.reduce((acc, curr) => {
            if (!acc[curr.id] || curr.xp > acc[curr.id].xp) {
                acc[curr.id] = curr;
            }
            return acc;
        }, {}));

        // ORDENAÇÃO: Do maior XP para o menor
        listaUnica.sort((a, b) => b.xp - a.xp);
        
        renderizar(listaUnica);
    } catch (e) { 
        console.error("Erro ao carregar ranking:", e); 
    }
}

function renderizar(lista) {
    // 1. RENDERIZA O TOP 3 (PÓDIO)
    for(let i=0; i<3; i++) {
        const u = lista[i];
        const nomeElem = document.getElementById(`p${i+1}-name`);
        const scoreElem = document.getElementById(`p${i+1}-score`);
        const frame = document.getElementById(`avatar-p${i+1}`);

        if(u && nomeElem && scoreElem && frame) {
            // Nome curto para não quebrar o pódio
            nomeElem.innerText = u.nome.split(' ')[0];
            
            // RESOLVE O "XP XP": Injeta APENAS o número, pois o HTML já tem o texto "XP"
            scoreElem.innerText = u.xp;
            
            const iconName = isNaN(u.avatar) ? u.avatar : "user";
            
            if (i === 0) { // Primeiro Lugar
                frame.innerHTML = `
                    <i data-lucide="crown" class="crown-icon" style="color:#ffd700; position:absolute; top:-15px; transform:rotate(-10deg); z-index:10;"></i>
                    <i data-lucide="${iconName}" style="width:50px; height:50px; color:#ffd700;"></i>
                `;
            } else { // 2º e 3º Lugares
                frame.innerHTML = `<i data-lucide="${iconName}" style="width:35px; height:35px; color:#fff;"></i>`;
            }
        }
    }

    // 2. RENDERIZA O RESTO DA LISTA (4º EM DIANTE)
    const container = document.getElementById('lista-ranking');
    if (!container) return;

    container.innerHTML = lista.slice(3).map((u, i) => {
        const isMe = u.id === meuID;
        const iconName = isNaN(u.avatar) ? u.avatar : "user";

        return `
        <div class="rank-item" style="${isMe ? 'border: 1px solid #8a2be2; background: rgba(138, 43, 226, 0.1);' : ''}">
            <span class="rank-pos" style="${isMe ? 'color:#8a2be2;' : ''}">${i + 4}º</span>
            <div class="rank-info">
                <span class="rank-name" style="${isMe ? 'font-weight:bold;' : ''}">
                    ${u.nome} 
                    ${isMe ? '<span style="font-size:9px; background:#8a2be2; color:white; padding:2px 6px; border-radius:10px; margin-left:5px; font-weight:800;">VOCÊ</span>' : ''}
                </span>
                <span class="rank-patente">${getPatente(u.xp)} • ${u.xp} XP</span>
            </div>
            <i data-lucide="${iconName}" style="width:18px; height:18px; color:${isMe ? '#8a2be2' : '#555'}; opacity:0.8;"></i>
        </div>
    `}).join('') || '<p style="text-align:center; padding:20px; color:#555;">Nenhum competidor encontrado.</p>';
    
    if(window.lucide) lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', carregarRanking);
