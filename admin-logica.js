import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// COLE O SEU CONFIG REAL AQUI PARA FUNCIONAR
const firebaseConfig = {
  apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
  authDomain: "dt-scho0l.firebaseapp.com",
  projectId: "dt-scho0l",
  storageBucket: "dt-scho0l.firebasestorage.app",
  messagingSenderId: "78578509391",
  appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a",
  measurementId: "G-F7TG23TBTL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 1. TRAVA DE SEGURANÇA BLINDADA ---
const emailMestre = "ditoh2008@gmail.com";
const emailLogado = (localStorage.getItem('dt_user_email') || "").toLowerCase();

if (emailLogado !== emailMestre.toLowerCase()) {
    document.body.innerHTML = "<div style='color:white; background:#0d0d0d; height:100vh; display:flex; align-items:center; justify-content:center; font-family:sans-serif;'><h1>⚠️ Acesso Negado: Redirecionando...</h1></div>";
    setTimeout(() => {
        window.location.replace('index.html');
    }, 1500);
}

// --- 2. CARREGAR LISTA DE USUÁRIOS ---
async function carregarUsuarios() {
    try {
        const querySnapshot = await getDocs(collection(db, "notas"));
        const container = document.getElementById('lista-usuarios-admin');
        if (!container) return;
        
        container.innerHTML = "";

        querySnapshot.forEach((userDoc) => {
            const u = userDoc.data();
            const card = document.createElement('div');
            card.className = 'user-admin-item';
            card.innerHTML = `
                <div class="user-info">
                    <strong>${u.nome || 'Sem Nome'}</strong>
                    <span>${u.email || 'Sem E-mail'}</span>
                    <span class="xp-badge">${u.xp || 0} XP</span>
                </div>
                <div class="user-actions">
                    <button onclick="editarXP('${userDoc.id}', ${u.xp || 0})"><i data-lucide="edit-3"></i></button>
                    <button onclick="banirUsuario('${userDoc.id}')" class="btn-del" style="color:#ff4444;"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            container.appendChild(card);
        });

        if (window.lucide) lucide.createIcons();
    } catch (error) {
        console.error("Erro ao carregar usuários:", error);
    }
}

// --- 3. FUNÇÕES GLOBAIS (WINDOW) ---

// Editar XP
window.editarXP = async (id, xpAtual) => {
    const novoXP = prompt(`Alterar XP de ${id}:`, xpAtual);
    if (novoXP !== null && novoXP !== "") {
        try {
            await updateDoc(doc(db, "notas", id), { xp: Number(novoXP) });
            carregarUsuarios();
        } catch (e) {
            alert("Erro ao atualizar XP.");
        }
    }
};

// Banir Usuário
window.banirUsuario = async (id) => {
    if (confirm(`⚠️ CUIDADO: Deseja apagar permanentemente os dados de ${id}?`)) {
        try {
            await deleteDoc(doc(db, "notas", id));
            alert("Usuário removido!");
            carregarUsuarios();
        } catch (e) {
            alert("Erro ao deletar usuário.");
        }
    }
};

// Postar Aviso Global
window.postarAviso = async () => {
    const texto = document.getElementById('aviso-texto').value;
    if (!texto) return alert("Escreva algo antes de enviar!");
    
    try {
        await setDoc(doc(db, "config", "aviso_global"), {
            mensagem: texto,
            data: Date.now(),
            ativo: true
        });
        alert("📢 Aviso postado com sucesso!");
        document.getElementById('aviso-texto').value = "";
    } catch (e) {
        alert("Erro ao postar aviso.");
    }
};

// --- 4. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', carregarUsuarios);
