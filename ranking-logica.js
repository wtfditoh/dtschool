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
            lista.push({ nome: d.nome || "Anônimo", xp: d.xp || 0, avatar: d.avatar || "user" });
        });
        lista.sort((a, b) => b.xp - a.xp);
        renderizar(lista);
    } catch (e) { console.error("Erro ao carregar ranking:", e); }
}

function renderizar(lista) {
    // Renderiza o Top 3 no Pódio
    for(let i=0; i<3; i++) {
        const u = lista[i];
        if(u) {
            document.getElementById(`p${i+1}-name`).innerText = u.nome;
            document.getElementById(`p${i+1}-score`).innerText = u.xp;
            
            const frame = document.getElementById(`avatar-p${i+1}`);
            if (i === 0) {
                frame.innerHTML = `<i data-lucide="crown" class="crown-icon"></i><i data-lucide="${u.avatar}" style="width:50px; height:50px;"></i>`;
            } else {
                frame.innerHTML = `<i data-lucide="${u.avatar}" style="width:35px; height:35px;"></i>`;
            }
        }
    }

    // Renderiza o resto da lista
    const container = document.getElementById('lista-ranking');
    container.innerHTML = lista.slice(3).map((u, i) => `
        <div class="rank-item">
            <span class="rank-pos">${i + 4}º</span>
            <div class="rank-info">
                <span class="rank-name">${u.nome}</span>
                <span class="rank-patente">${getPatente(u.xp)} • ${u.xp} XP</span>
            </div>
            <i data-lucide="${u.avatar}" style="width:20px; height:20px; color:#8a2be2; opacity:0.5;"></i>
        </div>
    `).join('') || '<p style="text-align:center; padding:20px; color:#444;">Aguardando competidores...</p>';
    
    if(window.lucide) lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', carregarRanking);
