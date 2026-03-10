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
// FUNÇÕES DE PODER (WINDOW. PARA O ONCLICK FUNCIONAR)
// ==========================================

// 1. RESET DE SENHA (PELO MODAL)
window.enviarResetSenha = (email) => {
    window.abrirModalAdmin("RECUPERAR CONTA", `Enviar e-mail de redefinição de senha para:<br><b style="color:var(--purple)">${email}</b>?`, "", async () => {
        try {
            await sendPasswordResetEmail(auth, email);
            alert("✅ Link enviado com sucesso!");
        } catch (e) { alert("❌ Erro: " + e.message); }
    }, false);
};

// 2. MODO MANUTENÇÃO (AGORA VAI ABRIR O MODAL)
window.toggleManutencao = () => {
    window.abrirModalAdmin("MANUTENÇÃO", "Digite <b>LOCK</b> para travar o app ou <b>OPEN</b> para liberar:", "", async (val) => {
        if (val === 'LOCK' || val === 'OPEN') {
            const status = (val === 'LOCK');
            await setDoc(doc(db, "config", "status_sistema"), { emManutencao: status });
            alert(status ? "App Travado! 🔒" : "App Liberado! ✅");
        } else {
            alert("Comando inválido. Use LOCK ou OPEN.");
        }
    }, true);
};

// 3. FORCE UPDATE (LIMPAR CACHE DOS ALUNOS)
window.forçarUpdateGeral = () => {
    window.abrirModalAdmin("FORCE UPDATE", "Digite <b>SIM</b> para forçar todos os alunos a recarregarem o app:", "", async (val) => {
        if (val === 'SIM') {
            await setDoc(doc(db, "config", "versao_sistema"), { v: Date.now() });
            alert("Comando de atualização enviado!");
        }
    }, true);
};

// 4. EDITAR NOME DO ALUNO
window.editarNome = (id, nomeAtual) => {
    window.abrirModalAdmin("EDITAR NOME", "Digite o novo nome do aluno:", nomeAtual, async (novo) => {
        if (novo) await updateDoc(doc(db, "notas", id), { nome: novo });
    }, true);
};

// 5. EDITAR XP
window.editarXP = (id, xpAtual) => {
    window.abrirModalAdmin("AJUSTAR XP", "Defina o novo valor de XP:", xpAtual, async (novoXP) => {
        await updateDoc(doc(db, "notas", id), { xp: Number(novoXP) });
    }, true);
};

// 6. GERENCIAR MATÉRIAS (RESETAR)
window.gerenciarMateriasUser = (id) => {
    window.abrirModalAdmin("LIMPAR DADOS", "Digite <b>RESETAR</b> para apagar todas as matérias deste aluno:", "", async (val) => {
        if (val === 'RESETAR') await updateDoc(doc(db, "notas", id), { materias: [], xp: 0 });
    }, true);
};

// 7. BANIR / APAGAR
window.banirUsuario = (id) => {
    window.abrirModalAdmin("BANIR USUÁRIO", `Deseja apagar permanentemente o registro de <b>${id}</b>?`, "", async () => {
        await deleteDoc(doc(db, "notas", id));
    }, false);
};

// 8. POSTAR AVISO NO MURAL
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
    alert("Aviso publicado!");
};

window.removerAviso = async () => { await setDoc(doc(db, "config", "aviso_global"), { ativo: false }); };

// ==========================================
// CONTROLE DO MODAL
// ==========================================
window.abrirModalAdmin = (titulo, desc, placeholder = "", callback, comInput = false) => {
    const m = document.getElementById('modal-admin');
    document.getElementById('modal-title').innerHTML = titulo;
    document.getElementById('modal-desc').innerHTML = desc;
    const input = document.getElementById('modal-input');
    
    input.style.display = comInput ? 'block' : 'none';
    input.value = placeholder;
    m.style.display = 'flex';

    document.getElementById('modal-confirm-btn').onclick = () => {
        callback(input.value);
        window.fecharModalAdmin();
    };
};

window.fecharModalAdmin = () => { document.getElementById('modal-admin').style.display = 'none'; };

// ==========================================
// LISTA EM TEMPO REAL
// ==========================================
function iniciarPainel() {
    const q = query(collection(db, "notas"), orderBy("xp", "desc"));
    onSnapshot(q, (snap) => {
        const lista = document.getElementById('lista-usuarios-admin');
        let html = "";
        snap.forEach(d => {
            const u = d.data();
            html += `
            <div class="user-row">
                <div class="u-meta">
                    <span class="u-name" onclick="window.editarNome('${d.id}', '${u.nome}')">${u.nome} <i data-lucide="edit-3" style="width:10px"></i></span>
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
        lista.innerHTML = html;
        if (window.lucide) lucide.createIcons();
        
        // Stats rápidos
        document.getElementById('total-users').innerText = snap.size;
    });
}

document.addEventListener('DOMContentLoaded', iniciarPainel);
