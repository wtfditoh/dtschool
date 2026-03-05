import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURAÇÃO FIREBASE (IGUAL À SUA AGENDA) ---
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

// --- VARIÁVEIS GLOBAIS ---
let diaAtualGrade = 'segunda';
let gradeHoraria = { segunda: [], terca: [], quarta: [], quinta: [], sexta: [] };
const userPhone = localStorage.getItem('dt_user_phone'); // Pegando o telefone que você já usa no login

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Carrega o que tem no celular primeiro (rápido)
    const local = localStorage.getItem('hub_brain_grade');
    if (local) {
        gradeHoraria = JSON.parse(local);
        renderizarAulas();
    }

    // 2. Se estiver logado, busca na nuvem e atualiza
    if (userPhone) {
        await carregarDadosNuvem();
    }
    
    // 3. Define o dia inicial (hoje)
    const d = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'][new Date().getDay()];
    selecionarDia(d === 'domingo' || d === 'sabado' ? 'segunda' : d);
    
    // 4. Inicia o vigia de notificações
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
    } catch (e) {
        console.error("Erro Firebase Grade:", e);
    }
}

async function sincronizar() {
    // Salva Local
    localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));

    // Salva Firebase se logado
    if (userPhone) {
        try {
            await setDoc(doc(db, "grades_horarias", userPhone), {
                grade: gradeHoraria,
                atualizadoEm: Date.now()
            });
        } catch (e) { console.error("Erro ao sincronizar:", e); }
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

    if (aulas.length === 0) {
        lista.innerHTML = '<p style="text-align:center;color:#444;margin-top:50px;">Nenhuma aula cadastrada.</p>';
    } else {
        lista.innerHTML = aulas.map((a, i) => `
            <div class="card-aula">
                <div class="aula-tempo">${a.hora}</div>
                <div class="aula-info"><b>${a.materia}</b><span>${a.prof || 'Sem professor'}</span></div>
                <button onclick="excluirAula(${i})" style="margin-left:auto;background:none;border:none;color:#ff4444;padding:10px;">
                    <i data-lucide="trash-2" style="width:18px;"></i>
                </button>
            </div>
        `).join('');
    }
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

window.salvarAula = async () => {
    const m = document.getElementById('aula-materia').value.trim();
    const h = document.getElementById('aula-hora').value;
    const p = document.getElementById('aula-prof').value.trim();

    if(!m || !h) return alert("Preencha matéria e horário!");

    if(!gradeHoraria[diaAtualGrade]) gradeHoraria[diaAtualGrade] = [];
    gradeHoraria[diaAtualGrade].push({ materia: m, hora: h, prof: p });

    renderizarAulas();
    fecharModalAula();
    await sincronizar();
};

window.excluirAula = async (i) => {
    if(confirm("Remover esta aula?")) {
        gradeHoraria[diaAtualGrade].splice(i, 1);
        renderizarAulas();
        await sincronizar();
    }
};

window.abrirModalAula = () => document.getElementById('modal-aula').style.display = 'flex';
window.fecharModalAula = () => {
    document.getElementById('modal-aula').style.display = 'none';
    document.getElementById('aula-materia').value = "";
    document.getElementById('aula-prof').value = "";
};

// --- NOTIFICAÇÕES ---
window.ativarNotificacoes = () => {
    Notification.requestPermission().then(p => { 
        if(p==='granted') alert("Notificações de aula ativadas! 🔔"); 
    });
};

function verificarRelogioParaNotificar() {
    const hojeNum = new Date().getDay();
    const diasArray = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
    const hojeNome = diasArray[hojeNum];
    
    const aulas = gradeHoraria[hojeNome] || [];
    const agora = new Date();
    const minAgora = (agora.getHours() * 60) + agora.getMinutes();

    aulas.forEach(aula => {
        const [h, m] = aula.hora.split(':').map(Number);
        const minAula = (h * 60) + m;

        // Notifica 5 minutos antes
        if (minAula - minAgora === 5) {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'NOTIFICAR_AULA',
                    materia: aula.materia,
                    hora: aula.hora
                });
            }
        }
    });
                    }
