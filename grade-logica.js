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

let diaAtualGrade = 'segunda';
let gradeHoraria = { segunda: [], terca: [], quarta: [], quinta: [], sexta: [] };
let indexParaExcluir = null;
const userPhone = localStorage.getItem('dt_user_phone');

document.addEventListener('DOMContentLoaded', async () => {
    const local = localStorage.getItem('hub_brain_grade');
    if (local) {
        gradeHoraria = JSON.parse(local);
        renderizarAulas();
    }
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
            localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
            renderizarAulas();
        }
    } catch (e) { console.error(e); }
}

async function sincronizar() {
    localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
    if (userPhone) {
        try {
            await setDoc(doc(db, "grades_horarias", userPhone), {
                grade: gradeHoraria,
                atualizadoEm: Date.now()
            });
        } catch (e) { console.error(e); }
    }
}

window.selecionarDia = (dia) => {
    diaAtualGrade = dia;
    document.querySelectorAll('.btn-dia').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-dia') === dia);
    });
    renderizarAulas();
};

window.renderizarAulas = () => {
    const lista = document.getElementById('lista-aulas');
    if(!lista) return;
    const aulas = gradeHoraria[diaAtualGrade] || [];
    aulas.sort((a, b) => a.hora.localeCompare(b.hora));

    lista.innerHTML = aulas.length === 0 ? 
        '<p style="text-align:center;color:#444;margin-top:50px;">Nenhuma aula cadastrada.</p>' :
        aulas.map((a, i) => `
            <div class="card-aula">
                <div class="aula-tempo">
                    <span style="font-size:10px; display:block; opacity:0.6; text-transform:uppercase;">${a.ordem || 'Aula'}</span>
                    ${a.hora}
                </div>
                <div class="aula-info"><b>${a.materia}</b><span>${a.prof || 'Sem professor'}</span></div>
                <button onclick="abrirConfirmExcluir(${i})" style="margin-left:auto;background:none;border:none;color:#ff4444;padding:10px;">
                    <i data-lucide="trash-2" style="width:18px;"></i>
                </button>
            </div>
        `).join('');
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

window.salvarAula = async () => {
    const o = document.getElementById('aula-ordem').value;
    const m = document.getElementById('aula-materia').value.trim();
    const h = document.getElementById('aula-hora').value;
    const p = document.getElementById('aula-prof').value.trim();

    if(!m || !h) return alert("Preencha matéria e horário!");

    if(!gradeHoraria[diaAtualGrade]) gradeHoraria[diaAtualGrade] = [];
    gradeHoraria[diaAtualGrade].push({ ordem: o, materia: m, hora: h, prof: p });

    renderizarAulas();
    fecharModalAula();
    await sincronizar();
};

// --- NOVAS FUNÇÕES DOS MODAIS CUSTOMIZADOS ---

window.abrirModalAula = () => document.getElementById('modal-aula').style.display = 'flex';
window.fecharModalAula = () => {
    document.getElementById('modal-aula').style.display = 'none';
    document.getElementById('aula-materia').value = "";
    document.getElementById('aula-prof').value = "";
};

window.abrirConfirmExcluir = (i) => {
    indexParaExcluir = i;
    document.getElementById('modal-confirm-excluir').style.display = 'flex';
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

window.fecharModalExcluir = () => {
    document.getElementById('modal-confirm-excluir').style.display = 'none';
    indexParaExcluir = null;
};

// Configura o clique do botão "Apagar" dentro do modal
document.getElementById('btn-confirmar-delete').onclick = async () => {
    if(indexParaExcluir !== null) {
        gradeHoraria[diaAtualGrade].splice(indexParaExcluir, 1);
        renderizarAulas();
        await sincronizar();
        fecharModalExcluir();
    }
};

window.abrirModalNotif = () => {
    document.getElementById('modal-notif-bo
                            
