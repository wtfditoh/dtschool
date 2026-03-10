import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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
const auth = getAuth(app); // Inicializa o Auth para o Reset de Senha

// SEGURANÇA MESTRE
const emailMestre = "ditoh2008@gmail.com";
if ((localStorage.getItem('dt_user_email') || "").toLowerCase() !== emailMestre) {
    window.location.replace('index.html');
}

function iniciarPainelMaster() {
    const q = query(collection(db, "notas"), orderBy("xp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        const logsContainer = document.getElementById('logs-container');
        const listaUsuarios = document.getElementById('lista-usuarios-admin');
        let usuariosHTML = "";
        let logsHTML = "";
        let tXP = 0, tMats = 0, count = 0;

        snapshot.forEach((userDoc) => {
            const u = userDoc.data();
            count++; tXP += (u.xp || 0); tMats += (u.materias?.length || 0);

            usuariosHTML += `
                <div class="user-row">
                    <div class="u-meta">
                        <span class="u-name" onclick="editarNome('${userDoc.id}', '${u.nome}')" style="cursor:pointer; color:var(--purple)">
                            ${u.nome} <i data-lucide="edit-3" style="width:10px"></i>
                        </span>
                        <span class="u-email" onclick="editarEmailBanco('${userDoc.id}', '${u.email}')" style="cursor:pointer">
                            ${u.email} <i data-lucide="mail" style="width:10px; opacity:0.5"></i>
                        </span>
                        <div class="u-xp-box">${u.xp || 0} XP</div>
                    </div>
                    <div class="u-actions">
                        <button title="Resetar Senha" onclick="enviarResetSenha('${u.email}')" style="color:#ffcc00"><i data-lucide="key"></i></button>
                        <button title="Gerenciar Matérias" onclick="gerenciarMateriasUser('${userDoc.id}')"><i data-lucide="layers"></i></button>
                        <button title="Ajustar XP" onclick="editarXP('${userDoc.id}', ${u.xp || 0})"><i data-lucide="zap"></i></button>
                        <button title="Apagar Usuário" onclick="banirUsuario('${userDoc.id}')" class="btn-danger-tool"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>`;
        });

        listaUsuarios.innerHTML = usuariosHTML;
        // ... (resto da lógica de logs e stats igual)
        if (window.lucide) lucide.createIcons();
    });
}

// --- NOVAS FUNÇÕES DE PODER REAL ---

// 1. ENVIAR E-MAIL DE RESET DE SENHA (A FUNÇÃO QUE VOCÊ QUERIA)
window.enviarResetSenha = async (email) => {
    if (confirm(`Enviar e-mail de recuperação de senha para ${email}?`)) {
        try {
            await sendPasswordResetEmail(auth, email);
            alert("E-mail de redefinição enviado com sucesso!");
        } catch (error) {
            console.error(error);
            alert("Erro ao enviar: " + error.message);
        }
    }
};

// 2. EDITAR NOME
window.editarNome = (id, nomeAtual) => {
    abrirModalAdmin("EDITAR NOME", "Novo nome para o aluno:", nomeAtual, async (novoNome) => {
        if(novoNome) await updateDoc(doc(db, "notas", id), { nome: novoNome });
    }, true);
};

// 3. EDITAR E-MAIL NO BANCO (Caso ele tenha errado o e-mail no cadastro)
window.editarEmailBanco = (id, emailAtual) => {
    abrirModalAdmin("EDITAR E-MAIL", "Atenção: Isso muda apenas o registro no banco. Novo e-mail:", emailAtual, async (novoEmail) => {
        if(novoEmail) await updateDoc(doc(db, "notas", id), { email: novoEmail });
    }, true);
};

// 4. GERENCIAR MATÉRIAS (RESET TOTAL)
window.gerenciarMateriasUser = async (id) => {
    abrirModalAdmin("RESETAR DADOS", "Digite 'RESETAR' para apagar todas as matérias e XP deste aluno:", "", async (val) => {
        if(val === 'RESETAR') {
            await updateDoc(doc(db, "notas", id), { materias: [], xp: 0 });
        }
    }, true);
};

// ... (Manter funções de postarAviso, removerAviso, editarXP, banirUsuario e Modal que já passamos)

document.addEventListener('DOMContentLoaded', iniciarPainelMaster);
