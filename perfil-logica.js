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
    toast.innerHTML = `<i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle'}" style="flex-shrink:0;"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    if(window.lucide) lucide.createIcons();
    setTimeout(() => { 
        toast.style.transition = "0.5s";
        toast.style.opacity = '0'; 
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 500); 
    }, 3000);
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!userPhone) return window.location.href = 'login.html';
    document.getElementById('display-phone').innerText = `ID: ${userPhone}`;
    await carregarPerfil();
});

async function carregarPerfil() {
    try {
        const docRef = doc(db, "notas", userPhone);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();
            const xpTotal = dados.xp || 0;

            // --- LÓGICA DE NÍVEL ---
            const nivel = Math.floor(xpTotal / 500) + 1;
            const xpAtualNoNivel = xpTotal % 500;
            const porcentagem = (xpAtualNoNivel / 500) * 100;

            let patente = "Recruta";
            if (xpTotal >= 2000) patente = "Mestre";
            else if (xpTotal >= 1000) patente = "Veterano";
            else if (xpTotal >= 500) patente = "Estudioso";

            // Nome e Avatar
            document.getElementById('user-name-input').value = dados.nome || "";
            if(dados.avatar) {
                document.getElementById('avatar-icon').setAttribute('data-lucide', dados.avatar);
            }

            // --- INJEÇÃO DO NOVO DASHBOARD (LIMPA O ANTIGO) ---
            const statsContainer = document.querySelector('.perfil-stats');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div style="background: rgba(138,43,226,0.1); border: 1px solid rgba(138,43,226,0.3); padding: 15px; border-radius: 20px; text-align: left;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="font-weight: 900; color: #c287ff; font-size: 13px;">${patente} • LVL ${nivel}</span>
                            <span style="font-size: 11px; color: #888;">${xpTotal} XP</span>
                        </div>
                        <div style="background: rgba(0,0,0,0.3); height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${porcentagem}%; background: linear-gradient(90deg, #8a2be2, #00d2ff); height: 100%; transition: 1s;"></div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%;">
                        <div class="stat-box">
                            <span>${(dados.materias || []).length}</span>
                            <label>Matérias</label>
                        </div>
                        <div class="stat-box">
                            <span id="media-geral-txt">0.0</span>
                            <label>Média Geral</label>
                        </div>
                    </div>
                `;

                // Calcular Média
                const materias = dados.materias || [];
                if (materias.length > 0) {
                    const soma = materias.reduce((acc, m) => acc + (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4))/4, 0);
                    document.getElementById('media-geral-txt').innerText = (soma / materias.length).toFixed(1);
                }
            }
            if(window.lucide) lucide.createIcons();
        }
    } catch (e) { console.error(e); }
}

document.getElementById('btn-salvar-perfil').onclick = async () => {
    const novoNome = document.getElementById('user-name-input').value.trim();
    if (!novoNome) return showToast("Nickname vazio!", "error");
    if (userType === 'local') return showToast("Crie uma conta para salvar!", "error");

    const btn = document.getElementById('btn-salvar-perfil');
    btn.innerText = "SINCRONIZANDO...";
    btn.disabled = true;

    try {
        const avatarAtual = document.getElementById('avatar-icon').getAttribute('data-lucide');
        await setDoc(doc(db, "notas", userPhone), { 
            nome: novoNome,
            avatar: avatarAtual 
        }, { merge: true });

        showToast("Perfil atualizado! 🔥");
        setTimeout(() => window.location.href = 'index.html', 1000);
    } catch (e) {
        showToast("Falha ao salvar.", "error");
    } finally {
        btn.innerHTML = '<i data-lucide="check-circle"></i> SALVAR ALTERAÇÕES';
        btn.disabled = false;
        if(window.lucide) lucide.createIcons();
    }
};

window.abrirGaleria = () => document.getElementById('modal-avatar').style.display = 'flex';
window.fecharGaleria = () => document.getElementById('modal-avatar').style.display = 'none';
window.selecionarAvatar = (icon) => {
    document.getElementById('avatar-icon').setAttribute('data-lucide', icon);
    if(window.lucide) lucide.createIcons();
    fecharGaleria();
    showToast("Ícone selecionado!");
};

window.logout = () => { localStorage.clear(); window.location.href = 'login.html'; };
