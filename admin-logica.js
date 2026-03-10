import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, updateDoc, setDoc, deleteDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// SEGURANÇA MESTRE
const emailMestre = "ditoh2008@gmail.com";
if ((localStorage.getItem('dt_user_email') || "").toLowerCase() !== emailMestre) {
    window.location.replace('index.html');
}

// --- FUNÇÕES DE PODER (PENDURADAS NO WINDOW PARA FUNCIONAR NO ONCLICK) ---

window.enviarResetSenha = async (email) => {
    if (confirm(`Enviar e-mail de recuperação para ${email}?`)) {
        try {
            await sendPasswordResetEmail(auth, email);
            alert("✅ E-mail de redefinição enviado!");
        } catch (error) {
            console.error(error);
            alert("❌ Erro ao enviar: " + error.message);
        }
    }
};

window.editarNome = (id, nomeAtual) => {
    window.abrirModalAdmin("EDITAR NOME", "Novo nome para o aluno:", nomeAtual, async (novoNome) => {
        if(novoNome) await updateDoc(doc(db, "notas", id), { nome: novoNome });
    }, true);
};

window.editarEmailBanco = (id, emailAtual) => {
    window.abrirModalAdmin("EDITAR E-MAIL", "Muda apenas o registro visual. Novo e-mail:", emailAtual, async (novoEmail) => {
        if(novoEmail) await updateDoc(doc(db, "notas", id), { email: novoEmail });
    }, true);
};

window.gerenciarMateriasUser = (id) => {
    window.abrirModalAdmin("RESETAR DADOS", "Digite 'RESETAR' para limpar matérias e XP:", "", async (val) => {
        if(val === 'RESETAR') await updateDoc(doc(db, "notas", id), { materias: [], xp: 0 });
    }, true);
};

window.editarXP = (id, xp) => {
    window.abrirModalAdmin("AJUSTAR XP", "Novo valor de XP:", xp, async (v) => {
        await updateDoc(doc(db, "notas", id), { xp: Number(v), atualizadoEm: Date.now() });
    }, true);
};

window.banirUsuario = (id) => {
    window.abrirModalAdmin("BANIR", `Apagar permanentemente o ID: ${id}?`, "", async () => {
        await deleteDoc(doc(db, "notas", id));
    }, false);
};

window.postarAviso = async () => {
    const t = document.getElementById('aviso-texto');
    const cor = document.querySelector('input[name="cor-aviso"]:checked').value;
    if(!t.value) return;
    await setDoc(doc(db, "config", "aviso_global"), { mensagem: t.value, ativo: true, tipo: cor, data: Date.now() });
    t.value = "";
    alert("Mural Atualizado!");
};

window.forçarUpdateGeral = () => {
    window.abrirModalAdmin("FORCE UPDATE", "Limpar cache de todos? Digite 'SIM':", "", async (v) => {
        if(v === 'SIM') await setDoc(doc(db, "config", "versao_sistema"), { v: Date.now() });
    }, true);
};

// --- MODAL CONTROLLER ---
window.abrirModalAdmin = (titulo, desc, placeholder = "", callback, comInput = false) => {
    const m = document.getElementById('modal-admin');
    const input = document.getElementById('modal-input');
    document.getElementById('modal-title').innerHTML = titulo;
    document.getElementById('modal-desc').innerHTML = desc;
    input.style.display = comInput ? 'block' : 'none';
    input.value = placeholder;
    m.style.display = 'flex';
    document.getElementById('modal-confirm-btn').onclick = () => { callback(input.value); window.fecharModalAdmin(); };
};

window.fecharModalAdmin = () => { document.getElementById('modal-admin').style.display = 'none'; };

// --- MONITORAMENTO EM TEMPO REAL ---
function iniciarPainelMaster() {
    const q = query(collection(db, "notas"), orderBy("xp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        const listaUsuarios = document.getElementById('lista-usuarios-admin');
        const logsContainer = document.getElementById('logs-container');
        let usuariosHTML = "";
        let logsHTML = "";
        
        snapshot.forEach((userDoc) => {
            const u = userDoc.data();
            const hora = u.atualizadoEm ? new Date(u.atualizadoEm).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '--:--';
            
            logsHTML += `<div class="log-entry"><span class="t-purp">[${hora}]</span> <b>${u.nome}</b></div>`;

            usuariosHTML += `
                <div class="user-row">
                    <div class="u-meta">
                        <span class="u-name" onclick="window.editarNome('${userDoc.id}', '${u.nome}')" style="cursor:pointer; color:var(--purple)">
                            ${u.nome} <i data-lucide="edit-3" style="width:10px"></i>
                        </span>
                        <span class="u-email" onclick="window.editarEmailBanco('${userDoc.id}', '${u.email}')" style="cursor:pointer">
                            ${u.email}
                        </span>
                        <div class="u-xp-box">${u.xp || 0} XP</div>
                    </div>
                    <div class="u-actions">
                        <button onclick="window.enviarResetSenha('${u.email}')" style="color:#ffcc00"><i data-lucide="key"></i></button>
                        <button onclick="window.gerenciarMateriasUser('${userDoc.id}')"><i data-lucide="layers"></i></button>
                        <button onclick="window.editarXP('${userDoc.id}', ${u.xp || 0})"><i data-lucide="zap"></i></button>
                        <button onclick="window.banirUsuario('${userDoc.id}')" class="btn-danger-tool"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>`;
        });

        listaUsuarios.innerHTML = usuariosHTML;
        logsContainer.innerHTML = logsHTML;
        if (window.lucide) lucide.createIcons();
    });
}

document.addEventListener('DOMContentLoaded', iniciarPainelMaster);
