// Configuração do Firebase (Certifique-se que o firebase-config.js já foi carregado no HTML)
import { db } from './firebase-config.js'; // Ajuste o caminho se necessário
import { doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let diaAtualGrade = 'segunda';
let gradeHoraria = { segunda: [], terca: [], quarta: [], quinta: [], sexta: [] };
const usuarioTelefone = localStorage.getItem('usuario_logado'); // Pega o telefone do login

document.addEventListener('DOMContentLoaded', async () => {
    await carregarDadosGrade();
    
    const d = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'][new Date().getDay()];
    selecionarDia(d === 'domingo' || d === 'sabado' ? 'segunda' : d);
    
    setInterval(verificarRelogioParaNotificar, 60000);
});

// FUNÇÃO PRINCIPAL: CARREGAR DADOS (FIREBASE OU LOCAL)
async function carregarDadosGrade() {
    // 1. Tenta carregar do LocalStorage primeiro (para velocidade)
    const local = localStorage.getItem('hub_brain_grade');
    if (local) gradeHoraria = JSON.parse(local);

    // 2. Se tiver usuário logado, busca a versão mais recente na nuvem
    if (usuarioTelefone) {
        try {
            const docRef = doc(db, "grades_horarias", usuarioTelefone);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                gradeHoraria = docSnap.data().grade;
                localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
                renderizarAulas();
            }
        } catch (e) {
            console.error("Erro ao sincronizar com Firebase:", e);
        }
    }
}

// SALVAR DADOS (NUVEM + LOCAL)
async function salvarNoBanco() {
    // Salva no LocalStorage (sempre)
    localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));

    // Salva no Firebase (se logado)
    if (usuarioTelefone) {
        try {
            await setDoc(doc(db, "grades_horarias", usuarioTelefone), {
                grade: gradeHoraria,
                ultimaAtualizacao: new Date()
            });
        } catch (e) {
            console.error("Erro ao salvar na nuvem:", e);
        }
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
    const aulas = gradeHoraria[diaAtualGrade] || [];
    aulas.sort((a, b) => a.hora.localeCompare(b.hora));

    lista.innerHTML = aulas.length === 0 ? 
        '<p style="text-align:center;color:#444;margin-top:50px;">Nenhuma aula para este dia.</p>' :
        aulas.map((a, i) => `
            <div class="card-aula">
                <div class="aula-tempo">${a.hora}</div>
                <div class="aula-info"><b>${a.materia}</b><span>${a.prof || ''}</span></div>
                <button onclick="excluirAula(${i})" style="margin-left:auto;background:none;border:none;color:#ff4444;"><i data-lucide="trash-2"></i></button>
            </div>
        `).join('');
    lucide.createIcons();
};

window.salvarAula = async () => {
    const m = document.getElementById('aula-materia').value;
    const h = document.getElementById('aula-hora').value;
    const p = document.getElementById('aula-prof').value;
    
    if(!m || !h) return alert("Preencha matéria e hora!");

    if(!gradeHoraria[diaAtualGrade]) gradeHoraria[diaAtualGrade] = [];
    
    gradeHoraria[diaAtualGrade].push({ materia: m, hora: h, prof: p });
    
    renderizarAulas();
    fecharModalAula();
    await salvarNoBanco();
};

window.excluirAula = async (i) => {
    if(confirm("Remover esta aula?")) {
        gradeHoraria[diaAtualGrade].splice(i, 1);
        renderizarAulas();
        await salvarNoBanco();
    }
};

window.abrirModalAula = () => document.getElementById('modal-aula').style.display = 'flex';
window.fecharModalAula = () => document.getElementById('modal-aula').style.display = 'none';

// NOTIFICAÇÕES (IGUAL ANTERIOR)
window.ativarNotificacoes = () => {
    Notification.requestPermission().then(p => { if(p==='granted') alert("Alertas Ativados!"); });
};

function verificarRelogioParaNotificar() {
    const hoje = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'][new Date().getDay()];
    const aulas = gradeHoraria[hoje] || [];
    const agora = new Date();
    const minAgora = (agora.getHours() * 60) + agora.getMinutes();

    aulas.forEach(aula => {
        const [h, m] = aula.hora.split(':').map(Number);
        const minAula = (h * 60) + m;

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
