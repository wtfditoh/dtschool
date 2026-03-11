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

// ==========================================
// CONTROLE DO MODAL (ESTILIZADO)
// ==========================================
window.abrirModalAdmin = (titulo, desc, placeholder = "", callback, comInput = false) => {
    const m = document.getElementById('modal-admin');
    const input = document.getElementById('modal-input');
    const titleEl = document.getElementById('modal-title');
    const descEl = document.getElementById('modal-desc');
    const confirmBtn = document.getElementById('modal-confirm-btn');

    titleEl.innerHTML = titulo;
    descEl.innerHTML = desc;
    
    input.style.display = comInput ? 'block' : 'none';
    input.value = placeholder;
    m.style.display = 'flex';

    confirmBtn.onclick = async () => {
        await callback(input.value);
        window.fecharModalAdmin();
    };
};

window.fecharModalAdmin = () => { 
    document.getElementById('modal-admin').style.display = 'none'; 
};

// ==========================================
// FUNÇÕES DE PODER
// ==========================================

window.enviarResetSenha = (email) => {
    window.abrirModalAdmin("RECUPERAR CONTA", `Enviar link de senha para:<br><b style="color:var(--purple)">${email}</b>?`, "", async () => {
        try {
            await sendPasswordResetEmail(auth, email);
            setTimeout(() => window.abrirModalAdmin("SUCESSO", "E-mail enviado!", "", () => {}, false), 400);
        } catch (e) {
            setTimeout(() => window.abrirModalAdmin("ERRO", e.message, "", () => {}, false), 400);
        }
    });
};

window.toggleManutencao = () => {
    window.abrirModalAdmin("MANUTENÇÃO", "Digite <b>LOCK</b> para travar ou <b>OPEN</b> para liberar:", "", async (val) => {
        const cmd = val.toUpperCase();
        if (cmd === 'LOCK' || cmd === 'OPEN') {
            await setDoc(doc(db, "config", "status_sistema"), { emManutencao: (cmd === 'LOCK') });
        }
    }, true);
};

window.forçarUpdateGeral = () => {
    window.abrirModalAdmin("FORCE UPDATE", "Digite <b>SIM</b> para atualizar todos:", "", async (val) => {
        if (val.toUpperCase() === 'SIM') await setDoc(doc(db, "config", "versao_sistema"), { v: Date.now() });
    }, true);
};

window.editarNome = (id, nomeAtual) => {
    window.abrirModalAdmin("EDITAR NOME", "Novo nome:", nomeAtual, async (novo) => {
        if (novo) await updateDoc(doc(db, "notas", id), { nome: novo });
    }, true);
};

window.editarXP = (id, xpAtual) => {
    window.abrirModalAdmin("AJUSTAR XP", "Valor de XP:", xpAtual, async (novoXP) => {
        await updateDoc(doc(db, "notas", id), { xp: Number(novoXP) });
    }, true);
};

window.gerenciarMateriasUser = (id) => {
    window.abrirModalAdmin("LIMPAR", "Digite <b>RESETAR</b>:", "", async (val) => {
        if (val === 'RESETAR') await updateDoc(doc(db, "notas", id), { materias: [], xp: 0 });
    }, true);
};

window.banirUsuario = (id) => {
    window.abrirModalAdmin("BANIR", `Apagar <b>${id}</b>?`, "", async () => {
        await deleteDoc(doc(db, "notas", id));
    });
};

// MURAL (Sincronizado com a Home)
window.postarAviso = async () => {
    const t = document.getElementById('aviso-texto');
    if (!t || !t.value) return;
    await setDoc(doc(db, "config", "mural"), { 
        texto: t.value, 
        autor: "Ditoh", 
        data: new Date().toLocaleDateString('pt-BR'),
        ativo: true
    });
    t.value = "";
    window.abrirModalAdmin("AVISO", "Mural atualizado!", "", () => {}, false);
};

window.removerAviso = async () => { 
    await setDoc(doc(db, "config", "mural"), { texto: "Nenhum aviso no momento.", autor: "Sistema", ativo: false }); 
    window.abrirModalAdmin("SISTEMA", "Mural limpo!", "", () => {}, false);
};

// ==========================================
// MONITORAMENTO DA LISTA (VISUAL ORIGINAL)
// ==========================================
function iniciarPainel() {
    const q = query(collection(db, "notas"), orderBy("xp", "desc"));
    
    onSnapshot(q, (snap) => {
        const lista = document.getElementById('lista-usuarios-admin');
        const logsContainer = document.getElementById('logs-container');
        let html = "";
        let logsHTML = "";
        
        const docs = [];
        snap.forEach(d => {
            const u = d.data();
            docs.push(u);
            
            // HTML DA LINHA (Recuperando suas classes CSS originais)
            html += `
            <div class="user-row">
                <div class="u-meta">
                    <span class="u-name" onclick="window.editarNome('${d.id}', '${u.nome}')">${u.nome} <i data-lucide="edit-3" style="width:12px; opacity:0.5"></i></span>
                    <span class="u-email">${u.email}</span>
                    <div class="u-xp-box">${u.xp || 0} XP</div>
                </div>
                <div class="u-actions">
                    <button onclick="window.enviarResetSenha('${u.email}')" style="color:#ffcc00"><i data-lucide="key"></i></button>
                    <button onclick="window.gerenciarMateriasUser('${d.id}')"><i data-lucide="layers"></i></button>
                    <button onclick="window.editarXP('${d.id}', ${u.xp || 0})"><i data-lucide="zap"></i></button>
                    <button onclick="window.banirUsuario('${d.id}')" style="color:#ff4444"><i data-lucide="trash-2"></i></button>
                </div>
            </div>`;
        });

        // Logs (Live Activity)
        const sortedLogs = [...docs].sort((a,b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0));
        sortedLogs.slice(0, 10).forEach(u => {
            const hora = u.atualizadoEm ? new Date(u.atualizadoEm).toLocaleTimeString('pt-BR') : '--:--';
            logsHTML += `<div class="log-entry"><span class="t-purp">[${hora}]</span> <b>${u.nome}</b></div>`;
        });
        
        if(lista) lista.innerHTML = html;
        if(logsContainer) logsContainer.innerHTML = logsHTML;
        
        // Stats
        if(document.getElementById('total-users')) document.getElementById('total-users').innerText = snap.size;
        const totalXP = docs.reduce((acc, curr) => acc + (curr.xp || 0), 0);
        if(document.getElementById('avg-xp')) document.getElementById('avg-xp').innerText = docs.length ? Math.round(totalXP/docs.length) : 0;

        if (window.lucide) lucide.createIcons();
    });
}

document.addEventListener('DOMContentLoaded', iniciarPainel);
