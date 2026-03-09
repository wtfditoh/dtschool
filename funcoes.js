import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
  authDomain: "dt-scho0l.firebaseapp.com",
  projectId: "dt-scho0l",
  storageBucket: "dt-scho0l.firebasestorage.app",
  messagingSenderId: "78578509391",
  appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a",
  measurementId: "G-F7TG23TBTL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// PEGA OS DADOS DO USUÁRIO (Blindagem contra Nulos)
const userPhone = localStorage.getItem('dt_user_phone') || localStorage.getItem('dt_user_email');
const userType = localStorage.getItem('dt_user_type');

let materias = [];
let idParaExcluir = null;

// ==========================================
// MOTOR DE XP - HUB BRAIN
// ==========================================
function calcularXP(nota) {
    const n = parseFloat(nota);
    if (isNaN(n) || nota === "" || nota === null) return 0;
    if (n === 10) return 100;
    if (n >= 8.0) return 50;
    if (n >= 6.0) return 20;
    if (n >= 4.0) return -20;
    if (n >= 0.1) return -50;
    if (n === 0) return -100;
    return 0;
}

async function atualizarXPGlobal() {
    // Se não tiver ID de usuário, não adianta tentar salvar na nuvem
    if (userType === 'local' || !userPhone) {
        console.warn("⚠️ Usuário offline ou ID não encontrado. XP salvo apenas localmente.");
        return;
    }

    let xpTotal = 0;
    materias.forEach(m => {
        [m.n1, m.n2, m.n3, m.n4].forEach(nota => {
            if (nota !== undefined && nota !== null && nota !== "") {
                xpTotal += calcularXP(nota);
            }
        });
    });

    try {
        const userRef = doc(db, "notas", userPhone);
        const nomeLocal = localStorage.getItem('dt_user_name');
        const avatarLocal = localStorage.getItem('dt_user_avatar');

        const dadosParaAtualizar = { 
            xp: xpTotal, 
            materias: materias,
            ultimaAtualizacao: Date.now() 
        };

        if (nomeLocal) dadosParaAtualizar.nome = nomeLocal;
        if (avatarLocal) dadosParaAtualizar.avatar = avatarLocal;

        // setDoc com merge: true é mais seguro que updateDoc
        await setDoc(userRef, dadosParaAtualizar, { merge: true });
        console.log(`🏆 XP Sincronizado: ${xpTotal}`);
    } catch (e) { 
        console.error("❌ Erro ao sincronizar XP:", e); 
    }
}

// ==========================================
// CARREGAMENTO E SALVAMENTO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await carregarDados();
    if(window.lucide) lucide.createIcons();
});

async function carregarDados() {
    if (userType === 'local' || !userPhone) {
        materias = JSON.parse(localStorage.getItem('materias')) || [];
    } else {
        try {
            const docRef = doc(db, "notas", userPhone);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                materias = docSnap.data().materias || [];
            } else {
                materias = JSON.parse(localStorage.getItem('materias')) || [];
                if(materias.length > 0) await salvarNaNuvem();
            }
        } catch (e) { console.error("Erro ao carregar:", e); }
    }
    atualizarLista();
}

async function salvarNaNuvem() {
    if (userType !== 'local' && userPhone) {
        await atualizarXPGlobal();
    }
}

// ==========================================
// GESTÃO DA LISTA
// ==========================================
window.atualizarLista = function() {
    const lista = document.getElementById('lista-materias');
    if(!lista) return;

    materias.sort((a, b) => {
        const somaA = (Number(a.n1)||0) + (Number(a.n2)||0) + (Number(a.n3)||0) + (Number(a.n4)||0);
        const somaB = (Number(b.n1)||0) + (Number(b.n2)||0) + (Number(b.n3)||0) + (Number(b.n4)||0);
        if (somaB !== somaA) return somaB - somaA;
        return a.id - b.id; 
    });

    lista.innerHTML = materias.map(m => {
        const soma = (Number(m.n1)||0) + (Number(m.n2)||0) + (Number(m.n3)||0) + (Number(m.n4)||0);
        const media = (soma / 4).toFixed(1);
        const percent = Math.min((soma / 24) * 100, 100);
        const aprovado = soma >= 24;

        return `
        <div class="materia-card">
            <div class="card-top">
                <h3 style="font-size:17px; font-weight:800;">${m.nome}</h3>
                <button onclick="abrirModalExcluir(${m.id})" style="background:none; border:none; color:#ff4444; opacity:0.5; padding:5px;">
                    <i data-lucide="trash-2" style="width:18px;"></i>
                </button>
            </div>
            <div class="progress-bg"><div class="progress-fill" style="width:${percent}%;"></div></div>
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px;">
                ${[1,2,3,4].map(n => {
                    const val = m['n'+n];
                    const displayValue = (val === 0 || (val && val !== "")) ? val : "";
                    return `
                    <input type="number" step="0.1" value="${displayValue}" placeholder="${n}º"
                        style="width:100%; background:rgba(0,0,0,0.3); border:1px solid #222; color:white; padding:10px; border-radius:10px; text-align:center; font-size:13px; font-weight:bold;"
                        onchange="salvarNota(${m.id}, ${n}, this.value)">
                    `;
                }).join('')}
            </div>
            <div class="card-bottom">
                <span style="font-size:11px; color:#555; font-weight:bold;">MÉDIA: ${media}</span>
                ${aprovado ? `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="aprovado-badge">APROVADO</span>
                        <button onclick="gerarCardVitoria('${m.nome}', '${media}')" style="background:none; border:none; color:#8a2be2; cursor:pointer; padding:5px; display:flex;">
                            <i data-lucide="share-2" style="width:16px;"></i>
                        </button>
                    </div>
                ` : `<span class="falta-badge">FALTAM ${(24-soma).toFixed(1)}</span>`}
            </div>
        </div>`;
    }).join('');
    
    const total = materias.length;
    const somaMediasGerais = materias.reduce((acc, m) => acc + (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4))/4, 0);
    document.getElementById('media-geral').innerText = total > 0 ? (somaMediasGerais / total).toFixed(1) : "0.0";
    document.getElementById('aprov-count').innerText = `${materias.filter(m => (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4)) >= 24).length}/${total}`;
    if(window.lucide) lucide.createIcons();
};

window.salvarNota = async function(id, b, val) {
    const i = materias.findIndex(m => m.id === id);
    if(i !== -1) {
        materias[i]['n'+b] = val === "" ? "" : parseFloat(val);
        localStorage.setItem('materias', JSON.stringify(materias));
        await salvarNaNuvem(); // Isso dispara o XPGlobal
        atualizarLista();
    }
};

// ==========================================
// MODAIS E MATÉRIAS
// ==========================================
window.abrirModal = function() { 
    document.getElementById('modal-materia').style.display = 'flex'; 
};

window.fecharModal = function() { 
    document.getElementById('modal-materia').style.display = 'none'; 
};

window.confirmarNovaMateria = async function() {
    const input = document.getElementById('nome-materia-input');
    if(input.value.trim() !== "") {
        materias.push({ id: Date.now(), nome: input.value, n1:"", n2:"", n3:"", n4:"" });
        localStorage.setItem('materias', JSON.stringify(materias));
        await salvarNaNuvem();
        input.value = ''; 
        fecharModal(); 
        atualizarLista();
    }
};

window.abrirModalExcluir = function(id) {
    idParaExcluir = id;
    document.getElementById('modal-excluir-container').style.display = 'flex';
    if(window.lucide) lucide.createIcons();
};

window.fecharModalExcluir = function() { 
    document.getElementById('modal-excluir-container').style.display = 'none'; 
};

window.confirmarExclusao = async function() {
    materias = materias.filter(m => m.id !== idParaExcluir);
    localStorage.setItem('materias', JSON.stringify(materias));
    await salvarNaNuvem();
    atualizarLista();
    fecharModalExcluir();
};

// ==========================================
// MENU E NAVEGAÇÃO
// ==========================================
window.toggleMenu = function() {
    document.getElementById('menu-lateral').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
};

window.navegar = function(p) {
    window.toggleMenu();
    if(p === 'notas') return;
    if(p === 'ranking') { window.location.href = 'ranking.html'; return; }
    if(p === 'perfil') { window.location.href = 'perfil.html'; return; }
    
    // Para as páginas que ainda não existem
    const aviso = document.getElementById('modal-aviso-container');
    if(aviso) {
        document.getElementById('aviso-titulo').innerText = p.charAt(0).toUpperCase() + p.slice(1);
        aviso.style.display = 'flex';
        if(window.lucide) lucide.createIcons();
    }
};
