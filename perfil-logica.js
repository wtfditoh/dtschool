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

// FUNÇÃO TOAST PREMIUM
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
    
    // Aplicar fundo roxo no container pai se necessário
    const painel = document.getElementById('painel-perfil');
    if(painel) painel.style.background = "linear-gradient(135deg, #1a0b2e 0%, #0f051a 100%)";

    document.getElementById('display-phone').innerText = `ID: ${userPhone}`;
    
    if (userType === 'local') {
        setTimeout(() => showToast("Modo Visitante: Dados locais apenas.", "error"), 500);
    }

    await carregarPerfil();
});

async function carregarPerfil() {
    try {
        const docRef = doc(db, "notas", userPhone);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();
            const xpTotal = dados.xp || 0;

            // --- LÓGICA DE NÍVEL E PATENTE ---
            const nivel = Math.floor(xpTotal / 500) + 1;
            const xpParaProximo = nivel * 500;
            const xpAtualNoNivel = xpTotal % 500;
            const progressoPorcentagem = (xpAtualNoNivel / 500) * 100;

            let patente = "Recruta";
            let corPatente = "#aaa";
            if (xpTotal >= 2000) { patente = "Mestre"; corPatente = "#ff4444"; }
            else if (xpTotal >= 1000) { patente = "Veterano"; corPatente = "#8a2be2"; }
            else if (xpTotal >= 500) { patente = "Estudioso"; corPatente = "#00d2ff"; }

            // Atualizar UI do Nickname e Avatar
            document.getElementById('user-name-input').value = dados.nome || "";
            if(dados.avatar) {
                document.getElementById('avatar-icon').setAttribute('data-lucide', dados.avatar);
            }

            // Injetar o Dashboard de Status (Substitui as médias repetidas)
            const statsContainer = document.getElementById('stats-grid-perfil') || document.querySelector('.stats-container');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="perfil-card-status" style="grid-column: span 2; background: rgba(138,43,226,0.1); border: 1px solid rgba(138,43,226,0.3); padding: 15px; border-radius: 15px; margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span style="font-weight: bold; color:${corPatente}">${patente} • Nível ${nivel}</span>
                            <span style="font-size: 12px; color: #888;">${xpTotal} XP Total</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${progressoPorcentagem}%; background: linear-gradient(90deg, #8a2be2, #00d2ff); height: 100%; transition: 1s;"></div>
                        </div>
                        <p style="font-size: 10px; color: #666; margin-top: 5px;">Faltam ${500 - xpAtualNoNivel} XP para o LVL ${nivel + 1}</p>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%;">
                        <div class="stat-box" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; text-align: center;">
                            <small style="color: #888; display: block; margin-bottom: 5px;">Matérias</small>
                            <b style="font-size: 20px; color: #fff;">${(dados.materias || []).length}</b>
                        </div>
                        <div class="stat-box" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; text-align: center;">
                            <small style="color: #888; display: block; margin-bottom: 5px;">Média Geral</small>
                            <b id="stat-media-perfil" style="font-size: 20px; color: #2ecc71;">0.0</b>
                        </div>
                    </div>
                `;

                // Calcular Média Real
                const materias = dados.materias || [];
                if (materias.length > 0) {
                    const soma = materias.reduce((acc, m) => acc + (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4))/4, 0);
                    const mediaGeral = (soma / materias.length).toFixed(1);
                    document.getElementById('stat-media-perfil').innerText = mediaGeral;
                }
            }
            if(window.lucide) lucide.createIcons();
        }
    } catch (e) { console.error("Erro ao carregar perfil:", e); }
}

// SALVAR PERFIL
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
        lucide.createIcons();
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
