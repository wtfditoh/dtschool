import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const userPhone = localStorage.getItem('dt_user_phone');
const userType = localStorage.getItem('dt_user_type');

let materias = [];
let idParaExcluir = null;

document.addEventListener('DOMContentLoaded', async () => {
    await carregarDados();
    lucide.createIcons();
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
        try {
            await setDoc(doc(db, "notas", userPhone), { materias: materias });
        } catch (e) { console.error("Erro ao salvar:", e); }
    }
}

// FUNÇÃO PARA GERAR O CARD DE VITÓRIA DINÂMICO
window.gerarCardVitoria = function(nomeMateria, mediaReal) {
    let container = document.getElementById('compartilhamento-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'compartilhamento-container';
        document.body.appendChild(container);
    }

    let elogio = "Mais uma pra conta!";
    let subtitulo = `MÉDIA ${mediaReal} ATINGIDA`;

    if (mediaReal >= 8.0) {
        elogio = "Desempenho de Elite!";
        subtitulo = `NOTA EXTRAORDINÁRIA: ${mediaReal}`;
    } else if (mediaReal >= 6.0) {
        elogio = "Objetivo Concluído!";
        subtitulo = `MÉDIA ${mediaReal} SUPERADA`;
    }

    container.innerHTML = `
        <div class="card-vitoria-story">
            <div class="vitoria-content">
                <div class="logo-neon-vitoria">
                    <i data-lucide="brain-circuit" style="width:220px; height:220px; color:#8a2be2;"></i>
                </div>
                <p class="status-conquista">${elogio}</p>
                <h1 class="materia-nome-vitoria">${nomeMateria}</h1>
                <p class="badge-comemorativa">${subtitulo}</p>
            </div>
            <div class="vitoria-footer">
                <p>HUB BRAIN - ALTA PERFORMANCE</p>
                <p class="link-app-vitoria">hubbrain.web.app</p>
            </div>
        </div>
    `;

    lucide.createIcons({ container: container });

    setTimeout(() => {
        html2canvas(container, { 
            backgroundColor: null, width: 1080, height: 1920, scale: 1,
            logging: false, useCORS: true
        }).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL("image/png");
            link.download = `HubBrain_Vitoria_${nomeMateria}.png`;
            link.click();
            container.innerHTML = '';
        });
    }, 400);
};

window.toggleMenu = function() {
    document.getElementById('menu-lateral').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
};

window.navegar = function(p) {
    window.toggleMenu();
    if(p === 'notas') return;
    const msg = p === 'agenda' ? 'Em breve poderás marcar teus testes aqui!' : 'Em breve verás quem é o melhor da HUB BRAIN!';
    document.getElementById('aviso-titulo').innerText = p.charAt(0).toUpperCase() + p.slice(1);
    document.getElementById('aviso-texto').innerText = msg;
    document.getElementById('aviso-icon').innerHTML = `<i data-lucide="${p === 'agenda' ? 'calendar' : 'trophy'}" style="width:45px; height:45px; color:#8a2be2;"></i>`;
    document.getElementById('modal-aviso-container').style.display = 'flex';
    lucide.createIcons();
};

window.fecharAviso = function() { document.getElementById('modal-aviso-container').style.display = 'none'; };

window.abrirModalExcluir = function(id) {
    idParaExcluir = id;
    document.getElementById('modal-excluir-container').style.display = 'flex';
    lucide.createIcons();
};

window.fecharModalExcluir = function() { 
    document.getElementById('modal-excluir-container').style.display = 'none'; 
};

window.confirmarExclusao = function() {
    materias = materias.filter(m => m.id !== idParaExcluir);
    localStorage.setItem('materias', JSON.stringify(materias));
    salvarNaNuvem();
    atualizarLista();
    fecharModalExcluir();
};

window.atualizarLista = function() {
    const lista = document.getElementById('lista-materias');
    if(!lista) return;

    // ORDENAÇÃO POR MAIOR MÉDIA
    materias.sort((a, b) => {
        const somaA = (Number(a.n1)||0) + (Number(a.n2)||0) + (Number(a.n3)||0) + (Number(a.n4)||0);
        const somaB = (Number(b.n1)||0) + (Number(b.n2)||0) + (Number(b.n3)||0) + (Number(b.n4)||0);
        return somaB - somaA;
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
                ${[1,2,3,4].map(n => `
                    <input type="number" value="${m['n'+n] || ''}" placeholder="${n}º"
                        style="width:100%; background:rgba(0,0,0,0.3); border:1px solid #222; color:white; padding:10px; border-radius:10px; text-align:center; font-size:13px; font-weight:bold;"
                        onchange="salvarNota(${m.id}, ${n}, this.value)">
                `).join('')}
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
    const somaMedias = materias.reduce((acc, m) => acc + (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4))/4, 0);
    document.getElementById('media-geral').innerText = total > 0 ? (somaMedias / total).toFixed(1) : "0.0";
    document.getElementById('aprov-count').innerText = `${materias.filter(m => (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4)) >= 24).length}/${total}`;
    lucide.createIcons();
};

window.salvarNota = function(id, b, val) {
    const i = materias.findIndex(m => m.id === id);
    if(i !== -1) {
        materias[i]['n'+b] = parseFloat(val) || 0;
        localStorage.setItem('materias', JSON.stringify(materias));
        salvarNaNuvem();
        atualizarLista();
    }
};

window.abrirModal = function() { document.getElementById('modal-materia').style.display = 'flex'; };
window.fecharModal = function() { document.getElementById('modal-materia').style.display = 'none'; };

window.confirmarNovaMateria = function() {
    const input = document.getElementById('nome-materia-input');
    if(input.value) {
        materias.push({ id: Date.now(), nome: input.value, n1:0, n2:0, n3:0, n4:0 });
        localStorage.setItem('materias', JSON.stringify(materias));
        salvarNaNuvem();
        input.value = ''; fecharModal(); atualizarLista();
    }
};
