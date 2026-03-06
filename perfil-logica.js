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
const userType = localStorage.getItem('dt_user_type'); // 'local' ou 'cloud'

// FUNÇÃO TOAST PREMIUM - CORRIGIDA
window.showToast = (msg, type = "success") => {
    const container = document.getElementById('toast-container');
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
    
    // Alerta inicial se for visitante
    if (userType === 'local') {
        setTimeout(() => showToast("Modo Visitante: Nickname desativado.", "error"), 500);
    }

    await carregarPerfil();
    lucide.createIcons();
});

async function carregarPerfil() {
    try {
        const docRef = doc(db, "notas", userPhone);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();
            document.getElementById('user-name-input').value = dados.nome || "";
            
            if(dados.avatar) {
                document.getElementById('avatar-icon').setAttribute('data-lucide', dados.avatar);
            }

            const materias = dados.materias || [];
            document.getElementById('stat-materias').innerText = materias.length;
            if (materias.length > 0) {
                const soma = materias.reduce((acc, m) => acc + (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4))/4, 0);
                document.getElementById('stat-media').innerText = (soma / materias.length).toFixed(1);
            }
        }
    } catch (e) { console.error(e); }
}

document.getElementById('btn-salvar-perfil').onclick = async () => {
    const novoNome = document.getElementById('user-name-input').value.trim();
    const btn = document.getElementById('btn-salvar-perfil');

    if (!novoNome) return showToast("Nickname vazio? Escolha um!", "error");

    // BLOQUEIO DE VISITANTE - O MOTIVO DO SEU ANTIGO ERRO
    if (userType === 'local') {
        showToast("Crie uma conta para entrar no Ranking Global!", "error");
        return;
    }

    btn.innerText = "SINCRONIZANDO...";
    btn.disabled = true;

    try {
        const userRef = doc(db, "notas", userPhone);
        const avatarAtual = document.getElementById('avatar-icon').getAttribute('data-lucide');

        await setDoc(userRef, { 
            nome: novoNome,
            avatar: avatarAtual 
        }, { merge: true });

        showToast("Perfil atualizado com sucesso! 🔥");
        setTimeout(() => window.location.href = 'index.html', 1500);
    } catch (e) {
        showToast("Falha ao salvar. Verifique a rede.", "error");
    } finally {
        btn.innerHTML = '<i data-lucide="check-circle"></i> SALVAR ALTERAÇÕES';
        btn.disabled = false;
        lucide.createIcons();
    }
};

// CONTROLO DA GALERIA
window.abrirGaleria = () => document.getElementById('modal-avatar').style.display = 'flex';
window.fecharGaleria = () => document.getElementById('modal-avatar').style.display = 'none';
window.selecionarAvatar = (icon) => {
    document.getElementById('avatar-icon').setAttribute('data-lucide', icon);
    lucide.createIcons();
    fecharGaleria();
    showToast("Ícone selecionado!");
};

window.logout = () => {
    localStorage.clear();
    window.location.href = 'login.html';
};
