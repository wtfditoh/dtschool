import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const userPhone = localStorage.getItem('dt_user_phone');

document.addEventListener('DOMContentLoaded', async () => {
    if (!userPhone) return window.location.href = 'login.html';
    
    document.getElementById('display-phone').innerText = `ID: ${userPhone}`;
    await carregarPerfil();
    lucide.createIcons();
});

async function carregarPerfil() {
    try {
        const docRef = doc(db, "notas", userPhone);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();
            document.getElementById('user-name-input').value = dados.nome || "";
            
            // Estatísticas rápidas
            const materias = dados.materias || [];
            document.getElementById('stat-materias').innerText = materias.length;
            
            if (materias.length > 0) {
                const soma = materias.reduce((acc, m) => acc + (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4))/4, 0);
                document.getElementById('stat-media').innerText = (soma / materias.length).toFixed(1);
            }
        }
    } catch (e) { console.error("Erro ao carregar perfil:", e); }
}

document.getElementById('btn-salvar-perfil').onclick = async () => {
    const novoNome = document.getElementById('user-name-input').value.trim();
    const btn = document.getElementById('btn-salvar-perfil');

    if (!novoNome) return alert("Digita um nome para o ranking!");

    btn.innerText = "SALVANDO...";
    btn.disabled = true;

    try {
        const userRef = doc(db, "notas", userPhone);
        await updateDoc(userRef, { nome: novoNome });
        
        // Atualiza no localStorage também se quiseres usar em outros lugares
        localStorage.setItem('dt_user_name', novoNome);
        
        alert("Perfil atualizado! Agora já podes dominar o ranking.");
        window.location.href = 'index.html';
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar. Tenta de novo.");
    } finally {
        btn.innerHTML = '<i data-lucide="check-circle"></i> SALVAR ALTERAÇÕES';
        btn.disabled = false;
        lucide.createIcons();
    }
};

window.logout = () => {
    if(confirm("Queres mesmo sair?")) {
        localStorage.clear();
        window.location.href = 'login.html';
    }
};
