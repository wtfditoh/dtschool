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

// SNAPSHOT EM TEMPO REAL (DATABASE + LOGS)
function iniciarMonitoramento() {
    const q = query(collection(db, "notas"), orderBy("xp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        const logsContainer = document.getElementById('logs-container');
        const listaUsuarios = document.getElementById('lista-usuarios-admin');
        
        let usuariosHTML = "";
        let logsHTML = "";
        let totalXP = 0, totalMats = 0, count = 0;

        // Ordenar para Logs (por atualização recente)
        const sortedDocs = [...snapshot.docs].sort((a,b) => (b.data().atualizadoEm || 0) - (a.data().atualizadoEm || 0));

        sortedDocs.slice(0, 12).forEach(d => {
            const u = d.data();
            const hora = u.atualizadoEm ? new Date(u.atualizadoEm).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '--:--';
            logsHTML += `<div class="log-entry"><span class="t-purp">${hora}</span> <span><b>${u.nome}</b> sincronizou dados</span></div>`;
        });

        snapshot.forEach((userDoc) => {
            const u = userDoc.data();
            count++;
            totalXP += (u.xp || 0);
            totalMats += (u.materias ? u.materias.length : 0);

            usuariosHTML += `
                <div class="user-row">
                    <div class="u-meta">
                        <span class="u-name">${u.nome} <i class="m-badge">${u.materias?.length || 0} mats</i></span>
                        <span class="u-email">${u.email}</span>
                        <div class="u-xp-box">${u.xp || 0} XP</div>
                    </div>
                    <div class="u-actions">
                        <button onclick="verMateriasUser('${userDoc.id}')"><i data-lucide="layers"></i></button>
                        <button onclick="editarXP('${userDoc.id}', ${u.xp || 0})"><i data-lucide="zap"></i></button>
                        <button onclick="banirUsuario('${userDoc.id}')" class="btn-danger-tool"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>`;
        });

        listaUsuarios.innerHTML = usuariosHTML || "<p class='empty'>Nenhum aluno encontrado.</p>";
        logsContainer.innerHTML = logsHTML || "<p class='empty'>Aguardando atividades...</p>";
        
        document.getElementById('total-users').innerText = count;
        document.getElementById('avg-xp').innerText = count > 0 ? Math.floor(totalXP / count) : 0;
        document.getElementById('total-materias').innerText = totalMats;

        if (window.lucide) lucide.createIcons();
    });
}

// AÇÕES DO MASTER
window.verMateriasUser = async (id) => {
    const snap = await getDocs(collection(db, "notas"));
    const u = snap.docs.find(d => d.id === id)?.data();
    const lista = u?.materias?.map(m => `• ${m.nome}`).join('<br>') || "Nenhuma matéria.";
    abrirModalAdmin(`DADOS: ${u.nome}`, lista, "", () => {}, false);
};

window.editarXP = (id, xp) => {
    abrirModalAdmin("AJUSTAR XP", "Defina o novo valor de XP:", xp, async (val) => {
        if(val) await updateDoc(doc(db, "notas", id), { xp: Number(val), atualizadoEm: Date.now() });
    }, true);
};

window.banirUsuario = (id) => {
    abrirModalAdmin("EXPULSAR", `Deseja apagar os dados de ${id}?`, "", async () => {
        await deleteDoc(doc(db, "notas", id));
    }, false);
};

window.postarAviso = async () => {
    const t = document.getElementById('aviso-texto');
    if(!t.value) return;
    await setDoc(doc(db, "config", "aviso_global"), { mensagem: t.value, ativo: true });
    t.value = "";
    abrirModalAdmin("SUCESSO", "Aviso enviado para todos!", "", () => {}, false);
};

window.removerAviso = async () => {
    await setDoc(doc(db, "config", "aviso_global"), { ativo: false });
};

window.toggleManutencao = () => {
    abrirModalAdmin("CORE", "Digite 'LOCK' para bloquear o app ou 'OPEN' para liberar:", "", async (val) => {
        const isLock = val.toUpperCase() === 'LOCK';
        await setDoc(doc(db, "config", "status_sistema"), { emManutencao: isLock });
    }, true);
};

// MODAL CONTROLLER
window.abrirModalAdmin = (titulo, desc, placeholder = "", callback, comInput = false) => {
    const m = document.getElementById('modal-admin');
    const input = document.getElementById('modal-input');
    document.getElementById('modal-title').innerText = titulo;
    document.getElementById('modal-desc').innerHTML = desc;
    input.style.display = comInput ? 'block' : 'none';
    input.value = placeholder;
    m.style.display = 'flex';
    document.getElementById('modal-confirm-btn').onclick = () => { callback(input.value); fecharModalAdmin(); };
};
window.fecharModalAdmin = () => document.getElementById('modal-admin').style.display = 'none';

document.addEventListener('DOMContentLoaded', iniciarMonitoramento);
