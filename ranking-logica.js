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

// Identificador do usuário atual para destacar no ranking
const meuID = localStorage.getItem('dt_user_email') || localStorage.getItem('dt_user_phone');

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
            lista.push({ 
                id: doc.id, // Guardamos o ID (email/phone) para comparar
                nome: d.nome || "Anônimo", 
                xp: d.xp || 0, 
                avatar: d.avatar || "user" 
            });
        });

        // Ordena por XP
        lista.sort((a, b) => b.xp - a.xp);
        renderizar(lista);
    } catch (e) { 
        console.error("Erro ao carregar ranking:", e); 
    }
}

function renderizar(lista) {
    // Renderiza o Top 3 no Pódio
    for(let i=0; i<3; i++) {
        const u = lista[i];
        if(u) {
            document.getElementById(`p${i+1}-name`).innerText = u.nome;
            document.getElementById(`p${i+1}-score`).innerText = `${u.xp} XP`;
            
            const frame = document.getElementById(`avatar-p${i+1}`);
            // Se o avatar for um número (do perfil), usamos o ícone 'user', se não, usa o que vier
            const iconName = isNaN(u.avatar) ? u.avatar : "user";
            
            if (i === 0) {
                frame.innerHTML = `<i data-lucide="crown" class="crown-icon"></i><i data-lucide="${iconName}" style="width:55px; height:55px; color:#ffd700;"></i>`;
            } else {
                frame.innerHTML = `<i data-lucide="${iconName}" style="width:35px; height:35px; color:#fff;"></i>`;
            }
        }
    }

    // Renderiza o resto da lista abaixo do pódio
    const container = document.getElementById('lista-ranking');
    container.innerHTML = lista.slice(3).map((u, i) => {
        const isMe = u.id === meuID;
        const iconName = isNaN(u.avatar) ? u.avatar : "user";

        return `
        <div class="rank-item" style="${isMe ? 'border: 1px solid #8a2be2; background: rgba(138, 43, 226, 0.1);' : ''}">
            <span class="rank-pos">${i + 4}º</span>
            <div class="rank-info">
                <span class="rank-name">${u.nome} ${isMe ? '<b style="color:#8a2be2;">(VOCÊ)</b>' : ''}</span>
                <span class="rank-patente">${getPatente(u.xp)} • ${u.xp} XP</span>
            </div>
            <i data-lucide="${iconName}" style="width:20px; height:20px; color:${isMe ? '#8a2be2' : '#555'}; opacity:0.8;"></i>
        </div>
    `}).join('') || '<p style="text-align:center; padding:20px; color:#444;">Nenhum outro competidor ainda.</p>';
    
    if(window.lucide) lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', carregarRanking);
