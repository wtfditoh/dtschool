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
        { ordem: "1ª Aula", inicio: "07:00" }, { ordem: "2ª Aula", inicio: "07:50" },
        { ordem: "3ª Aula", inicio: "08:40" }, { ordem: "4ª Aula", inicio: "09:50" },
        { ordem: "5ª Aula", inicio: "10:40" }, { ordem: "6ª Aula", inicio: "11:30" }
    ],
    vespertino: [
        { ordem: "1ª Aula", inicio: "13:00" }, { ordem: "2ª Aula", inicio: "13:50" },
        { ordem: "3ª Aula", inicio: "14:40" }, { ordem: "4ª Aula", inicio: "15:50" },
        { ordem: "5ª Aula", inicio: "16:40" }, { ordem: "6ª Aula", inicio: "17:30" }
    ]
};

let diaAtualGrade = 'segunda';
let gradeHoraria = { domingo: [], segunda: [], terca: [], quarta: [], quinta: [], sexta: [], sabado: [] };
let indexParaExcluir = null;

// Identificação do usuário
let userId = localStorage.getItem('dt_user_email') || localStorage.getItem('dt_user_phone') || "convidado";

// --- INTERFACE ---
window.mostrarAvisoCustom = (msg) => {
    const toast = document.getElementById('custom-toast');
    if(toast) {
        document.getElementById('toast-message').innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
};

window.fecharModalAula = () => { document.getElementById('modal-aula').style.display = 'none'; };
window.fecharModalExcluir = () => { document.getElementById('modal-confirm-excluir').style.display = 'none'; };

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    const local = localStorage.getItem('hub_brain_grade');
    if (local) { 
        gradeHoraria = JSON.parse(local); 
        renderizarAulas(); 
    }
    
    const dMap = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
    const hoje = dMap[new Date().getDay()];
    selecionarDia(hoje);

    if (userId) await carregarDadosNuvem();
    if(typeof lucide !== 'undefined') lucide.createIcons();
});

async function carregarDadosNuvem() {
    try {
        const docSnap = await getDoc(doc(db, "grades_horarias", userId));
        if (docSnap.exists()) { 
            gradeHoraria = docSnap.data().grade; 
            localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
            renderizarAulas(); 
        }
    } catch (e) { console.error("Erro ao carregar:", e); }
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
    aulas.sort((a, b) => a.hora.localeCompare(b.hora));

    lista.innerHTML = aulas.length === 0 ? 
        `<p style="text-align:center;color:#666;margin-top:50px;">Nenhuma aula para ${diaAtualGrade}.</p>` :
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
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

// --- FUNÇÃO RESTAURADA: BUSCA MATÉRIAS DAS NOTAS ---
window.abrirModalAula = async () => {
    document.getElementById('aula-prof').value = "";
    document.getElementById('aula-materia-custom').value = "";
    
    const selectMat = document.getElementById('aula-materia-select');
    selectMat.innerHTML = '<option value="">Carregando matérias...</option>';
    document.getElementById('modal-aula').style.display = 'flex';

    try {
        // Busca o documento na coleção 'notas' que tem o ID do usuário
        const docSnap = await getDoc(doc(db, "notas", userId));
        
        if (docSnap.exists()) {
            const dados = docSnap.data();
            // Tenta pegar do campo 'materias' (array) ou do campo 'texto' (string separada por linhas)
            let listaMaterias = dados.materias || [];
            
            // Se as matérias vierem de um campo de texto (aba de notas comum)
            if (dados.texto && listaMaterias.length === 0) {
                listaMaterias = dados.texto.split('\n').filter(m => m.trim() !== "");
            }

            selectMat.innerHTML = '<option value="">Selecionar...</option>';
            listaMaterias.forEach(m => {
                const nome = m.nome || m;
                const opt = document.createElement('option');
                opt.value = nome; 
                opt.textContent = nome;
                selectMat.appendChild(opt);
            });
        } else {
            selectMat.innerHTML = '<option value="">Nenhuma matéria salva</option>';
        }
    } catch (e) { 
        console.error("Erro ao buscar matérias:", e);
        selectMat.innerHTML = '<option value="">Erro ao carregar</option>'; 
    }
};

window.salvarAula = async () => {
    const turno = document.getElementById('aula-turno').value;
    const nAula = document.getElementById('aula-numero').value;
    const matSelect = document.getElementById('aula-materia-select').value;
    const matCustom = document.getElementById('aula-materia-custom').value.trim();
    const prof = document.getElementById('aula-prof').value.trim();
    
    const materiaFinal = matSelect || matCustom;
    if(!materiaFinal) {
        window.mostrarAvisoCustom("⚠️ Selecione ou digite uma matéria!");
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
    
    try {
        await setDoc(doc(db, "grades_horarias", userId), { 
            grade: gradeHoraria, 
            atualizadoEm: Date.now() 
        }, { merge: true });

        localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
        window.mostrarAvisoCustom("✅ Aula salva!");
    } catch (e) {
        window.mostrarAvisoCustom("❌ Erro ao sincronizar!");
    }
};

window.abrirConfirmExcluir = (i) => { 
    indexParaExcluir = i; 
    document.getElementById('modal-confirm-excluir').style.display = 'flex'; 
};

document.getElementById('btn-confirmar-delete').onclick = async () => {
    gradeHoraria[diaAtualGrade].splice(indexParaExcluir, 1);
    renderizarAulas();

    try {
        localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
        await setDoc(doc(db, "grades_horarias", userId), { 
            grade: gradeHoraria 
        }, { merge: true });
    } catch (e) { console.error(e); }
    
    fecharModalExcluir();
};
