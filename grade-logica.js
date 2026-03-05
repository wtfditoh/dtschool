import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const TABELA_HORARIOS = {
    matutino: [
        { ordem: "1ª Aula", inicio: "07:00" },
        { ordem: "2ª Aula", inicio: "07:50" },
        { ordem: "3ª Aula", inicio: "08:40" },
        { ordem: "4ª Aula", inicio: "09:50" },
        { ordem: "5ª Aula", inicio: "10:40" },
        { ordem: "6ª Aula", inicio: "11:30" }
    ],
    vespertino: [
        { ordem: "1ª Aula", inicio: "13:00" },
        { ordem: "2ª Aula", inicio: "13:50" },
        { ordem: "3ª Aula", inicio: "14:40" },
        { ordem: "4ª Aula", inicio: "15:50" },
        { ordem: "5ª Aula", inicio: "16:40" },
        { ordem: "6ª Aula", inicio: "17:30" }
    ]
};

let diaAtualGrade = 'segunda';
let gradeHoraria = { segunda: [], terca: [], quarta: [], quinta: [], sexta: [] };
let indexParaExcluir = null;
const userPhone = localStorage.getItem('dt_user_phone');

// --- FUNÇÕES DE INTERFACE (MODAIS E TOAST) ---
window.mostrarAvisoCustom = (msg) => {
    const toast = document.getElementById('custom-toast');
    if(toast) {
        document.getElementById('toast-message').innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
};

window.abrirAjudaBateria = () => {
    const modal = document.getElementById('modal-ajuda-bateria');
    if(modal) modal.style.display = 'flex';
};

window.fecharAjudaBateria = () => {
    const modal = document.getElementById('modal-ajuda-bateria');
    if(modal) modal.style.display = 'none';
};

window.fecharModalAula = () => document.getElementById('modal-aula').style.display = 'none';
window.fecharModalExcluir = () => document.getElementById('modal-confirm-excluir').style.display = 'none';

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    const local = localStorage.getItem('hub_brain_grade');
    if (local) { gradeHoraria = JSON.parse(local); renderizarAulas(); }
    if (userPhone) await carregarDadosNuvem();
    
    const d = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'][new Date().getDay()];
    selecionarDia(d === 'domingo' || d === 'sabado' ? 'segunda' : d);
    
    setInterval(verificarRelogioParaNotificar, 60000);
    if(typeof lucide !== 'undefined') lucide.createIcons();
});

// --- LOGICA DE DADOS (FIREBASE) ---
async function carregarDadosNuvem() {
    try {
        const docRef = doc(db, "grades_horarias", userPhone);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) { 
            gradeHoraria = docSnap.data().grade; 
            localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
            renderizarAulas(); 
        }
    } catch (e) { console.error(e); }
}

async function sincronizar() {
    localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
    if (userPhone) {
        try {
            await setDoc(doc(db, "grades_horarias", userPhone), { grade: gradeHoraria, atualizadoEm: Date.now() });
        } catch (e) { console.error(e); }
    }
}

// --- LOGICA DA GRADE ---
window.selecionarDia = (dia) => {
    diaAtualGrade = dia;
    document.querySelectorAll('.btn-dia').forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-dia') === dia));
    renderizarAulas();
};

window.renderizarAulas = () => {
    const lista = document.getElementById('lista-aulas');
    if(!lista) return;
    const aulas = gradeHoraria[diaAtualGrade] || [];
    aulas.sort((a, b) => a.hora.localeCompare(b.hora));

    lista.innerHTML = aulas.length === 0 ? 
        '<p style="text-align:center;color:#444;margin-top:50px;">Nenhuma aula para hoje.</p>' :
        aulas.map((a, i) => `
            <div class="card-aula">
                <div class="aula-tempo">
                    <span style="font-size:10px; display:block; color:#8a2be2; font-weight:bold;">${a.ordem}</span>
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

window.abrirModalAula = async () => {
    document.getElementById('aula-prof').value = "";
    const selectMat = document.getElementById('aula-materia-select');
    selectMat.innerHTML = '<option value="">Carregando matérias...</option>';
    document.getElementById('modal-aula').style.display = 'flex';

    let listaMaterias = [];
    if (userPhone) {
        try {
            const docSnap = await getDoc(doc(db, "notas", userPhone));
            if (docSnap.exists()) {
                listaMaterias = docSnap.data().materias || [];
                localStorage.setItem('materias', JSON.stringify(listaMaterias));
            } else {
                listaMaterias = JSON.parse(localStorage.getItem('materias')) || [];
            }
        } catch (e) { 
            listaMaterias = JSON.parse(localStorage.getItem('materias')) || [];
        }
    }

    selectMat.innerHTML = '<option value="">Selecionar...</option>';
    listaMaterias.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.nome || m; opt.textContent = m.nome || m;
        selectMat.appendChild(opt);
    });
};

window.salvarAula = async () => {
    const turno = document.getElementById('aula-turno').value;
    const nAula = document.getElementById('aula-numero').value;
    const matSelect = document.getElementById('aula-materia-select').value;
    const matCustom = document.getElementById('aula-materia-custom').value.trim();
    const prof = document.getElementById('aula-prof').value.trim();
    
    const materiaFinal = matSelect || matCustom;
    if(!materiaFinal) { 
        document.getElementById('erro-modal').style.display = 'block';
        return; 
    }

    const infoHorario = TABELA_HORARIOS[turno][nAula];
    if(!gradeHoraria[diaAtualGrade]) gradeHoraria[diaAtualGrade] = [];
    
    gradeHoraria[diaAtualGrade].push({ 
        ordem: infoHorario.ordem, 
        materia: materiaFinal, 
        hora: infoHorario.inicio, 
        prof: prof 
    });

    renderizarAulas();
    fecharModalAula();
    await sincronizar();
    window.mostrarAvisoCustom("Aula Agendada! 🚀");
};

window.abrirConfirmExcluir = (i) => { 
    indexParaExcluir = i; 
    document.getElementById('modal-confirm-excluir').style.display = 'flex'; 
};

document.getElementById('btn-confirmar-delete').onclick = async () => {
    gradeHoraria[diaAtualGrade].splice(indexParaExcluir, 1);
    renderizarAulas(); await sincronizar(); fecharModalExcluir();
};

// --- NOTIFICAÇÕES (PARA TODOS OS CELULARES) ---
window.ativarNotificacoesReal = () => {
    if(!("Notification" in window)) { 
        alert("Este navegador não suporta notificações."); 
        return; 
    }
    Notification.requestPermission().then(p => { 
        if(p==='granted') window.mostrarAvisoCustom("Notificações Ativas! ✅");
        else alert("Você precisa permitir as notificações nas configurações do site/navegador.");
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
