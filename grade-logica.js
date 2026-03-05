import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuração Firebase
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

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Preencher seletor de horas (00h até 23h)
    const selectH = document.getElementById('aula-hora-h');
    if (selectH) {
        selectH.innerHTML = "";
        for(let i=0; i<24; i++) {
            let h = i < 10 ? '0'+i : i;
            selectH.innerHTML += `<option value="${h}">${h}h</option>`;
        }
    }

    // 2. Carregar dados locais (Cache rápido)
    const local = localStorage.getItem('hub_brain_grade');
    if (local) {
        gradeHoraria = JSON.parse(local);
        renderizarAulas();
    }

    // 3. Carregar dados da Nuvem (Firebase)
    if (userPhone) await carregarDadosNuvem();
    
    // 4. Selecionar dia automático
    const diasSemana = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
    const d = diasSemana[new Date().getDay()];
    selecionarDia(d === 'domingo' || d === 'sabado' ? 'segunda' : d);
    
    // 5. Iniciar vigia das aulas (Checa a cada 60 seg)
    setInterval(verificarRelogioParaNotificar, 60000);
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
});

// FIREBASE & SINCRONIZAÇÃO
async function carregarDadosNuvem() {
    try {
        const docRef = doc(db, "grades_horarias", userPhone);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            gradeHoraria = docSnap.data().grade;
            localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
            renderizarAulas();
        }
    } catch (e) { console.error("Erro Firebase:", e); }
}

async function sincronizar() {
    localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
    if (userPhone) {
        try {
            await setDoc(doc(db, "grades_horarias", userPhone), {
                grade: gradeHoraria,
                atualizadoEm: Date.now()
            });
        } catch (e) { console.error("Erro Sincronismo:", e); }
    }
}

// INTERFACE
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
    
    // Ordena por horário
    aulas.sort((a, b) => a.hora.localeCompare(b.hora));

    lista.innerHTML = aulas.length === 0 ? 
        '<p style="text-align:center;color:#444;margin-top:50px;">Nenhuma aula para hoje.</p>' :
        aulas.map((a, i) => `
            <div class="card-aula">
                <div class="aula-tempo">
                    <span style="font-size:9px; display:block; opacity:0.6; text-transform:uppercase;">${a.ordem || 'Aula'}</span>
                    ${a.hora}
                </div>
                <div class="aula-info">
                    <b>${a.materia}</b>
                    <span>${a.prof || 'Sem prof.'}</span>
                </div>
                <button onclick="abrirConfirmExcluir(${i})" style="margin-left:auto;background:none;border:none;color:#ff4444;padding:10px;">
                    <i data-lucide="trash-2" style="width:18px;"></i>
                </button>
            </div>
        `).join('');
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

// MODAL AULA
window.abrirModalAula = () => {
    const select = document.getElementById('aula-materia-select');
    const dadosNotas = JSON.parse(localStorage.getItem('materias')) || [];
    select.innerHTML = '<option value="">Selecionar matéria...</option>';
    dadosNotas.forEach(mat => {
        const opt = document.createElement('option');
        opt.value = mat.nome; opt.textContent = mat.nome;
        select.appendChild(opt);
    });
    document.getElementById('modal-aula').style.display = 'flex';
};

window.fecharModalAula = () => {
    document.getElementById('modal-aula').style.display = 'none';
};

window.salvarAula = async () => {
    const o = document.getElementById('aula-ordem').value;
    const s = document.getElementById('aula-materia-select').value;
    const c = document.getElementById('aula-materia-custom').value.trim();
    
    // Captura dos novos Selects Neon
    const selH = document.getElementById('aula-hora-h').value;
    const selM = document.getElementById('aula-hora-m').value;
    const h = `${selH}:${selM}`;
    
    const p = document.getElementById('aula-prof').value.trim();
    const mat = s || c;

    if(!mat || !h) return alert("Preencha a matéria e o horário!");

    if(!gradeHoraria[diaAtualGrade]) gradeHoraria[diaAtualGrade] = [];
    gradeHoraria[diaAtualGrade].push({ ordem: o, materia: mat, hora: h, prof: p });

    renderizarAulas();
    fecharModalAula();
    await sincronizar();
};

// EXCLUSÃO
window.abrirConfirmExcluir = (i) => {
    indexParaExcluir = i;
    document.getElementById('modal-confirm-excluir').style.display = 'flex';
};

window.fecharModalExcluir = () => document.getElementById('modal-confirm-excluir').style.display = 'none';

document.getElementById('btn-confirmar-delete').onclick = async () => {
    if(indexParaExcluir !== null) {
        gradeHoraria[diaAtualGrade].splice(indexParaExcluir, 1);
        renderizarAulas();
        await sincronizar();
        fecharModalExcluir();
    }
};

// LÓGICA DE NOTIFICAÇÃO (30 MIN E 5 MIN)
function verificarRelogioParaNotificar() {
    const dias = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
    const hoje = dias[new Date().getDay()];
    const aulas = gradeHoraria[hoje] || [];
    const agora = new Date();
    const minAgora = (agora.getHours() * 60) + agora.getMinutes();

    aulas.forEach(aula => {
        const [h, m] = aula.hora.split(':').map(Number);
        const minAula = (h * 60) + m;
        const diferenca = minAula - minAgora;

        // Alerta de 30 minutos
        if (diferenca === 30) {
            dispararAviso(aula.materia, aula.hora, "30_MIN");
        } 
        // Alerta de 5 minutos
        else if (diferenca === 5) {
            dispararAviso(aula.materia, aula.hora, "5_MIN");
        }
    });
}

function dispararAviso(materia, hora, tipo) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'NOTIFICAR_AULA',
            materia: materia,
            hora: hora,
            tempoRestante: tipo
        });
        console.log(`Sinal enviado ao SW: ${tipo} para ${materia}`);
    }
}

window.ativarNotificacoesReal = () => {
    Notification.requestPermission().then(p => { 
        if(p==='granted') {
            alert("Notificações Hub Brain ativadas! ✅");
            if(document.getElementById('modal-notif-boasvindas'))
                document.getElementById('modal-notif-boasvindas').style.display = 'none';
        } else {
            alert("Você precisa permitir as notificações nas configurações do navegador.");
        }
    });
};
