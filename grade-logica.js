import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIGURAÇÃO FIREBASE
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

// VARIÁVEIS GLOBAIS
let diaAtualGrade = 'segunda';
let gradeHoraria = { segunda: [], terca: [], quarta: [], quinta: [], sexta: [] };
let indexParaExcluir = null;
const userPhone = localStorage.getItem('dt_user_phone');

// TOAST PERSONALIZADO
window.mostrarAvisoCustom = (msg) => {
    const toast = document.getElementById('custom-toast');
    if(toast) {
        document.getElementById('toast-message').innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
};

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', async () => {
    // Preencher Seletor de Horas (00h às 23h)
    const selectH = document.getElementById('aula-hora-h');
    if (selectH) {
        selectH.innerHTML = "";
        for(let i=0; i<24; i++) {
            let h = i < 10 ? '0'+i : i;
            selectH.innerHTML += `<option value="${h}">${h}h</option>`;
        }
    }

    // 1. Carregar Local primeiro (rápido)
    const local = localStorage.getItem('hub_brain_grade');
    if (local) { 
        gradeHoraria = JSON.parse(local); 
        renderizarAulas(); 
    }
    
    // 2. Carregar da Nuvem (Firebase)
    if (userPhone) {
        await carregarDadosNuvem();
    }
    
    // 3. Definir dia atual automaticamente
    const d = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'][new Date().getDay()];
    selecionarDia(d === 'domingo' || d === 'sabado' ? 'segunda' : d);
    
    // Vigia de notificações (roda a cada minuto)
    setInterval(verificarRelogioParaNotificar, 60000);
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
});

// --- FIREBASE: CARREGAR ---
async function carregarDadosNuvem() {
    try {
        const docRef = doc(db, "grades_horarias", userPhone);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) { 
            gradeHoraria = docSnap.data().grade; 
            localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
            renderizarAulas(); 
        }
    } catch (e) { 
        console.error("Erro Nuvem:", e); 
    }
}

// --- FIREBASE: SALVAR ---
async function sincronizar() {
    localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
    if (userPhone) {
        try {
            await setDoc(doc(db, "grades_horarias", userPhone), { 
                grade: gradeHoraria, 
                atualizadoEm: Date.now(),
                usuario: userPhone
            });
        } catch (e) { 
            console.error("Erro Sincronizar:", e); 
        }
    }
}

// MUDAR DIA DA GRADE
window.selecionarDia = (dia) => {
    diaAtualGrade = dia;
    document.querySelectorAll('.btn-dia').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-dia') === dia);
    });
    renderizarAulas();
};

// EXIBIR AULAS NA TELA
window.renderizarAulas = () => {
    const lista = document.getElementById('lista-aulas');
    if(!lista) return;
    const aulas = gradeHoraria[diaAtualGrade] || [];
    
    // Ordenar por horário
    aulas.sort((a, b) => a.hora.localeCompare(b.hora));

    lista.innerHTML = aulas.length === 0 ? 
        '<p style="text-align:center;color:#444;margin-top:50px;">Nenhuma aula para hoje.</p>' :
        aulas.map((a, i) => `
            <div class="card-aula">
                <div class="aula-tempo">
                    <span style="font-size:9px; display:block; opacity:0.6;">${a.ordem}</span>
                    ${a.hora}
                </div>
                <div class="aula-info">
                    <b>${a.materia}</b>
                    <span><i data-lucide="user" style="width:12px;"></i> ${a.prof || 'Sem prof.'}</span>
                </div>
                <button class="btn-deletar-aula" onclick="abrirConfirmExcluir(${i})">
                    <i data-lucide="trash-2" style="width:18px;"></i>
                </button>
            </div>
        `).join('');
    lucide.createIcons();
};

// MODAL ADICIONAR (PUXANDO MATÉRIAS DAS NOTAS)
window.abrirModalAula = () => {
    document.getElementById('aula-materia-custom').value = "";
    document.getElementById('aula-prof').value = "";
    document.getElementById('aula-hora-h').value = "07";
    document.getElementById('aula-hora-m').value = "00";
    if(document.getElementById('erro-modal')) document.getElementById('erro-modal').style.display = 'none';

    const select = document.getElementById('aula-materia-select');
    // Busca matérias da outra página de notas
    const dadosNotas = JSON.parse(localStorage.getItem('materias')) || [];
    
    select.innerHTML = '<option value="">Selecionar Matéria...</option>';
    dadosNotas.forEach(mat => {
        const nomeMateria = typeof mat === 'object' ? mat.nome : mat;
        if(nomeMateria) {
            const opt = document.createElement('option');
            opt.value = nomeMateria; 
            opt.textContent = nomeMateria;
            select.appendChild(opt);
        }
    });
    
    document.getElementById('modal-aula').style.display = 'flex';
};

window.fecharModalAula = () => document.getElementById('modal-aula').style.display = 'none';

// SALVAR NOVA AULA
window.salvarAula = async () => {
    const btn = document.getElementById('btn-salvar-aula');
    const erro = document.getElementById('erro-modal');
    
    const o = document.getElementById('aula-ordem').value;
    const s = document.getElementById('aula-materia-select').value;
    const c = document.getElementById('aula-materia-custom').value.trim();
    const h = document.getElementById('aula-hora-h').value + ":" + document.getElementById('aula-hora-m').value;
    const p = document.getElementById('aula-prof').value.trim();
    
    const mat = s || c;

    if(!mat) {
        if(erro) erro.style.display = 'block';
        btn.classList.add('erro');
        setTimeout(() => btn.classList.remove('erro'), 300);
        return;
    }

    if(!gradeHoraria[diaAtualGrade]) gradeHoraria[diaAtualGrade] = [];
    gradeHoraria[diaAtualGrade].push({ ordem: o, materia: mat, hora: h, prof: p });

    renderizarAulas();
    fecharModalAula();
    await sincronizar();
    window.mostrarAvisoCustom("Aula Agendada! 🚀");
};

// EXCLUSÃO
window.abrirConfirmExcluir = (i) => {
    indexParaExcluir = i;
    document.getElementById('modal-confirm-excluir').style.display = 'flex';
};

window.fecharModalExcluir = () => document.getElementById('modal-confirm-excluir').style.display = 'none';

document.getElementById('btn-confirmar-delete').onclick = async () => {
    gradeHoraria[diaAtualGrade].splice(indexParaExcluir, 1);
    renderizarAulas();
    await sincronizar();
    fecharModalExcluir();
    window.mostrarAvisoCustom("Aula Removida! 🗑️");
};

// AJUDA BATERIA (PARA XIAOMI/ANDROID)
window.abrirAjudaBateria = () => {
    const modal = document.getElementById('modal-ajuda-bateria');
    if(modal) modal.style.display = 'flex';
};

window.fecharAjudaBateria = () => {
    const modal = document.getElementById('modal-ajuda-bateria');
    if(modal) modal.style.display = 'none';
};

// NOTIFICAÇÕES
window.ativarNotificacoesReal = () => {
    if(!("Notification" in window)) { 
        window.mostrarAvisoCustom("Não suportado! ❌"); 
        return; 
    }
    Notification.requestPermission().then(p => { 
        if(p==='granted') window.mostrarAvisoCustom("Notificações Ativas! ✅");
        else window.mostrarAvisoCustom("Acesso Negado! 🚫");
    });
};

function verificarRelogioParaNotificar() {
    const dMap = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
    const d = dMap[new Date().getDay()];
    const aulas = gradeHoraria[d] || [];
    const agora = new Date();
    const minAgora = (agora.getHours() * 60) + agora.getMinutes();

    aulas.forEach(aula => {
        const [h, m] = aula.hora.split(':').map(Number);
        const minAula = (h * 60) + m;
        const diff = minAula - minAgora;
        
        // Notifica com 30 min e 5 min de antecedência
        if (diff === 30 || diff === 5) {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ 
                    type: 'NOTIFICAR_AULA', 
                    materia: aula.materia, 
                    hora: aula.hora, 
                    tempoRestante: diff 
                });
            }
        }
    });
}
