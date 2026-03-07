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

// FUNÇÃO TOAST
window.showToast = (msg, type = "success") => {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.innerHTML = `<i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle'}"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    if(window.lucide) lucide.createIcons();
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        setTimeout(() => toast.remove(), 500); 
    }, 3000);
};

document.addEventListener('DOMContentLoaded', () => {
    if (!userPhone) return window.location.href = 'login.html';
    carregarPerfil();
});

async function carregarPerfil() {
    const statsContainer = document.getElementById('area-stats');
    
    // TRATAMENTO PARA VISITANTE
    if (userType === 'local') {
        document.getElementById('display-phone').innerText = `MODO VISITANTE`;
        document.getElementById('user-name-input').value = "Visitante";
        document.getElementById('user-name-input').disabled = true;
        statsContainer.innerHTML = `
            <div class="xp-card" style="border-color: #ff4444; background: rgba(255,68,68,0.05)">
                <p style="color: #ff4444; font-weight: 900; text-align: center; margin: 0;">MODO VISITANTE</p>
                <p class="hint" style="text-align:center; color: #666;">Crie uma conta para salvar seu progresso e XP.</p>
            </div>
        `;
        if(window.lucide) lucide.createIcons();
        return;
    }

    try {
        const docRef = doc(db, "notas", userPhone);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();
            const xpTotal = dados.xp || 0;

            const nivel = Math.floor(xpTotal / 500) + 1;
            const xpAtualNoNivel = xpTotal % 500;
            const faltaParaUpar = 500 - xpAtualNoNivel;
            const porcentagem = (xpAtualNoNivel / 500) * 100;

            document.getElementById('user-name-input').value = dados.nome || "";
            document.getElementById('display-phone').innerText = `ID: ${userPhone}`;
            if(dados.avatar) document.getElementById('avatar-icon').setAttribute('data-lucide', dados.avatar);

            const materias = dados.materias || [];
            let mediaGeral = "0.0";
            if (materias.length > 0) {
                const soma = materias.reduce((acc, m) => acc + (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4))/4, 0);
                mediaGeral = (soma / materias.length).toFixed(1);
            }

            statsContainer.innerHTML = `
                <div class="xp-card">
                    <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:900;">
                        <span style="color:#8a2be2; letter-spacing:1px;">NÍVEL ${nivel}</span>
                        <span style="color:#444;">${xpTotal} XP TOTAL</span>
                    </div>
                    <div class="xp-bar-bg">
                        <div class="xp-bar-fill" style="width: ${porcentagem}%"></div>
                    </div>
                    <p class="hint" style="text-align:center; margin:0;">
                        Faltam <span style="color:#8a2be2">${faltaParaUpar} XP</span> para subir de nível
                    </p>
                </div>

                <div class="stat-grid">
                    <div class="stat-box">
                        <span>${materias.length}</span>
                        <label>Disciplinas</label>
                        <p class="hint" style="margin:5px 0 0; font-size:8px;">Teu foco atual</p>
                    </div>
                    <div class="stat-box">
                        <span style="color:#2ecc71;">${mediaGeral}</span>
                        <label>Média Geral</label>
                        <p class="hint" style="margin:5px 0 0; font-size:8px;">Teu rendimento</p>
                    </div>
                </div>
            `;
            if(window.lucide) lucide.createIcons();
        }
    } catch (e) { 
        console.error(e);
        showToast("Erro ao carregar dados", "error");
    }
}

// FUNÇÕES DA GALERIA
window.abrirGaleria = () => document.getElementById('modal-avatar').style.display = 'flex';
window.fecharGaleria = () => document.getElementById('modal-avatar').style.display = 'none';
window.selecionarAvatar = (icon) => {
    document.getElementById('avatar-icon').setAttribute('data-lucide', icon);
    if(window.lucide) lucide.createIcons();
    window.fecharGaleria();
    showToast("Ícone selecionado!");
};

// SALVAR PERFIL
document.getElementById('btn-salvar-perfil').onclick = async () => {
    if (userType === 'local') return showToast("Visitantes não podem salvar!", "error");
    
    const nome = document.getElementById('user-name-input').value.trim();
    const avatar = document.getElementById('avatar-icon').getAttribute('data-lucide');
    
    if(!nome) return showToast("Digite um nome!", "error");

    try {
        await setDoc(doc(db, "notas", userPhone), { nome, avatar }, { merge: true });
        showToast("Perfil atualizado!");
        setTimeout(() => window.location.href = 'index.html', 1500);
    } catch(e) { 
        showToast("Erro ao salvar", "error");
    }
};

window.logout = () => { localStorage.clear(); window.location.href = 'login.html'; };
