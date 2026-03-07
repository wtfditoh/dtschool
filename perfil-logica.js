import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
    carregarPerfilReal();
});

async function carregarPerfilReal() {
    const statsContainer = getEl('area-stats');
    if (userType === 'local') {
        getEl('display-phone').innerText = `VISITANTE`;
        statsContainer.innerHTML = `<div class="xp-card"><p class="hint">Crie uma conta para ver seu Rank!</p></div>`;
        return;
    }

    try {
        // 1. BUSCAR TODOS OS USUÁRIOS PARA CALCULAR O RANK REAL
        const querySnapshot = await getDocs(collection(db, "notas"));
        let todosUsuarios = [];
        querySnapshot.forEach(doc => {
            todosUsuarios.push({ id: doc.id, xp: doc.data().xp || 0 });
        });

        // Ordenar por XP (Maior para menor)
        todosUsuarios.sort((a, b) => b.xp - a.xp);
        
        // Achar minha posição
        const minhaPosicao = todosUsuarios.findIndex(u => u.id === userPhone) + 1;

        // 2. BUSCAR MEUS DADOS ESPECÍFICOS
        const meuDoc = await getDoc(doc(db, "notas", userPhone));
        if (meuDoc.exists()) {
            const d = meuDoc.data();
            const xpTotal = d.xp || 0;
            const nivel = Math.floor(xpTotal / 500) + 1;
            const progresso = ((xpTotal % 500) / 500) * 100;

            // Lógica de FOCO (Média das notas)
            const materias = d.materias || [];
            let focoPorcentagem = 0;
            if (materias.length > 0) {
                const soma = materias.reduce((acc, m) => acc + (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4))/4, 0);
                focoPorcentagem = Math.round((soma / materias.length) * 10); // Ex: média 8.5 vira 85%
            }

            getEl('user-name-input').value = d.nome || "";
            getEl('display-phone').innerText = `ID: ${userPhone}`;
            if(d.avatar) getEl('avatar-icon').setAttribute('data-lucide', d.avatar);

            statsContainer.innerHTML = `
                <div class="xp-card">
                    <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:900;">
                        <span style="color:#8a2be2;">NÍVEL ${nivel}</span>
                        <span style="color:#444;">${xpTotal} XP</span>
                    </div>
                    <div class="xp-bar-bg"><div class="xp-bar-fill" style="width: ${progresso}%"></div></div>
                    <p class="hint" style="text-align:center; margin:0;">Faltam ${500 - (xpTotal % 500)} XP para o próximo nível</p>
                </div>

                <div class="stat-grid">
                    <div class="stat-box">
                        <span style="color:#f1c40f;">#${minhaPosicao}</span>
                        <label>RANK GLOBAL</label>
                        <p class="hint" style="margin-top:5px; font-size:8px;">Sua posição real</p>
                    </div>
                    <div class="stat-box">
                        <span style="color:#00d2ff;">${focoPorcentagem}%</span>
                        <label>FOCO</label>
                        <p class="hint" style="margin-top:5px; font-size:8px;">Baseado em suas notas</p>
                    </div>
                </div>
            `;
            if(window.lucide) lucide.createIcons();
        }
    } catch (e) { console.error(e); }
}

// Funções de interface permanecem as mesmas
window.abrirGaleria = () => getEl('modal-avatar').style.display = 'flex';
window.fecharGaleria = () => getEl('modal-avatar').style.display = 'none';
window.selecionarAvatar = (icon) => {
    getEl('avatar-icon').setAttribute('data-lucide', icon);
    lucide.createIcons();
    window.fecharGaleria();
};
getEl('btn-salvar-perfil').onclick = async () => {
    const nome = getEl('user-name-input').value;
    const avatar = getEl('avatar-icon').getAttribute('data-lucide');
    try {
        await setDoc(doc(db, "notas", userPhone), { nome, avatar }, { merge: true });
        showToast("Perfil Atualizado!");
        setTimeout(() => window.location.href = 'index.html', 1000);
    } catch(e) { showToast("Erro ao salvar", "error"); }
};
window.logout = () => { localStorage.clear(); window.location.href = 'login.html'; };
