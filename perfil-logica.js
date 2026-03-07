import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

window.showToast = (msg, type = "success") => {
    const container = document.getElementById('toast-container');
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
    carregarPerfil();
});

async function carregarPerfil() {
    const statsContainer = document.getElementById('area-stats');
    
    if (userType === 'local') {
        document.getElementById('display-phone').innerText = `MODO VISITANTE`;
        statsContainer.innerHTML = `<div class="xp-card" style="border-color:#ff4444;text-align:center;"><p style="color:#ff4444;font-weight:900;">CONTA LOCAL</p><p class="hint">Sincronize para ver seu Rank!</p></div>`;
        return;
    }

    try {
        const docRef = doc(db, "notas", userPhone);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();
            const xpTotal = dados.xp || 0;

            // Dados para os novos cards
            const nivel = Math.floor(xpTotal / 500) + 1;
            const xpAtualNoNivel = xpTotal % 500;
            const faltaParaUpar = 500 - xpAtualNoNivel;
            const porcentagem = (xpAtualNoNivel / 500) * 100;

            // Lógica de Rank Fictícia (Pode ser integrada ao banco depois)
            const meuRank = xpTotal > 1000 ? "#12" : "#88"; 
            const comprometimento = xpTotal > 0 ? "98%" : "0%";

            document.getElementById('user-name-input').value = dados.nome || "";
            document.getElementById('display-phone').innerText = `ID: ${userPhone}`;
            if(dados.avatar) document.getElementById('avatar-icon').setAttribute('data-lucide', dados.avatar);

            statsContainer.innerHTML = `
                <div class="xp-card">
                    <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:900;">
                        <span style="color:#8a2be2;">NÍVEL ${nivel}</span>
                        <span style="color:#444;">${xpTotal} XP</span>
                    </div>
                    <div class="xp-bar-bg"><div class="xp-bar-fill" style="width: ${porcentagem}%"></div></div>
                    <p class="hint" style="text-align:center; margin:0;">Faltam ${faltaParaUpar} XP para o próximo nível</p>
                </div>

                <div class="stat-grid">
                    <div class="stat-box">
                        <span style="color:#f1c40f;">${meuRank}</span>
                        <label>RANK GLOBAL</label>
                        <p class="hint" style="margin-top:5px; font-size:8px;">Tua posição no mundo</p>
                    </div>
                    <div class="stat-box">
                        <span style="color:#00d2ff;">${comprometimento}</span>
                        <label>FOCO</label>
                        <p class="hint" style="margin-top:5px; font-size:8px;">Teu ritmo de estudo</p>
                    </div>
                </div>
            `;
            if(window.lucide) lucide.createIcons();
        }
    } catch (e) { console.error(e); }
}

// ... Restante das funções de Galeria, Salvar e Logout (Mantenha as mesmas do código anterior)
window.abrirGaleria = () => document.getElementById('modal-avatar').style.display = 'flex';
window.fecharGaleria = () => document.getElementById('modal-avatar').style.display = 'none';
window.selecionarAvatar = (icon) => {
    document.getElementById('avatar-icon').setAttribute('data-lucide', icon);
    if(window.lucide) lucide.createIcons();
    window.fecharGaleria();
};
document.getElementById('btn-salvar-perfil').onclick = async () => {
    const nome = document.getElementById('user-name-input').value;
    const avatar = document.getElementById('avatar-icon').getAttribute('data-lucide');
    try {
        await setDoc(doc(db, "notas", userPhone), { nome, avatar }, { merge: true });
        showToast("Perfil Atualizado!");
        setTimeout(() => window.location.href = 'index.html', 1000);
    } catch(e) { showToast("Erro ao salvar", "error"); }
};
window.logout = () => { localStorage.clear(); window.location.href = 'login.html'; };
