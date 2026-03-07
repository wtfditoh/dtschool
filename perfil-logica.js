import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const userPhone = localStorage.getItem('dt_user_phone');
const userType = localStorage.getItem('dt_user_type');

const getEl = id => document.getElementById(id);

window.showToast = (msg, type = "success") => {
    const container = getEl('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.innerHTML = `<i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle'}"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    if(window.lucide) lucide.createIcons();
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
};

document.addEventListener('DOMContentLoaded', () => {
    if (!userPhone) return window.location.href = 'login.html';
    carregarPerfilOficial();
});

async function carregarPerfilOficial() {
    const statsContainer = getEl('area-stats');
    if (userType === 'local' || userPhone === '00000000000') {
        getEl('display-phone').innerText = `visitante`;
        statsContainer.innerHTML = `<div class="xp-card"><p class="hint">Entre para subir nas patentes!</p></div>`;
        return;
    }

    try {
        const querySnapshot = await getDocs(collection(db, "notas"));
        let todos = [];
        querySnapshot.forEach(doc => todos.push({ id: doc.id, xp: doc.data().xp || 0 }));
        todos.sort((a, b) => b.xp - a.xp);
        const minhaPosicao = todos.findIndex(u => u.id === userPhone) + 1;

        const meuDoc = await getDoc(doc(db, "notas", userPhone));
        if (meuDoc.exists()) {
            const d = meuDoc.data();
            const xp = d.xp || 0;

            let pNome, pMin, pMax, pCor;

            if (xp <= 500) { 
                pNome = "Novato 🟢"; pMin = 0; pMax = 500; pCor = "#2ecc71"; 
            } else if (xp <= 1500) { 
                pNome = "Estudioso 🔵"; pMin = 501; pMax = 1500; pCor = "#3498db"; 
            } else if (xp <= 4000) { 
                pNome = "Veterano 🟣"; pMin = 1501; pMax = 4000; pCor = "#9b59b6"; 
            } else if (xp <= 8000) { 
                pNome = "Cérebro de Elite ⚡"; pMin = 4001; pMax = 8000; pCor = "#f1c40f"; 
            } else { 
                pNome = "Lenda do Hub 🏆"; pMin = 8001; pMax = 20000; pCor = "#e74c3c"; 
            }

            const progressoRelativo = ((xp - pMin) / (pMax - pMin)) * 100;
            const faltaParaProxima = pMax - xp;

            const materias = d.materias || [];
            let desempenho = 0;
            if (materias.length > 0) {
                const soma = materias.reduce((acc, m) => acc + (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4))/4, 0);
                desempenho = Math.round((soma / materias.length) * 10);
            }

            getEl('user-name-input').value = d.nome || "";
            getEl('display-phone').innerText = `ID: ${userPhone}`;
            if(d.avatar) getEl('avatar-icon').setAttribute('data-lucide', d.avatar);

            statsContainer.innerHTML = `
                <div class="xp-card">
                    <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:900;">
                        <span style="color:${pCor}; letter-spacing:1px;">PATENTE: ${pNome}</span>
                        <span style="color:#444;">${xp} XP TOTAL</span>
                    </div>
                    <div class="xp-bar-bg">
                        <div class="xp-bar-fill" style="width: ${progressoRelativo}%; background: ${pCor}; box-shadow: 0 0 15px ${pCor}aa;"></div>
                    </div>
                    <p class="hint" style="text-align:center; margin:0;">
                        ${faltaParaProxima > 0 ? `Faltam ${faltaParaProxima} XP para subir de rank` : 'Nível máximo atingido!'}
                    </p>
                </div>

                <div class="stat-grid">
                    <div class="stat-box">
                        <span style="color:#f1c40f;">#${minhaPosicao}</span>
                        <label>RANK GLOBAL</label>
                        <p class="hint" style="margin-top:5px; font-size:8px;">Posição no Hub</p>
                    </div>
                    <div class="stat-box">
                        <span style="color:#2ecc71;">${desempenho}%</span>
                        <label>DESEMPENHO</label>
                        <p class="hint" style="margin-top:5px; font-size:8px;">Aproveitamento total</p>
                    </div>
                </div>
            `;
            if(window.lucide) lucide.createIcons();
        }
    } catch (e) { console.error(e); }
}

window.abrirGaleria = () => getEl('modal-avatar').style.display = 'flex';
window.fecharGaleria = () => getEl('modal-avatar').style.display = 'none';
window.selecionarAvatar = (icon) => {
    getEl('avatar-icon').setAttribute('data-lucide', icon);
    lucide.createIcons();
    window.fecharGaleria();
};

getEl('btn-salvar-perfil').onclick = async () => {
    if (userType === 'local' || userPhone === '00000000000') {
        showToast("Visitantes não podem salvar alterações", "error");
        return;
    }

    const nome = getEl('user-name-input').value;
    const avatar = getEl('avatar-icon').getAttribute('data-lucide');
    
    try {
        // AJUSTE: updateDoc mantém seu XP intacto!
        await updateDoc(doc(db, "notas", userPhone), { nome, avatar });
        showToast("Perfil Atualizado!");
        // REMOVIDO: window.location.href = 'index.html' (agora você continua no perfil)
    } catch(e) { 
        console.error(e);
        showToast("Erro ao salvar", "error"); 
    }
};

window.logout = () => { localStorage.clear(); window.location.href = 'login.html'; };
