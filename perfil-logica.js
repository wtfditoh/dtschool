import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { CONQUISTAS, verificarConquistas } from "./conquistas.js";

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
const auth = getAuth(app);

const userName = localStorage.getItem('dt_user_name'); 
const userType = (userName === 'Visitante') ? 'local' : 'oficial';
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

onAuthStateChanged(auth, (user) => {
    if (user || userType === 'local') {
        carregarPerfilOficial(user);
    } else {
        window.location.href = 'login.html';
    }
});

async function carregarPerfilOficial(userFirebase) {
    const statsContainer = getEl('area-stats');
    
    if (userType === 'local' || !userFirebase) {
        getEl('display-id').innerText = `VISITANTE`;
        getEl('user-name-input').value = "Visitante";
        statsContainer.innerHTML = `<div class="xp-card"><p class="hint" style="text-align:center;">Entre para subir nas patentes e entrar no ranking global!</p></div>`;
        getEl('meta-card').style.display = 'none';
        getEl('area-conquistas').style.display = 'none';
        return;
    }

    try {
        const userEmail = userFirebase.email; 
        const shortID = userFirebase.uid.substring(0, 8).toUpperCase();
        getEl('display-id').innerText = `#HB-${shortID}`;

        const querySnapshot = await getDocs(collection(db, "notas"));
        let todos = [];
        querySnapshot.forEach(d => todos.push({ id: d.id, xp: d.data().xp || 0 }));
        todos.sort((a, b) => b.xp - a.xp);
        const minhaPosicao = todos.findIndex(u => u.id === userEmail) + 1;

        const meuDoc = await getDoc(doc(db, "notas", userEmail));
        
        if (meuDoc.exists()) {
            const d = meuDoc.data();
            const xp = d.xp || 0;

            let pNome, pMin, pMax, pCor;
            if (xp <= 500)       { pNome = "Novato 🟢";           pMin = 0;    pMax = 500;   pCor = "#2ecc71"; }
            else if (xp <= 1500) { pNome = "Estudioso 🔵";        pMin = 501;  pMax = 1500;  pCor = "#3498db"; }
            else if (xp <= 4000) { pNome = "Veterano 🟣";         pMin = 1501; pMax = 4000;  pCor = "#9b59b6"; }
            else if (xp <= 8000) { pNome = "Cérebro de Elite ⚡"; pMin = 4001; pMax = 8000;  pCor = "#f1c40f"; }
            else                 { pNome = "Lenda do Hub 🏆";      pMin = 8001; pMax = 20000; pCor = "#e74c3c"; }

            const progressoRelativo = ((xp - pMin) / (pMax - pMin)) * 100;
            const faltaParaProxima = pMax - xp;
            const materias = d.materias || [];
            let desempenho = 0;
            if (materias.length > 0) {
                const soma = materias.reduce((acc, m) => acc + (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4))/4, 0);
                desempenho = Math.round((soma / materias.length) * 10);
            }

            getEl('user-name-input').value = d.nome || userFirebase.displayName || "";
            if(d.avatar) {
                getEl('avatar-icon').setAttribute('data-lucide', d.avatar);
                if(window.lucide) lucide.createIcons();
            }

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
                        <span style="color:#f1c40f;">#${minhaPosicao > 0 ? minhaPosicao : '--'}</span>
                        <label>RANK GLOBAL</label>
                        <p class="hint" style="margin-top:5px; font-size:8px;">Posição no Hub</p>
                    </div>
                    <div class="stat-box">
                        <span style="color:#2ecc71;">${desempenho}%</span>
                        <label>DESEMPENHO</label>
                        <p class="hint" style="margin-top:5px; font-size:8px;">Aproveitamento total</p>
                    </div>
                </div>`;

            // Meta
            if (d.meta_minutos) {
                const h = Math.floor(d.meta_minutos / 60);
                const m = d.meta_minutos % 60;
                getEl('meta-h-val').innerText = h;
                getEl('meta-m-val').innerText = m;
                atualizarBadgeMeta(d.meta_minutos);
            }

            // Conquistas
            renderizarConquistas(d.conquistas || [], minhaPosicao);

            if(window.lucide) lucide.createIcons();
        } else {
            if (userType !== 'local') {
                await setDoc(doc(db, "notas", userEmail), { 
                    nome: userName || "Estudante", xp: 0, avatar: 'user', materias: []
                });
            }
        }
    } catch (e) { console.error(e); }
}

// --- CONQUISTAS ---
function renderizarConquistas(conquistasDesbloqueadas, rankPos) {
    const area = getEl('area-conquistas');
    if (!area) return;

    const categorias = {
        foco:     { label: '🔥 Sequência de Foco',  items: [] },
        horas:    { label: '⏱️ Horas Estudadas',     items: [] },
        metas:    { label: '🎯 Metas',               items: [] },
        tarefas:  { label: '📋 Tarefas',             items: [] },
        notas:    { label: '📚 Notas',               items: [] },
        ranking:  { label: '🏆 Ranking',             items: [] },
        especial: { label: '🧠 Especiais',           items: [] },
    };

    CONQUISTAS.forEach(c => {
        if (categorias[c.categoria]) categorias[c.categoria].items.push(c);
    });

    const total = CONQUISTAS.length;
    const desbloqueadas = conquistasDesbloqueadas.length;

    area.innerHTML = `
        <div class="conquistas-header">
            <span class="conquistas-title">CONQUISTAS</span>
            <span class="conquistas-count">${desbloqueadas}/${total}</span>
        </div>
        <div class="conquistas-barra-bg">
            <div class="conquistas-barra-fill" style="width:${Math.round((desbloqueadas/total)*100)}%"></div>
        </div>
        ${Object.values(categorias).map(cat => `
            <div class="conquista-categoria">
                <span class="conquista-cat-label">${cat.label}</span>
                <div class="conquista-grid">
                    ${cat.items.map(c => {
                        const desbloqueada = conquistasDesbloqueadas.includes(c.id);
                        return `
                        <div class="conquista-item ${desbloqueada ? 'desbloqueada' : 'bloqueada'}">
                            <div class="conquista-emoji">${desbloqueada ? c.emoji : '🔒'}</div>
                            <div class="conquista-nome">${c.nome}</div>
                            <div class="conquista-desc">${c.desc}</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `).join('')}
    `;

    if(window.lucide) lucide.createIcons();
}

// --- AVATAR ---
window.abrirGaleria = () => getEl('modal-avatar').style.display = 'flex';
window.fecharGaleria = () => getEl('modal-avatar').style.display = 'none';
window.selecionarAvatar = (icon) => {
    getEl('avatar-icon').setAttribute('data-lucide', icon);
    if(window.lucide) lucide.createIcons();
    window.fecharGaleria();
};

// --- SALVAR PERFIL ---
getEl('btn-salvar-perfil').onclick = async () => {
    if (userType === 'local') { showToast("Visitantes não podem salvar alterações", "error"); return; }
    const user = auth.currentUser;
    if(!user) return;
    const nome = getEl('user-name-input').value;
    const avatar = getEl('avatar-icon').getAttribute('data-lucide');
    try {
        await updateDoc(doc(db, "notas", user.email), { nome, avatar });
        showToast("Perfil Atualizado!");
    } catch(e) { showToast("Erro ao salvar", "error"); }
};

// --- META ---
function atualizarBadgeMeta(totalMin) {
    const badge = getEl('meta-badge');
    if (!badge) return;
    if (totalMin === 0) { badge.innerText = 'Não definida'; return; }
    const h = Math.floor(totalMin / 60), m = totalMin % 60;
    badge.innerText = h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`;
}

const getMetaH = () => parseInt(getEl('meta-h-val').innerText);
const getMetaM = () => parseInt(getEl('meta-m-val').innerText);

getEl('meta-h-up').onclick   = () => { const v = getMetaH(); if(v < 12) getEl('meta-h-val').innerText = v + 1; atualizarBadgeMeta(getMetaH()*60 + getMetaM()); };
getEl('meta-h-down').onclick  = () => { const v = getMetaH(); if(v > 0) getEl('meta-h-val').innerText = v - 1; atualizarBadgeMeta(getMetaH()*60 + getMetaM()); };
getEl('meta-m-up').onclick   = () => { const v = getMetaM(); getEl('meta-m-val').innerText = v < 55 ? v + 5 : 0; atualizarBadgeMeta(getMetaH()*60 + getMetaM()); };
getEl('meta-m-down').onclick  = () => { const v = getMetaM(); if(v >= 5) getEl('meta-m-val').innerText = v - 5; atualizarBadgeMeta(getMetaH()*60 + getMetaM()); };

getEl('btn-salvar-meta').onclick = async () => {
    const user = auth.currentUser;
    if (!user) { showToast("Faça login para salvar a meta", "error"); return; }
    const totalMin = getMetaH() * 60 + getMetaM();
    try {
        await updateDoc(doc(db, "notas", user.email), { meta_minutos: totalMin });
        showToast('Meta salva!');
        atualizarBadgeMeta(totalMin);
    } catch(e) { showToast('Erro ao salvar meta', 'error'); }
};

window.logout = () => { localStorage.clear(); window.location.href = 'login.html'; };
    
