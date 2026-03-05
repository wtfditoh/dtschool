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

// TABELA DE HORÁRIOS FIXOS (Baseada na sua lógica de 50min)
const TABELA_HORARIOS = {
    matutino: [
        { ordem: "1ª Aula", inicio: "07:00" },
        { ordem: "2ª Aula", inicio: "07:50" },
        { ordem: "3ª Aula", inicio: "08:40" }, // Intervalo aqui normalmente
        { ordem: "4ª Aula", inicio: "09:50" },
        { ordem: "5ª Aula", inicio: "10:40" },
        { ordem: "6ª Aula", inicio: "11:30" }
    ],
    vespertino: [
        { ordem: "1ª Aula", inicio: "13:00" },
        { ordem: "2ª Aula", inicio: "13:50" },
        { ordem: "3ª Aula", inicio: "14:40" },
        { ordem: "4ª Aula", inicio: "15:50" }, // Pós-intervalo (15:30 às 15:50)
        { ordem: "5ª Aula", inicio: "16:40" },
        { ordem: "6ª Aula", inicio: "17:30" }
    ]
};

let diaAtualGrade = 'segunda';
let gradeHoraria = { segunda: [], terca: [], quarta: [], quinta: [], sexta: [] };
let indexParaExcluir = null;
const userPhone = localStorage.getItem('dt_user_phone');

// TOAST
window.mostrarAvisoCustom = (msg) => {
    const toast = document.getElementById('custom-toast');
    if(toast) {
        document.getElementById('toast-message').innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const local = localStorage.getItem('hub_brain_grade');
    if (local) { gradeHoraria = JSON.parse(local); renderizarAulas(); }
    if (userPhone) await carregarDadosNuvem();
    
    const d = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'][new Date().getDay()];
    selecionarDia(d === 'domingo' || d === 'sabado' ? 'segunda' : d);
    
    setInterval(verificarRelogioParaNotificar, 60000);
});

async function carregarDadosNuvem() {
    try {
        const docRef = doc(db, "grades_horarias", userPhone);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) { 
            gradeHoraria = docSnap.data().grade; 
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

window.selecionarDia = (dia) => {
    diaAtualGrade = dia;
    document.querySelectorAll('.btn-dia').forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-dia') === dia));
    renderizarAulas();
};

window.renderizarAulas = () => {
    const lista = document.getElementById('lista-aulas');
    if(!lista) return;
    const aulas = gradeHoraria[diaAtualGrade] || [];
    
    // Ordenar pelo horário de início
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

// MODAL ADICIONAR
window.abrirModalAula = async () => {
    document.getElementById('aula-prof').value = "";
    const selectMat = document.getElementById('aula-materia-select');
    selectMat.innerHTML = '<option value="">Carregando matérias...</option>';
    document.getElementById('modal-aula').style.display = 'flex';

    // Puxa matérias do Firebase (Coleção notas)
    let listaMaterias = [];
    if (userPhone) {
        try {
            const docSnap = await getDoc(doc(db, "notas", userPhone));
            if (docSnap.exists()) listaMaterias = docSnap.data().materias || [];
        } catch (e) { console.error(e); }
    }

    selectMat.innerHTML = '<option value="">Selecionar...</option>';
    listaMaterias.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.nome; opt.textContent = m.nome;
        selectMat.appendChild(opt);
    });
};

window.fecharModalAula = () => document.getElementById('modal-aula').style.display = 'none';

window.salvarAula = async () => {
    const turno = document.getElementById('aula-turno').value; // 'matutino' ou 'vespertino'
    const nAula = document.getElementById('aula-numero').value; // 0 a 5 (índice da aula)
    const matSelect = document.getElementById('aula-materia-select').value;
    const matCustom = document.getElementById('aula-materia-custom').value.trim();
    const prof = document.getElementById('aula-prof').value.trim();
    
    const materiaFinal = matSelect || matCustom;
    if(!materiaFinal) { alert("Escolha uma matéria!"); return; }

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

// ... (Resto das funções de excluir e notificar permanecem iguais)
window.abrirConfirmExcluir = (i) => { indexParaExcluir = i; document.getElementById('modal-confirm-excluir').style.display = 'flex'; };
window.fecharModalExcluir = () => document.getElementById('modal-confirm-excluir').style.display = 'none';
document.getElementById('btn-confirmar-delete').onclick = async () => {
    gradeHoraria[diaAtualGrade].splice(indexParaExcluir, 1);
    renderizarAulas(); await sincronizar(); fecharModalExcluir();
};

function verificarRelogioParaNotificar() {
    const d = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'][new Date().getDay()];
    const aulas = gradeHoraria[d] || [];
    const agora = new Date();
    const minAgora = (agora.getHours() * 60) + agora.getMinutes();

    aulas.forEach(aula => {
        const [h, m] = aula.hora.split(':').map(Number);
        const minAula = (h * 60) + m;
        const diff = minAula - minAgora;
        if (diff === 30 || diff === 5) {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'NOTIFICAR_AULA', materia: aula.materia, hora: aula.hora, tempoRestante: diff });
            }
        }
    });
}
