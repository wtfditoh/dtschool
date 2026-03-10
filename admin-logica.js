import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { /* SEU CONFIG AQUI */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// SEGURANÇA MÁXIMA
const emailMestre = "ditoh2008@gmail.com";
if (localStorage.getItem('dt_user_email') !== emailMestre) {
    alert("ACESSO NEGADO: Você não tem permissão de Mestre.");
    window.location.href = 'index.html';
}

async function carregarUsuarios() {
    const querySnapshot = await getDocs(collection(db, "notas"));
    const container = document.getElementById('lista-usuarios-admin');
    container.innerHTML = "";

    querySnapshot.forEach((userDoc) => {
        const u = userDoc.data();
        const card = document.createElement('div');
        card.className = 'user-admin-item';
        card.innerHTML = `
            <div class="user-info">
                <strong>${u.nome}</strong>
                <span>${u.email}</span>
                <span class="xp-badge">${u.xp} XP</span>
            </div>
            <div class="user-actions">
                <button onclick="editarXP('${userDoc.id}', ${u.xp})"><i data-lucide="edit-3"></i></button>
                <button onclick="banirUsuario('${userDoc.id}')" class="btn-del"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
    lucide.createIcons();
}

// FUNÇÃO PARA EDITAR XP DIRETO NO PAINEL
window.editarXP = async (id, xpAtual) => {
    const novoXP = prompt(`Alterar XP de ${id}:`, xpAtual);
    if (novoXP !== null) {
        await updateDoc(doc(db, "notas", id), { xp: Number(novoXP) });
        carregarUsuarios(); // Atualiza a lista
    }
};

// FUNÇÃO DE AVISO GLOBAL
window.postarAviso = async () => {
    const texto = document.getElementById('aviso-texto').value;
    if (!texto) return;
    
    await setDoc(doc(db, "config", "aviso_global"), {
        mensagem: texto,
        data: Date.now(),
        ativo: true
    });
    alert("Aviso enviado para todos os dispositivos!");
};

document.addEventListener('DOMContentLoaded', carregarUsuarios);
