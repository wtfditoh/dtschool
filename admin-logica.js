import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIGURAÇÃO FIREBASE
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

// --- 1. TRAVA DE SEGURANÇA ---
const emailMestre = "ditoh2008@gmail.com";
const emailLogado = (localStorage.getItem('dt_user_email') || "").toLowerCase();

if (emailLogado !== emailMestre.toLowerCase()) {
    document.body.innerHTML = "<h1 style='color:white; text-align:center; margin-top:50px;'>Acesso Negado</h1>";
    window.location.replace('index.html');
}

// --- 2. CARREGAR USUÁRIOS ---
async function carregarUsuarios() {
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
                <span>${u.email}</span>
                <span class="xp-badge">${u.xp || 0} XP</span>
            </div>
            <div class="user-actions">
                <button onclick="editarXP('${userDoc.id}', ${u.xp || 0})"><i data-lucide="edit-3"></i></button>
                <button onclick="banirUsuario('${userDoc.id}')" class="btn-del"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
    if (window.lucide) lucide.createIcons();
}

// --- 3. MODO MANUTENÇÃO (TRAVA GLOBAL) ---
window.toggleManutencao = async () => {
    const confirmacao = confirm("Deseja ALTERAR o status do sistema? (Alunos serão bloqueados/liberados)");
    if (!confirmacao) return;

    const acao = prompt("Digite 'ON' para ligar o sistema ou 'OFF' para entrar em MANUTENÇÃO:").toUpperCase();
    
    let status = false;
    if (acao === 'OFF') status = true; // Em manutenção = true
    else if (acao === 'ON') status = false; // Em manutenção = false
    else return alert("Comando inválido. Use ON ou OFF.");

    try {
        await setDoc(doc(db, "config", "status_sistema"), {
            emManutencao: status,
            updatedAt: Date.now()
        });
        alert(status ? "SISTEMA EM MANUTENÇÃO! (Bloqueado para alunos)" : "SISTEMA ONLINE! (Liberado)");
    } catch (e) {
        alert("Erro ao mudar status: " + e.message);
    }
};

// --- 4. AVISO GLOBAL ---
window.postarAviso = async () => {
    const texto = document.getElementById('aviso-texto').value;
    if (!texto) return alert("Digite um aviso!");

    try {
        await setDoc(doc(db, "config", "aviso_global"), {
            mensagem: texto,
            ativo: true,
            data: Date.now()
        });
        alert("📢 Aviso enviado!");
        document.getElementById('aviso-texto').value = "";
    } catch (e) {
        alert("Erro ao postar aviso.");
    }
};

window.removerAviso = async () => {
    if(!confirm("Deseja remover o aviso de todas as telas?")) return;
    await setDoc(doc(db, "config", "aviso_global"), { ativo: false });
    alert("Aviso removido.");
};

// --- 5. LIMPAR XP DUPLICADO ---
window.limparXPBugado = async () => {
    if(!confirm("Isso vai escanear o banco e apagar e-mails repetidos, mantendo o maior XP. Continuar?")) return;
    
    const querySnapshot = await getDocs(collection(db, "notas"));
    const historico = {};
    let removidos = 0;

    querySnapshot.forEach(userDoc => {
        const d = userDoc.data();
        const email = d.email.toLowerCase();

        if (historico[email]) {
            // Se já vimos esse e-mail, apaga o menor
            const anterior = historico[email];
            if (d.xp > anterior.xp) {
                deleteDoc(doc(db, "notas", anterior.id));
                historico[email] = { id: userDoc.id, xp: d.xp };
            } else {
                deleteDoc(doc(db, "notas", userDoc.id));
            }
            removidos++;
        } else {
            historico[email] = { id: userDoc.id, xp: d.xp };
        }
    });
    alert(`Limpeza feita! ${removidos} duplicatas apagadas.`);
    carregarUsuarios();
};

// --- FUNÇÕES DE EDIÇÃO ---
window.editarXP = async (id, xpAtual) => {
    const novoXP = prompt(`Novo XP para ${id}:`, xpAtual);
    if (novoXP !== null) {
        await updateDoc(doc(db, "notas", id), { xp: Number(novoXP) });
        carregarUsuarios();
    }
};

window.banirUsuario = async (id) => {
    if (confirm(`Deletar ${id} para sempre?`)) {
        await deleteDoc(doc(db, "notas", id));
        carregarUsuarios();
    }
};

document.addEventListener('DOMContentLoaded', carregarUsuarios);
