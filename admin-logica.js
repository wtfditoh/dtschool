import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- SISTEMA DE MODAL (MODO DEUS) ---
window.abrirModalAdmin = (titulo, desc, placeholder = "", callback, comInput = false) => {
    const modal = document.getElementById('modal-admin');
    const input = document.getElementById('modal-input');
    document.getElementById('modal-title').innerText = titulo;
    document.getElementById('modal-desc').innerText = desc;
    
    input.style.display = comInput ? 'block' : 'none';
    input.value = placeholder;

    modal.style.display = 'flex';
    document.getElementById('modal-confirm-btn').onclick = () => {
        callback(input.value);
        fecharModalAdmin();
    };
};

window.fecharModalAdmin = () => {
    document.getElementById('modal-admin').style.display = 'none';
};

// --- SEGURANÇA ---
const emailMestre = "ditoh2008@gmail.com";
const emailLogado = (localStorage.getItem('dt_user_email') || "").toLowerCase();

if (emailLogado !== emailMestre.toLowerCase()) {
    window.location.replace('index.html');
}

// --- LOGICA CORE ---
async function carregarUsuarios() {
    const container = document.getElementById('lista-usuarios-admin');
    const querySnapshot = await getDocs(collection(db, "notas"));
    container.innerHTML = "";

    querySnapshot.forEach((userDoc) => {
        const u = userDoc.data();
        const card = document.createElement('div');
        card.className = 'user-admin-item';
        card.innerHTML = `
            <div class="user-info">
                <strong>${u.nome || 'Usuário'}</strong>
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

window.editarXP = (id, xpAtual) => {
    abrirModalAdmin("EDITAR XP", `Qual o novo XP para este aluno?`, xpAtual, async (novo) => {
        if(novo !== "") {
            await updateDoc(doc(db, "notas", id), { xp: Number(novo) });
            carregarUsuarios();
        }
    }, true);
};

window.banirUsuario = (id) => {
    abrirModalAdmin("BANIR USUÁRIO", `Deseja apagar os dados de ${id} para sempre?`, "", async () => {
        await deleteDoc(doc(db, "notas", id));
        carregarUsuarios();
    }, false);
};

window.toggleManutencao = () => {
    abrirModalAdmin("MANUTENÇÃO", "Digite ON para Liberar ou OFF para Bloquear:", "", async (acao) => {
        const status = acao.toUpperCase() === 'OFF';
        await setDoc(doc(db, "config", "status_sistema"), { emManutencao: status, updatedAt: Date.now() });
        abrirModalAdmin("SUCESSO", status ? "Site bloqueado!" : "Site liberado!", "", () => {}, false);
    }, true);
};

window.postarAviso = async () => {
    const txt = document.getElementById('aviso-texto').value;
    if(!txt) return;
    await setDoc(doc(db, "config", "aviso_global"), { mensagem: txt, ativo: true, data: Date.now() });
    document.getElementById('aviso-texto').value = "";
    abrirModalAdmin("AVISO", "Mural atualizado para todos!", "", () => {}, false);
};

window.removerAviso = async () => {
    await setDoc(doc(db, "config", "aviso_global"), { ativo: false });
    abrirModalAdmin("AVISO", "Mural limpo.", "", () => {}, false);
};

window.limparXPBugado = () => {
    abrirModalAdmin("LIMPEZA", "Deseja remover e-mails duplicados agora?", "", async () => {
        const snap = await getDocs(collection(db, "notas"));
        const vistos = {};
        let r = 0;
        snap.forEach(d => {
            const email = d.data().email.toLowerCase();
            if(vistos[email]) {
                deleteDoc(doc(db, "notas", d.id));
                r++;
            } else vistos[email] = true;
        });
        abrirModalAdmin("SUCESSO", `${r} duplicatas removidas.`, "", () => { carregarUsuarios(); }, false);
    }, false);
};

document.addEventListener('DOMContentLoaded', carregarUsuarios);
