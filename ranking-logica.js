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
// IMPORTANTE: Garantir que o ID seja comparado em letras minúsculas para evitar erro de duplicata
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
        let lista = [];
        
        querySnapshot.forEach(doc => {
            const d = doc.data();
            // Filtro rigoroso: só entra se tiver nome e se o e-mail for válido
            if (d.nome && d.email) {
                lista.push({ 
                    id: d.email.toLowerCase(), // Usamos o e-mail do campo do banco como ID principal
                    nome: d.nome, 
                    xp: Number(d.xp) || 0, 
                    avatar: d.avatar || "user" 
                });
            }
        });

        // Agrupar duplicatas por e-mail (caso existam) pegando o maior XP
        const listaUnica = Object.values(lista.reduce((acc, curr) => {
            if (!acc[curr.id] || curr.xp > acc[curr.id].xp) {
                acc[curr.id] = curr;
            }
            return acc;
        }, {}));

        // Ordenação: Maior XP primeiro
        listaUnica.sort((a, b) => b.xp - a.xp);
        renderizar(listaUnica);
    } catch (e) { 
        console.error("Erro ao carregar ranking:", e); 
    }
}

function renderizar(lista) {
    // 1. Renderiza o Top 3 no Pódio
    for(let i=0; i<3; i++) {
        const u = lista[i];
        const nomeElem = document.getElementById(`p${i+1}-name`);
        const scoreElem = document.getElementById(`p${i+1}-score`);
        const frame = document.getElementById(`avatar-p${i+1}`);

        if(u && nomeElem && scoreElem && frame) {
            // Pega apenas o primeiro nome para não quebrar o layout do pódio
            nomeElem.innerText = u.nome.split(' ')[0];
            
            // CORREÇÃO DO "XP XP": Injeta apenas o número. 
            // Se o seu HTML já tiver "XP" escrito do lado do ID, mude para: scoreElem.innerText = u.xp;
            // Se o seu HTML for apenas um campo vazio, use a linha abaixo:
            scoreElem.innerText = `${u.xp} XP`;
            
            const iconName = isNaN(u.avatar) ? u.avatar : "user";
            
            if (i === 0) { // Primeiro Lugar
                frame.innerHTML = `
                    <i data-lucide="crown" class="crown-icon" style="color:#ffd700; position:absolute; top:-20px; transform:rotate(-15deg);"></i>
                    <i data-lucide="${iconName}" style="width:50px; height:50px; color:#ffd700;"></i>
                `;
            } else { // Segundo e Terceiro
                frame.innerHTML = `<i data-lucide="${iconName}" style="width:35px; height:35px; color:#fff;"></i>`;
            }
        }
    }

    // 2. Renderiza o resto da lista (do 4º lugar em diante)
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
                    ${u.nome} ${isMe ? '<span class="voce-tag" style="font-size:9px; background:#8a2be2; color:white; padding:2px 6px; border-radius:10px; margin-left:5px;">VOCÊ</span>' : ''}
                </span>
                <span class="rank-patente">${getPatente(u.xp)} • ${u.xp} XP</span>
            </div>
            <i data-lucide="${iconName}" style="width:18px; height:18px; color:${isMe ? '#8a2be2' : '#555'}; opacity:0.8;"></i>
        </div>
    `}).join('') || '<p style="text-align:center; padding:20px; color:#555;">Nenhum competidor ainda.</p>';
    
    if(window.lucide) lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', carregarRanking);
