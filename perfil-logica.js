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

document.addEventListener('DOMContentLoaded', () => {
    if (!userPhone) return window.location.href = 'login.html';
    carregarPerfil();
});

async function carregarPerfil() {
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

            const statsContainer = document.getElementById('area-stats');
            if (statsContainer) {
                const materias = dados.materias || [];
                let mediaGeral = "0.0";
                if (materias.length > 0) {
                    const soma = materias.reduce((acc, m) => acc + (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4))/4, 0);
                    mediaGeral = (soma / materias.length).toFixed(1);
                }

                // LIMPA TUDO E RECONSTRÓI
                statsContainer.innerHTML = `
                    <div class="xp-card">
                        <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:bold;">
                            <span style="color:#c287ff;">NÍVEL ${nivel}</span>
                            <span style="color:#888;">${xpTotal} XP</span>
                        </div>
                        <div class="xp-bar-bg">
                            <div class="xp-bar-fill" style="width: ${porcentagem}%"></div>
                        </div>
                        <div style="text-align:center; font-size:10px; color:#aaa; font-weight:bold;">
                            FALTAM <span style="color:#00d2ff;">${faltaParaUpar} XP</span> PARA O NÍVEL ${nivel + 1}
                        </div>
                    </div>

                    <div class="stat-grid">
                        <div class="stat-box">
                            <span>${materias.length}</span>
                            <label>Matérias</label>
                        </div>
                        <div class="stat-box">
                            <span style="color:#2ecc71;">${mediaGeral}</span>
                            <label>Média Geral</label>
                        </div>
                    </div>
                `;
            }
            if(window.lucide) lucide.createIcons();
        }
    } catch (e) { console.error(e); }
}

// GLOBAIS PARA O HTML ACESSAR
window.abrirGaleria = () => document.getElementById('modal-avatar').style.display = 'flex';
window.fecharGaleria = () => document.getElementById('modal-avatar').style.display = 'none';
window.selecionarAvatar = (icon) => {
    document.getElementById('avatar-icon').setAttribute('data-lucide', icon);
    lucide.createIcons();
    window.fecharGaleria();
};
window.logout = () => { localStorage.clear(); window.location.href = 'login.html'; };

document.getElementById('btn-salvar-perfil').onclick = async () => {
    const nome = document.getElementById('user-name-input').value;
    const avatar = document.getElementById('avatar-icon').getAttribute('data-lucide');
    try {
        await setDoc(doc(db, "notas", userPhone), { nome, avatar }, { merge: true });
        window.location.href = 'index.html';
    } catch(e) { alert("Erro ao salvar"); }
};
