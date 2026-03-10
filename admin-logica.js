import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, updateDoc, setDoc, deleteDoc, onSnapshot, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// SEGURANÇA
const emailMestre = "ditoh2008@gmail.com";
if ((localStorage.getItem('dt_user_email') || "").toLowerCase() !== emailMestre) {
    window.location.replace('index.html');
}

// MONITOR EM TEMPO REAL
function carregarPainelLive() {
    const q = query(collection(db, "notas"), orderBy("xp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        const logsContainer = document.getElementById('logs-container');
        const listaUsuarios = document.getElementById('lista-usuarios-admin');
        
        let logsHTML = "";
        let usuariosHTML = "";
        let totalXP = 0;
        let totalMats = 0;
        let count = 0;

        // Pegar as atividades mais recentes para os logs (baseado em quem atualizou por último)
        const atividades = [...snapshot.docs].sort((a,b) => (b.data().atualizadoEm || 0) - (a.data().atualizadoEm || 0));

        atividades.slice(0, 10).forEach(doc => {
            const u = doc.data();
            const hora = u.atualizadoEm ? new Date(u.atualizadoEm).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '--:--';
            logsHTML += `
                <div class="log-item">
                    <span class="log-time">${hora}</span>
                    <span class="log-text"><strong>${u.nome}</strong> sincronizou dados.</span>
                </div>
            `;
        });

        snapshot.forEach((userDoc) => {
            const u = userDoc.data();
            count++;
            totalXP += (u.xp || 0);
            totalMats += (u.materias ? u.materias.length : 0);

            usuariosHTML += `
                <div class="user-admin-item">
                    <div class="user-info">
                        <strong>${u.nome} <span class="tag-mats">${u.materias?.length || 0} mats</span></strong>
                        <span>${u.email}</span>
                        <span class="xp-badge">${u.xp || 0} XP</span>
                    </div>
                    <div class="user-actions">
                        <button onclick="verMateriasUser('${userDoc.id}')"><i data-lucide="book-open"></i></button>
                        <button onclick="editarXP('${userDoc.id}', ${u.xp || 0})"><i data-lucide="zap"></i></button>
                        <button onclick="banirUsuario('${userDoc.id}')" class="btn-del"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>
            `;
        });

        logsContainer.innerHTML = logsHTML || "Nenhuma atividade.";
        listaUsuarios.innerHTML = usuariosHTML;
        document.getElementById('total-users').innerText = count;
        document.getElementById('avg-xp').innerText = count > 0 ? Math.floor(totalXP / count) : 0;
        document.getElementById('total-materias').innerText = totalMats;

        if (window.lucide) lucide.createIcons();
    });
}

// AÇÕES GLOBAIS
window.verMateriasUser = async (id) => {
    const snap = await getDocs(collection(db, "notas"));
    const u = snap.docs.find(d => d.id === id)?.data();
    if(u && u.materias) {
        const lista = u.materias.map(m => `• ${m.nome}`).join('<br>');
        abrirModalAdmin(`DISCIPLINAS DE ${u.nome.toUpperCase()}`, lista || "Vazio", "", () => {}, false);
    }
};

window.editarXP = (id, xp) => {
    abrirModalAdmin("EDITAR XP", "Digite o novo valor:", xp, async (val) => {
        await updateDoc(doc(db, "notas", id), { xp: Number(val), atualizadoEm: Date.now() });
    }, true);
};

window.banirUsuario = (id) => {
    abrirModalAdmin("BANIR", `Excluir permanentemente ${id}?`, "", async () => {
        await deleteDoc(doc(db, "notas", id));
    }, false);
};

window.toggleManutencao = async () => {
    abrirModalAdmin("SISTEMA", "Digite OFF para bloquear ou ON para liberar:", "", async (val) => {
        const bloqueado = val.toUpperCase() === 'OFF';
        await setDoc(doc(db, "config", "status_sistema"), { emManutencao: bloqueado });
    }, true);
};

window.postarAviso = async () => {
    const t = document.getElementById('aviso-texto');
    if(!t.value) return;
    await setDoc(doc(db, "config", "aviso_global"), { mensagem: t.value, ativo: true });
    t.value = "";
    abrirModalAdmin("SUCESSO", "Mural atualizado!", "", () => {}, false);
};

window.removerAviso = async () => {
    await setDoc(doc(db, "config", "aviso_global"), { ativo: false });
};

// MODAL ENGINE
window.abrirModalAdmin = (titulo, desc, placeholder = "", callback, comInput = false) => {
    const modal = document.getElementById('modal-admin');
    const input = document.getElementById('modal-input');
    document.getElementById('modal-title').innerText = titulo;
    document.getElementById('modal-desc').innerHTML = desc;
    input.style.display = comInput ? 'block' : 'none';
    input.value = placeholder;
    modal.style.display = 'flex';
    document.getElementById('modal-confirm-btn').onclick = () => { callback(input.value); fecharModalAdmin(); };
};
window.fecharModalAdmin = () => document.getElementById('modal-admin').style.display = 'none';

document.addEventListener('DOMContentLoaded', carregarPainelLive);
