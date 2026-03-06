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

        querySnapshot.forEach((doc) => {
            const d = doc.data();
            // Se não tiver o campo xp ainda, usamos 0 como padrão
            const xpTotal = d.xp || 0;
            lista.push({
                nome: d.nome || "Estudante",
                xp: xpTotal,
                avatar: d.avatar || "user",
                patente: getPatente(xpTotal)
            });
        });

        lista.sort((a, b) => b.xp - a.xp);
        renderizar(lista);
    } catch (e) { console.error(e); }
}

function renderizar(lista) {
    // Top 3
    for(let i=0; i<3; i++) {
        const user = lista[i];
        if(user) {
            document.getElementById(`p${i+1}-name`).innerText = user.nome;
            document.getElementById(`p${i+1}-score`).innerText = user.xp;
            // Atualiza ícone do avatar se disponível
            const avatarBox = document.getElementById(`avatar-p${i+1}`);
            avatarBox.innerHTML = i === 0 ? `<i data-lucide="crown" class="crown"></i><i data-lucide="${user.avatar}"></i>` : `<i data-lucide="${user.avatar}"></i>`;
        }
    }

    // Restante
    const container = document.getElementById('ranking-geral');
    container.innerHTML = lista.slice(3).map((u, i) => `
        <div class="ranking-item">
            <span class="pos">${i + 4}º</span>
            <div class="user-info">
                <span class="user-name">${u.nome}</span>
                <span class="patente">${u.patente} • ${u.xp} XP</span>
            </div>
            <i data-lucide="${u.avatar}" style="width:16px; color:#333;"></i>
        </div>
    `).join('');
    
    if(window.lucide) lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', carregarRanking);
