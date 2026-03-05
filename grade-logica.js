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

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    const selectH = document.getElementById('aula-hora-h');
    if (selectH) {
        selectH.innerHTML = "";
        for(let i=0; i<24; i++) {
            let h = i < 10 ? '0'+i : i;
            selectH.innerHTML += `<option value="${h}">${h}h</option>`;
        }
    }

    const local = localStorage.getItem('hub_brain_grade');
    if (local) {
        gradeHoraria = JSON.parse(local);
        renderizarAulas();
    }

    if (userPhone) await carregarDadosNuvem();
    
    const diasSemana = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
    const d = diasSemana[new Date().getDay()];
    selecionarDia(d === 'domingo' || d === 'sabado' ? 'segunda' : d);
    
    setInterval(verificarRelogioParaNotificar, 60000);
    if(typeof lucide !== 'undefined') lucide.createIcons();
});

// --- FIREBASE ---
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

// --- INTERFACE ---
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

// --- MODAL AULA ---
window.abrirModalAula = () => {
    // 1. Limpa os campos
    document.getElementById('aula-materia-custom').value = "";
    document.getElementById('aula-prof').value = "";
    document.getElementById('aula-hora-h').value = "07";
    document.getElementById('aula-hora-m').value = "00";
    
    // 2. Esconde o erro se ele estiver aparecendo de uma tentativa anterior
    const erroMsg = document.getElementById('erro-modal');
    if(erroMsg) erroMsg.style.display = 'none';

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
    const btn = document.getElementById('btn-salvar-aula');
    const erroMsg = document.getElementById('erro-modal');
    const o = document.getElementById('aula-ordem').value;
    const s = document.getElementById('aula-materia-select').value;
    const c = document.getElementById('aula-materia-custom').value.trim();
    const h = document.getElementById('aula-hora-h').value + ":" + document.getElementById('aula-hora-m').value;
    const p = document.getElementById('aula-prof').value.trim();
    const mat = s || c;

    // Lógica de Erro: Botão treme e mensagem aparece por 2 segundos
    if(!mat) {
        if(erroMsg) erroMsg.style.display = 'block';
        if(btn) {
            const originalText = btn.innerText;
            btn.classList.add('erro');
            btn.innerText = "PREENCHA TUDO!";
            setTimeout(() => {
                btn.classList.remove('erro');
                btn.innerText = originalText;
                if(erroMsg) erroMsg.style.display = 'none';
            }, 2000);
        }
        return;
    }

    if(!gradeHoraria[diaAtualGrade]) gradeHoraria[diaAtualGrade] = [];
    gradeHoraria[diaAtualGrade].push({ ordem: o, materia: mat, hora: h, prof: p });

    renderizarAulas();
    fecharModalAula();
    await sincronizar();
};

// --- EXCLUSÃO ---
window.abrirConfirmExcluir = (i) => {
    indexParaExcluir = i;
    document.getElementById('modal-confirm-excluir').style.display = 'flex';
    if(typeof lucide !== 'undefined') lucide.createIcons();
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

// --- NOTIFICAÇÕES ---
function verificarRelogioParaNotificar() {
    const dias = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
    const hoje = dias[new Date().getDay()];
    const aulas = gradeHoraria[hoje] || [];
    const agora = new Date();
    const minAgora = (agora.getHours() * 60) + agora.getMinutes();

    aulas.forEach(aula => {
        const [h, m] = aula.hora.split(':').map(Number);
        const minAula = (h * 60) + m;
        const diff = minAula - minAgora;

        if (diff === 30) dispararAviso(aula.materia, aula.hora, "30_MIN");
        if (diff === 5) dispararAviso(aula.materia, aula.hora, "5_MIN");
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
    }
}

window.ativarNotificacoesReal = () => {
    if (!("Notification" in window)) {
        alert("Navegador não suporta notificações.");
        return;
    }
    Notification.requestPermission().then(p => { 
        if(p==='granted') {
            alert("Notificações ativadas! ✅");
            const modalBoasVindas = document.getElementById('modal-notif-boasvindas');
            if(modalBoasVindas) modalBoasVindas.style.display = 'none';
        } else {
            alert("Você negou as notificações. Ative nas configurações do navegador.");
        }
    });
};
