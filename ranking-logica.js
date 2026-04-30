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

const userEmail = localStorage.getItem('dt_user_email');
const meuID = (userEmail && userEmail !== "null") ? userEmail.toLowerCase() : null;

function getPatente(xp) {
    if (xp >= 8000) return "Lenda do Hub 🏆";
    if (xp >= 4000) return "Cérebro de Elite ⚡";
    if (xp >= 1500) return "Veterano 🟣";
    if (xp >= 500)  return "Estudioso 🔵";
    return "Novato 🟢";
}

function formatarNumero(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

async function carregarRanking() {
    try {
        const querySnapshot = await getDocs(collection(db, "notas"));
        let listaRaw = [];

        querySnapshot.forEach(doc => {
            const d = doc.data();
            if (d.nome && d.email) {
                listaRaw.push({
                    id: d.email.toLowerCase(),
                    nome: d.nome,
                    xp: Number(d.xp) || 0,
                    avatar: d.avatar || "user"
                });
            }
        });

        // Remove duplicatas mantendo o maior XP
        const listaUnica = Object.values(listaRaw.reduce((acc, curr) => {
            if (!acc[curr.id] || curr.xp > acc[curr.id].xp) acc[curr.id] = curr;
            return acc;
        }, {}));

        // Ordena por XP
        listaUnica.sort((a, b) => b.xp - a.xp);

        // Calcula estatísticas
        const totalUsuarios = listaUnica.length;
        const totalXP = listaUnica.reduce((sum, u) => sum + u.xp, 0);

        // Atualiza stats no header
        const totalUsuariosEl = document.getElementById('total-usuarios');
        const totalXpEl = document.getElementById('total-xp');
        
        if (totalUsuariosEl) totalUsuariosEl.textContent = totalUsuarios;
        if (totalXpEl) totalXpEl.textContent = formatarNumero(totalXP);

        renderizar(listaUnica);
    } catch (e) {
        console.error("Erro ao carregar ranking:", e);
        const container = document.getElementById('lista-ranking');
        if (container) {
            container.innerHTML = '<p style="text-align:center; padding:40px; color:#ff4455; font-size:13px; font-weight:700;">Erro ao carregar ranking. Tente novamente.</p>';
        }
    }
}

function renderizar(lista) {
    // PÓDIO — top 3
    for (let i = 0; i < 3; i++) {
        const u = lista[i];
        const nomeElem = document.getElementById(`p${i+1}-name`);
        const scoreElem = document.getElementById(`p${i+1}-score`);
        const patenteElem = document.getElementById(`p${i+1}-patente`);
        const avatarElem = document.getElementById(`avatar-p${i+1}`);

        if (u && nomeElem && scoreElem && avatarElem) {
            nomeElem.textContent = u.nome.split(' ')[0];
            scoreElem.textContent = u.xp;
            if (patenteElem) patenteElem.textContent = getPatente(u.xp);

            const iconName = isNaN(u.avatar) ? u.avatar : "user";
            avatarElem.setAttribute('data-lucide', iconName);
        } else {
            // Se não tem usuário suficiente, mostra vazio
            if (nomeElem) nomeElem.textContent = '---';
            if (scoreElem) scoreElem.textContent = '0';
            if (patenteElem) patenteElem.textContent = '—';
        }
    }

    // LISTA — 4º em diante
    const container = document.getElementById('lista-ranking');
    if (!container) return;

    if (lista.length <= 3) {
        container.innerHTML = '<p style="text-align:center; padding:40px; color:#444; font-size:13px; font-weight:700; letter-spacing:1px;">APENAS O PÓDIO ESTÁ COMPETINDO</p>';
    } else {
        container.innerHTML = lista.slice(3).map((u, i) => {
            const isMe = u.id === meuID;
            const iconName = isNaN(u.avatar) ? u.avatar : "user";
            const pos = i + 4;

            return `
            <div class="rank-item ${isMe ? 'me' : ''}">
                <span class="rank-position">${pos}º</span>
                <div class="rank-avatar">
                    <i data-lucide="${iconName}"></i>
                </div>
                <div class="rank-info">
                    <div class="rank-name">
                        ${u.nome}
                        ${isMe ? '<span class="rank-badge">VOCÊ</span>' : ''}
                    </div>
                    <div class="rank-patente">${getPatente(u.xp)}</div>
                </div>
                <span class="rank-xp">${u.xp} XP</span>
            </div>`;
        }).join('');
    }

    // Re-renderiza os ícones do Lucide
    if (window.lucide) lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', carregarRanking);
