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

// --- IDENTIFICAÇÃO ---
const userEmail = localStorage.getItem('dt_user_email');
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
    const emailAtual = localStorage.getItem('dt_user_email');
    const tipoAtual = localStorage.getItem('dt_user_type');
    
    if(!emailAtual || emailAtual === "null") return;
    if (tipoAtual === 'local') return;

    let xpTotal = 0;
    materias.forEach(m => {
        [m.n1, m.n2, m.n3, m.n4].forEach(nota => {
            const n = parseFloat(nota);
            if (!isNaN(n)) xpTotal += calcularXP(n);
        });
    });

    try {
        const userRef = doc(db, "notas", emailAtual);
        const nomeLocal = localStorage.getItem('dt_user_name');
        const avatarLocal = localStorage.getItem('dt_user_avatar');

        await setDoc(userRef, { 
            xp: Number(xpTotal),
            materias: materias,
            email: emailAtual,
            nome: nomeLocal || "Estudante",
            avatar: avatarLocal || "user",
            atualizadoEm: Date.now()
        }, { merge: true });
    } catch (e) { console.error("Erro XP:", e); }
}

// ==========================================
// CARREGAMENTO E SALVAMENTO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await carregarDados();
});

async function carregarDados() {
    const emailAtual = localStorage.getItem('dt_user_email');
    if (userType === 'local' || !emailAtual) {
        materias = JSON.parse(localStorage.getItem('materias')) || [];
    } else {
        try {
            const docRef = doc(db, "notas", emailAtual);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                materias = docSnap.data().materias || [];
                localStorage.setItem('materias', JSON.stringify(materias));
            } else {
                materias = JSON.parse(localStorage.getItem('materias')) || [];
            }
        } catch (e) { console.error("Erro ao carregar:", e); }
    }
    window.atualizarLista();
}

async function salvarNaNuvem() {
    const emailAtual = localStorage.getItem('dt_user_email');
    if (userType !== 'local' && emailAtual) {
        await atualizarXPGlobal();
    }
}

// ==========================================
// GESTÃO DA LISTA (ANEXADAS AO WINDOW)
// ==========================================
window.atualizarLista = function() {
    const lista = document.getElementById('lista-materias');
    if(!lista) return;

    materias.sort((a, b) => {
        const somaA = (Number(a.n1)||0) + (Number(a.n2)||0) + (Number(a.n3)||0) + (Number(a.n4)||0);
        const somaB = (Number(b.n1)||0) + (Number(b.n2)||0) + (Number(b.n3)||0) + (Number(b.n4)||0);
        return somaB - somaA || a.id - b.id;
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
                <button onclick="window.abrirModalExcluir(${m.id})" style="background:none; border:none; color:#ff4444; opacity:0.5; padding:5px;">
                    <i data-lucide="trash-2" style="width:18px;"></i>
                </button>
            </div>
            <div class="progress-bg"><div class="progress-fill" style="width:${percent}%;"></div></div>
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px;">
                ${[1,2,3,4].map(n => {
                    const val = m['n'+n];
                    return `<input type="number" step="0.1" value="${val}" placeholder="${n}º"
                        style="width:100%; background:rgba(0,0,0,0.3); border:1px solid #222; color:white; padding:10px; border-radius:10px; text-align:center; font-size:13px; font-weight:bold;"
                        onchange="window.salvarNota(${m.id}, ${n}, this.value)">`;
                }).join('')}
            </div>
            <div class="card-bottom">
                <span style="font-size:11px; color:#555; font-weight:bold;">MÉDIA: ${media}</span>
                ${aprovado ? `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="aprovado-badge">APROVADO</span>
                        <button onclick="window.gerarCardVitoria('${m.nome}', '${media}')" style="background:none; border:none; color:#8a2be2; cursor:pointer; padding:5px; display:flex;">
                            <i data-lucide="share-2" style="width:16px;"></i>
                        </button>
                    </div>
                ` : `<span class="falta-badge">FALTAM ${(24-soma).toFixed(1)}</span>`}
            </div>
        </div>`;
    }).join('');
    
    // Atualiza cabeçalho
    const total = materias.length;
    const somaMediasGerais = materias.reduce((acc, m) => acc + (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4))/4, 0);
    const mediaElem = document.getElementById('media-geral');
    const aprovElem = document.getElementById('aprov-count');
    
    if(mediaElem) mediaElem.innerText = total > 0 ? (somaMediasGerais / total).toFixed(1) : "0.0";
    if(aprovElem) aprovElem.innerText = `${materias.filter(m => (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4)) >= 24).length}/${total}`;
    if(window.lucide) lucide.createIcons();
};

window.salvarNota = async function(id, b, val) {
    const i = materias.findIndex(m => m.id === id);
    if(i !== -1) {
        materias[i]['n'+b] = val === "" ? "" : parseFloat(val);
        localStorage.setItem('materias', JSON.stringify(materias));
        window.atualizarLista();
        await salvarNaNuvem();
    }
};

// ==========================================
// MODAIS E MATÉRIAS
// ==========================================

// ESTA É A FUNÇÃO QUE VOCÊ CLICA NO BOTÃO CRIAR
export async function confirmarNovaMateria() {
    const input = document.getElementById('nome-materia-input');
    if(input && input.value) {
        materias.push({ id: Date.now(), nome: input.value, n1:"", n2:"", n3:"", n4:"" });
        localStorage.setItem('materias', JSON.stringify(materias));
        await salvarNaNuvem();
        input.value = ''; 
        if(window.fecharModal) window.fecharModal(); 
        window.atualizarLista();
    }
}
// Torna global para o index.html ler
window.confirmarNovaMateria = confirmarNovaMateria;

window.abrirModal = function() { document.getElementById('modal-materia').style.display = 'flex'; };
window.fecharModal = function() { document.getElementById('modal-materia').style.display = 'none'; };

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
    window.atualizarLista();
    window.fecharModalExcluir();
};

// ==========================================
// VITÓRIA E COMPARTILHAMENTO
// ==========================================
window.gerarCardVitoria = async function(nomeMateria, mediaReal) {
    let container = document.getElementById('compartilhamento-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'compartilhamento-container';
        document.body.appendChild(container);
    }

    container.innerHTML = `
        <div class="card-vitoria-story">
            <div class="vitoria-content">
                <div class="logo-neon-vitoria"><i data-lucide="brain-circuit" style="width:240px; height:240px; color:#8a2be2;"></i></div>
                <p class="status-conquista">${mediaReal >= 8.0 ? "Nível Elite" : "Objetivo Concluído"}</p>
                <h1 class="materia-nome-vitoria">${nomeMateria}</h1>
                <p class="badge-comemorativa">${mediaReal >= 8.0 ? `NOTA EXTRAORDINÁRIA: ${mediaReal}` : `MÉDIA ${mediaReal} SUPERADA`}</p>
            </div>
            <div class="vitoria-footer"><p>HUB BRAIN</p><p class="link-app-vitoria">https://hubbrain.netlify.app/</p></div>
        </div>
    `;

    if(window.lucide) lucide.createIcons({ container: container });

    setTimeout(async () => {
        const canvas = await html2canvas(container, { backgroundColor: null, width: 1080, height: 1920, scale: 1, useCORS: true });
        canvas.toBlob(async (blob) => {
            const file = new File([blob], `HubBrain_${nomeMateria}.png`, { type: 'image/png' });
            try {
                if (navigator.share) {
                    await navigator.share({ title: 'Hub Brain', text: `Passei em ${nomeMateria}! 🚀`, files: [file] });
                } else {
                    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Vitoria_${nomeMateria}.png`; link.click();
                }
            } catch (err) { console.log('Cancelado'); }
            container.innerHTML = '';
        });
    }, 400);
};
      
