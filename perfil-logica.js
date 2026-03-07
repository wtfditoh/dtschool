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

// Funções globais para o HTML acessar
window.abrirGaleria = () => getEl('modal-avatar').style.display = 'flex';
window.fecharGaleria = () => getEl('modal-avatar').style.display = 'none';
window.selecionarAvatar = (icon) => {
    const iconEl = getEl('avatar-icon');
    iconEl.setAttribute('data-lucide', icon);
    if(window.lucide) lucide.createIcons();
    window.fecharGaleria();
};

window.logout = () => { localStorage.clear(); window.location.href = 'login.html'; };

document.addEventListener('DOMContentLoaded', () => {
    if (!userPhone) return window.location.href = 'login.html';
    carregarPerfilOficial();
    configurarBotaoSalvar();
});

async function carregarPerfilOficial() {
    const statsContainer = getEl('area-stats');
    const displayPhone = getEl('display-phone');

    if (userType === 'local' || userPhone === '00000000000') {
        displayPhone.innerText = `MODO VISITANTE`;
        // REMOVI A INJEÇÃO DA FRASE AQUI PARA NÃO DUPLICAR COM O HTML
        statsContainer.innerHTML = `<div class="xp-card" style="text-align:center; padding:30px; color:#666;">Crie uma conta para liberar suas estatísticas e ranking.</div>`;
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
            const d = d.data ? d.data() : meuDoc.data();
            const xp = d.xp || 0;

            let pNome, pMin, pMax, pCor;
            if (xp <= 500) { pNome = "Novato 🟢"; pMin = 0; pMax = 500; pCor = "#2ecc71"; }
            else if (xp <= 1500) { pNome = "Estudioso 🔵"; pMin = 501; pMax = 1500; pCor = "#3498db"; }
            else if (xp <= 4000) { pNome = "Veterano 🟣"; pMin = 1501; pMax = 4000; pCor = "#9b59b6"; }
            else if (xp <= 8000) { pNome = "Cérebro de Elite ⚡"; pMin = 4001; pMax = 8000; pCor = "#f1c40f"; }
            else { pNome = "Lenda do Hub 🏆"; pMin = 8001; pMax = 20000; pCor = "#e74c3c"; }

            const progressoRelativo = Math.min(((xp - pMin) / (pMax - pMin)) * 100, 100);
            const faltaParaProxima = pMax - xp;

            const materias = d.materias || [];
            let desempenho = 0;
            if (materias.length > 0) {
                const soma = materias.reduce((acc, m) => acc + (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4))/4, 0);
                desempenho = Math.round((soma / materias.length) * 10);
            }

            getEl('user-name-input').value = d.nome || "";
            displayPhone.innerText = `ID: ${userPhone}`;
            if(d.avatar) getEl('avatar-icon').setAttribute('data-lucide', d.avatar);

            statsContainer.innerHTML = `
                <div class="xp-card">
                    <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:900; margin-bottom:8px;">
                        <span style="color:${pCor}; letter-spacing:1px;">PATENTE: ${pNome}</span>
                        <span style="color:#888;">${xp} XP TOTAL</span>
                    </div>
                    <div class="xp-bar-bg" style="background:rgba(255,255,255,0.05); height:8px; border-radius:10px; overflow:hidden;">
                        <div class="xp-bar-fill" style="width: ${progressoRelativo}%; background: ${pCor}; height:100%; box-shadow: 0 0 15px ${pCor}aa; transition:1s;"></div>
                    </div>
                    <p class="hint" style="text-align:center; margin-top:10px; font-size:10px; color:#666;">
                        ${faltaParaProxima > 0 ? `Faltam ${faltaParaProxima} XP para subir de rank` : 'Nível máximo atingido!'}
                    </p>
                </div>
                <div class="stat-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:15px;">
                    <div class="stat-box" style="background:rgba(255,255,255,0.03); padding:15px; border-radius:15px; text-align:center; border:1px solid rgba(255,255,255,0.05);">
                        <span style="color:#f1c40f; font-size:18px; font-weight:900; display:block;">#${minhaPosicao}</span>
                        <label style="font-size:9px; color:#888; text-transform:uppercase;">RANK GLOBAL</label>
                    </div>
                    <div class="stat-box" style="background:rgba(255,255,255,0.03); padding:15px; border-radius:15px; text-align:center; border:1px solid rgba(255,255,255,0.05);">
                        <span style="color:#2ecc71; font-size:18px; font-weight:900; display:block;">${desempenho}%</span>
                        <label style="font-size:9px; color:#888; text-transform:uppercase;">DESEMPENHO</label>
                    </div>
                </div>
            `;
            if(window.lucide) lucide.createIcons();
        }
    } catch (e) { console.error("Erro ao carregar perfil:", e); }
}

function configurarBotaoSalvar() {
    const btn = getEl('btn-salvar-perfil');
    if(!btn) return;

    btn.onclick = async () => {
        // A TRAVA DE VISITANTE AQUI DENTRO DO JS:
        if (userType === 'local' || userPhone === '00000000000' || !userPhone) {
            const erroMsg = document.getElementById('erro-visitante');
            if(erroMsg) {
                erroMsg.style.display = 'block';
                if(navigator.vibrate) navigator.vibrate(200);
                setTimeout(() => erroMsg.style.display = 'none', 3000);
            }
            return; // PARA A EXECUÇÃO AQUI
        }

        // Se for real, salva:
        const nome = getEl('user-name-input').value;
        const avatar = getEl('avatar-icon').getAttribute('data-lucide');
        
        btn.innerText = "SALVANDO...";
        btn.disabled = true;

        try {
            await setDoc(doc(db, "notas", userPhone), { nome, avatar }, { merge: true });
            if(window.showToast) window.showToast("Perfil Atualizado!");
            else alert("Perfil Atualizado!");
            setTimeout(() => window.location.href = 'index.html', 1000);
        } catch(e) { 
            console.error(e);
            btn.innerText = "SALVAR ALTERAÇÕES";
            btn.disabled = false;
        }
    };
}
