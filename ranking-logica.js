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

        const listaUnica = Object.values(listaRaw.reduce((acc, curr) => {
            if (!acc[curr.id] || curr.xp > acc[curr.id].xp) acc[curr.id] = curr;
            return acc;
        }, {}));

        listaUnica.sort((a, b) => b.xp - a.xp);
        renderizar(listaUnica);
    } catch (e) {
        console.error("Erro ao carregar ranking:", e);
    }
}

function renderizar(lista) {
    // PÓDIO — top 3
    const cores = ['#f1c40f', '#bdc3c7', '#cd7f32'];
    for (let i = 0; i < 3; i++) {
        const u = lista[i];
        const nomeElem    = document.getElementById(`p${i+1}-name`);
        const scoreElem   = document.getElementById(`p${i+1}-score`);
        const patenteElem = document.getElementById(`p${i+1}-patente`);
        const frame       = document.getElementById(`avatar-p${i+1}`);

        if (u && nomeElem && scoreElem && frame) {
            nomeElem.innerText  = u.nome.split(' ')[0];
            scoreElem.innerText = u.xp;
            if (patenteElem) patenteElem.innerText = getPatente(u.xp);

            const iconName = isNaN(u.avatar) ? u.avatar : "user";
            const cor = cores[i];
            const size = i === 0 ? '38px' : '28px';

            if (i === 0) {
                frame.innerHTML = `
                    <i data-lucide="crown" class="crown-icon"></i>
                    <i data-lucide="${iconName}" style="width:${size}; height:${size}; color:${cor};"></i>
                `;
            } else {
                frame.innerHTML = `
                    <i data-lucide="${iconName}" style="width:${size}; height:${size}; color:${cor};"></i>
                `;
            }
        }
    }

    // LISTA — 4º em diante
    const container = document.getElementById('lista-ranking');
    if (!container) return;

    container.innerHTML = lista.slice(3).map((u, i) => {
        const isMe     = u.id === meuID;
        const iconName = isNaN(u.avatar) ? u.avatar : "user";
        const pos      = i + 4;

        return `
        <div class="rank-item ${isMe ? 'minha-pos' : ''}">
            <span class="rank-pos">${pos}º</span>
            <div class="rank-avatar">
                <i data-lucide="${iconName}" style="width:18px; height:18px; color:${isMe ? '#c084fc' : '#555'};"></i>
            </div>
            <div class="rank-info">
                <span class="rank-name">
                    ${u.nome}
                    ${isMe ? '<span class="rank-voce">VOCÊ</span>' : ''}
                </span>
                <span class="rank-patente">${getPatente(u.xp)}</span>
            </div>
            <span class="rank-xp">${u.xp} XP</span>
        </div>`;
    }).join('') || '<p style="text-align:center; padding:30px; color:#333; font-size:12px; font-weight:700; letter-spacing:1px;">NENHUM COMPETIDOR ENCONTRADO</p>';

    if (window.lucide) lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', carregarRanking);
