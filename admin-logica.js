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
// FUNÇÕES DE PODER (SEM ALERTAS DO CHROME)
// ==========================================

// 1. RESET DE SENHA
window.enviarResetSenha = (email) => {
    window.abrirModalAdmin("RECUPERAR CONTA", `Enviar link de nova senha para:<br><b style="color:var(--purple)">${email}</b>?`, "", async () => {
        try {
            await sendPasswordResetEmail(auth, email);
            setTimeout(() => {
                window.abrirModalAdmin("SUCESSO", "E-mail de redefinição enviado!", "", () => {}, false);
            }, 400);
        } catch (e) {
            setTimeout(() => {
                window.abrirModalAdmin("ERRO", "Falha ao enviar: " + e.message, "", () => {}, false);
            }, 400);
        }
    }, false);
};

// 2. MODO MANUTENÇÃO
window.toggleManutencao = () => {
    window.abrirModalAdmin("MANUTENÇÃO", "Digite <b>LOCK</b> para travar ou <b>OPEN</b> para liberar:", "", async (val) => {
        const cmd = val.toUpperCase();
        if (cmd === 'LOCK' || cmd === 'OPEN') {
            const status = (cmd === 'LOCK');
            await setDoc(doc(db, "config", "status_sistema"), { emManutencao: status });
            setTimeout(() => {
                window.abrirModalAdmin("SISTEMA", status ? "🔒 App agora está em MANUTENÇÃO." : "✅ App está LIBERADO.", "", () => {}, false);
            }, 400);
        }
    }, true);
};

// 3. FORCE UPDATE
window.forçarUpdateGeral = () => {
    window.abrirModalAdmin("FORCE UPDATE", "Digite <b>SIM</b> para forçar refresh geral:", "", async (val) => {
        if (val.toUpperCase() === 'SIM') {
            await setDoc(doc(db, "config", "versao_sistema"), { v: Date.now() });
            setTimeout(() => {
                window.abrirModalAdmin("COMANDO OK", "Atualização enviada para todos!", "", () => {}, false);
            }, 400);
        }
    }, true);
};

// 4. EDITAR NOME
window.editarNome = (id, nomeAtual) => {
    window.abrirModalAdmin("EDITAR NOME", "Altere o nome do aluno:", nomeAtual, async (novo) => {
        if (novo && novo !== nomeAtual) await updateDoc(doc(db, "notas", id), { nome: novo });
    }, true);
};

// 5. EDITAR XP
window.editarXP = (id, xpAtual) => {
    window.abrirModalAdmin("AJUSTAR XP", "Novo valor de XP:", xpAtual, async (novoXP) => {
        await updateDoc(doc(db, "notas", id), { xp: Number(novoXP) });
    }, true);
};

// 6. GERENCIAR MATÉRIAS
window.gerenciarMateriasUser = (id) => {
    window.abrirModalAdmin("LIMPAR DADOS", "Digite <b>RESETAR</b> para apagar matérias e XP:", "", async (val) => {
        if (val === 'RESETAR') await updateDoc(doc(db, "notas", id), { materias: [], xp: 0 });
    }, true);
};

// 7. BANIR USUÁRIO
window.banirUsuario = (id) => {
    window.abrirModalAdmin("BANIR", `Apagar conta de <b>${id}</b> permanentemente?`, "", async () => {
        await deleteDoc(doc(db, "notas", id));
    }, false);
};

// 8. MURAL DE AVISOS
window.postarAviso = async () => {
    const t = document.getElementById('aviso-texto');
    const radio = document.querySelector('input[name="cor-aviso"]:checked');
    if (!t || !t.value) return;
    
    await setDoc(doc(db, "config", "aviso_global"), { 
        mensagem: t.value, 
        ativo: true, 
        tipo: radio ? radio.value : 'purp', 
        data: Date.now() 
    });
    t.value = "";
    window.abrirModalAdmin("AVISO", "Mural atualizado com sucesso!", "", () => {}, false);
};

window.removerAviso = async () => { 
    await setDoc(doc(db, "config", "aviso_global"), { ativo: false }); 
    window.abrirModalAdmin("SISTEMA", "Aviso removido!", "", () => {}, false);
};

// ==========================================
// MONITORAMENTO DA LISTA
// ==========================================
function iniciarPainel() {
    const q = query(collection(db, "notas"), orderBy("xp", "desc"));
    
    onSnapshot(q, (snap) => {
        const lista = document.getElementById('lista-usuarios-admin');
        const logsContainer = document.getElementById('logs-container');
        let html = "";
        let logsHTML = "";
        
        const sortedLogs = [...snap.docs].sort((a,b) => (b.data().atualizadoEm || 0) - (a.data().atualizadoEm || 0));
        
        sortedLogs.slice(0, 10).forEach(d => {
            const u = d.data();
            const hora = u.atualizadoEm ? new Date(u.atualizadoEm).toLocaleTimeString('pt-BR') : '--:--';
            logsHTML += `<div class="log-entry"><span class="t-purp">[${hora}]</span> <b>${u.nome}</b></div>`;
        });

        snap.forEach(d => {
            const u = d.data();
            html += `
            <div class="user-row">
                <div class="u-meta">
                    <span class="u-name" onclick="window.editarNome('${d.id}', '${u.nome}')">${u.nome} <i data-lucide="edit-3" style="width:10px"></i></span>
                    <span class="u-email" style="font-size:10px; color:#666">${u.email}</span>
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
        
        lista.innerHTML = html;
        logsContainer.innerHTML = logsHTML;
        document.getElementById('total-users').innerText = snap.size;
        if (window.lucide) lucide.createIcons();
    });
}

document.addEventListener('DOMContentLoaded', iniciarPainel);
