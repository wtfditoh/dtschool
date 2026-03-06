import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, increment, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let mesExibido = new Date();
let dataSelecionada = "";
let imagemBase64 = "";
let agendaGlobal = [];

// ==========================================
// MOTOR DE XP DA AGENDA (LÓGICA DE PREFIXOS)
// ==========================================
function identificarXPTarefa(nome) {
    const n = nome.toLowerCase().trim();
    if (n.startsWith('(p)') || n.startsWith('(e)')) return 30; // Prova ou Exame
    if (n.startsWith('(t)')) return 20; // Trabalho / Teste
    return 10; // Atividade comum / Estudo
}

async function atualizarXPRanking(valorXP) {
    if (userType === 'local' || !userPhone) return;
    try {
        const userRef = doc(db, "notas", userPhone);
        // Usa o increment para somar ou subtrair (estorno) no ranking global
        await updateDoc(userRef, { 
            xp: increment(valorXP) 
        });
        console.log(`⭐ Ranking atualizado: ${valorXP > 0 ? '+' : ''}${valorXP} XP`);
    } catch (e) {
        console.error("Erro ao atualizar XP no ranking:", e);
    }
}

// FUNÇÃO AUXILIAR: Pega "hoje" no formato YYYY-MM-DD
const getHojeLocal = () => {
    const d = new Date();
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

document.addEventListener('DOMContentLoaded', () => {
    window.carregarMateriasNoSelect();
    window.buscarDadosNuvem();
});

window.buscarDadosNuvem = async function() {
    if (userType === 'local') {
        agendaGlobal = JSON.parse(localStorage.getItem('dt_agenda') || '[]');
    } else {
        try {
            const q = query(collection(db, "agenda"), where("usuario", "==", userPhone));
            const snap = await getDocs(q);
            agendaGlobal = [];
            snap.forEach(d => agendaGlobal.push({ id_firebase: d.id, ...d.data() }));
        } catch (e) { console.error("Erro Firebase:", e); }
    }
    window.renderizarCalendario();
    window.carregarTarefas(dataSelecionada);
};

window.carregarTarefas = (filtroData = null) => {
    const lista = document.getElementById('lista-agenda');
    const titulo = document.getElementById('titulo-lista');
    if(!lista) return;

    let tarefas = [...agendaGlobal];
    const hojeStr = getHojeLocal();
    
    if (filtroData && filtroData !== "") {
        tarefas = tarefas.filter(t => filtroData >= t.dataInicio && filtroData <= t.dataFim);
        titulo.innerText = "Atividades em " + filtroData.split('-').reverse().join('/');
    } else {
        titulo.innerText = "Todas as Atividades";
    }

    if (tarefas.length === 0) {
        lista.innerHTML = "<p style='color:#666; text-align:center; padding:30px;'>Sem atividades.</p>";
        return;
    }

    tarefas.sort((a, b) => (a.concluida === b.concluida) ? 0 : a.concluida ? 1 : -1);

    lista.innerHTML = tarefas.map(t => {
        const fim = new Date(t.dataFim + "T00:00:00");
        const hoje = new Date(hojeStr + "T00:00:00");
        const diffDays = Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24));
        
        let corStatus = "#00C851"; 
        let textoStatus = `Faltam ${diffDays} dias`;

        if (t.concluida) {
            corStatus = "#00d2ff"; textoStatus = "CONCLUÍDO! 🎉";
        } else if (diffDays < 0) {
            corStatus = "#666"; textoStatus = "PRAZO ENCERRADO";
        } else if (diffDays <= 3) {
            corStatus = "#ff4444"; textoStatus = diffDays === 0 ? "ENTREGA HOJE!" : `URGENTE: Faltam ${diffDays} dias`;
        } else if (diffDays <= 7) {
            corStatus = "#ffbb33"; textoStatus = `ATENÇÃO: Faltam ${diffDays} dias`;
        }

        return `
        <div class="tarefa-item" style="border-left: 5px solid ${corStatus}; opacity: ${t.concluida ? '0.6' : '1'}; margin-bottom:15px; background:rgba(255,255,255,0.05); padding:15px; border-radius:15px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="flex: 1;"> 
                    <span style="background:#8a2be2; font-size:10px; padding:3px 8px; border-radius:5px; font-weight:bold; color:white;">${t.materia}</span>
                    <b onclick="alternarConcluida('${t.id_firebase}', ${t.criadoEm})" style="display:block; margin-top:8px; font-size:18px; color:white; text-decoration: ${t.concluida ? 'line-through' : 'none'}; cursor:pointer;">
                        ${t.nome}
                    </b>
                    ${t.descricao ? `<p style="color:#aaa; font-size:13px; margin:8px 0;">${t.descricao}</p>` : ''}
                    <div style="font-size:11px; color:#888;">Prazo: ${t.dataFim.split('-').reverse().join('/')}</div>
                    <div style="margin-top:5px; color:${corStatus}; font-weight:bold; font-size:12px;">${textoStatus}</div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button onclick="alternarConcluida('${t.id_firebase}', ${t.criadoEm})" style="background:rgba(138,43,226,0.1); border:none; color:#8a2be2; padding:8px; border-radius:10px; cursor:pointer;">
                        <i data-lucide="${t.concluida ? 'rotate-ccw' : 'check-circle'}" style="width:18px;"></i>
                    </button>
                    <button onclick="removerTarefa('${t.id_firebase}', ${t.criadoEm})" style="background:rgba(255,68,68,0.1); border:none; color:#ff4444; padding:8px; border-radius:10px; cursor:pointer;">
                        <i data-lucide="trash-2" style="width:18px;"></i>
                    </button>
                </div>
            </div>
            ${t.imagem ? `<img src="${t.imagem}" style="width:100%; border-radius:12px; margin-top:15px; border: 1px solid rgba(255,255,255,0.1);">` : ''}
        </div>`;
    }).join('');
    lucide.createIcons();
};

window.renderizarCalendario = function() {
    const grid = document.getElementById('calendar-grid');
    const topoMes = document.getElementById('mes-topo');
    if(!grid || !topoMes) return;
    grid.innerHTML = "";
    
    const nomesDias = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    nomesDias.forEach(d => grid.innerHTML += `<div class="dia-semana">${d}</div>`);

    const ano = mesExibido.getFullYear();
    const mes = mesExibido.getMonth();
    topoMes.innerText = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(mesExibido);

    const primeiroDiaMes = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    for (let i = 0; i < primeiroDiaMes; i++) grid.innerHTML += `<div></div>`;

    const hojeLocal = getHojeLocal();

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const tarefasDoDia = agendaGlobal.filter(t => dataStr >= t.dataInicio && dataStr <= t.dataFim);
        
        let htmlDot = "";
        if (tarefasDoDia.length > 0) {
            const tarefasAtivas = tarefasDoDia.filter(t => !t.concluida);
            if (tarefasAtivas.length === 0) {
                htmlDot = '<div class="dot status-concluido"></div>';
            } else {
                const pesos = tarefasAtivas.map(t => {
                    const fim = new Date(t.dataFim + "T00:00:00");
                    const hoje = new Date(hojeLocal + "T00:00:00");
                    const diff = Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24));
                    if (diff <= 3) return { classe: 'status-urgente', peso: 3 }; 
                    if (diff <= 7) return { classe: 'status-alerta', peso: 2 };  
                    return { classe: 'status-tranquilo', peso: 1 };             
                });
                const maiorUrgencia = pesos.sort((a, b) => b.peso - a.peso)[0];
                htmlDot = `<div class="dot ${maiorUrgencia.classe}"></div>`;
            }
        }
        
        const hojeClass = hojeLocal === dataStr ? 'hoje' : '';
        const selClass = dataSelecionada === dataStr ? 'selecionado' : '';
        grid.innerHTML += `<div class="dia-numero ${hojeClass} ${selClass}" onclick="selecionarDia('${dataStr}')">${dia}${htmlDot}</div>`;
    }
    lucide.createIcons();
};

window.adicionarTarefa = async function() {
    const nome = document.getElementById('tarefa-nome').value.trim();
    const desc = document.getElementById('tarefa-desc').value.trim();
    const dataInicio = document.getElementById('tarefa-data-inicio').value;
    const dataFim = document.getElementById('tarefa-data-fim').value;
    const materia = document.getElementById('tarefa-materia').value;

    if (!nome || !dataInicio || !dataFim) return;

    const nova = { 
        nome, descricao: desc, dataInicio, dataFim, materia, 
        imagem: imagemBase64, concluida: false,
        usuario: userPhone, criadoEm: Date.now()
    };

    if (userType === 'local') {
        agendaGlobal.push(nova);
        localStorage.setItem('dt_agenda', JSON.stringify(agendaGlobal));
    } else {
        await addDoc(collection(db, "agenda"), nova);
    }
    window.fecharModalAgenda();
    window.buscarDadosNuvem();
};

window.removerTarefa = async function(idFirebase, idLocal) {
    const tarefa = agendaGlobal.find(t => userType === 'local' ? t.criadoEm === idLocal : t.id_firebase === idFirebase);
    
    // Se remover uma tarefa que estava concluída, estornamos o XP
    if (tarefa && tarefa.concluida) {
        const xpEstorno = identificarXPTarefa(tarefa.nome) * -1;
        await atualizarXPRanking(xpEstorno);
    }

    if (userType === 'local') {
        agendaGlobal = agendaGlobal.filter(t => t.criadoEm !== idLocal);
        localStorage.setItem('dt_agenda', JSON.stringify(agendaGlobal));
    } else {
        await deleteDoc(doc(db, "agenda", idFirebase));
    }
    window.buscarDadosNuvem();
};

window.alternarConcluida = async function(idFirebase, idLocal) {
    let tarefa;
    if (userType === 'local') {
        const index = agendaGlobal.findIndex(t => t.criadoEm === idLocal);
        if (index !== -1) {
            tarefa = agendaGlobal[index];
            tarefa.concluida = !tarefa.concluida;
            localStorage.setItem('dt_agenda', JSON.stringify(agendaGlobal));
        }
    } else {
        tarefa = agendaGlobal.find(t => t.id_firebase === idFirebase);
        const novoStatus = !tarefa.concluida;
        await updateDoc(doc(db, "agenda", idFirebase), { concluida: novoStatus });
        tarefa.concluida = novoStatus; // Atualiza localmente para o cálculo de XP
    }

    // DISPARO DO XP
    if (tarefa) {
        const baseXP = identificarXPTarefa(tarefa.nome);
        // Se concluiu: ganha XP. Se desmarcou: perde (estorno).
        const xpFinal = tarefa.concluida ? baseXP : (baseXP * -1);
        await atualizarXPRanking(xpFinal);
    }

    window.buscarDadosNuvem();
};

// ... Restante das funções (previewImg, carregarMateriasNoSelect, selecionarDia, mudarMes, abrirModalAgendaHoje) continuam iguais ...
window.previewImg = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            imagemBase64 = e.target.result;
            document.getElementById('preview-container').innerHTML = `<img src="${imagemBase64}" style="width:100%; border-radius:15px; margin-top:15px;">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.carregarMateriasNoSelect = function() {
    const select = document.getElementById('tarefa-materia');
    if(!select) return;
    const materiasDB = JSON.parse(localStorage.getItem('materias_db') || localStorage.getItem('materias') || '[]');
    select.innerHTML = '<option value="Geral">Geral / Outros</option>';
    materiasDB.forEach(m => {
        if(m.nome) {
            const opt = document.createElement('option');
            opt.value = m.nome; opt.textContent = m.nome;
            select.appendChild(opt);
        }
    });
};

window.selecionarDia = (d) => { dataSelecionada = (dataSelecionada === d) ? "" : d; window.renderizarCalendario(); window.carregarTarefas(dataSelecionada); };
window.mudarMes = (v) => { mesExibido.setMonth(mesExibido.getMonth() + v); window.renderizarCalendario(); };
window.abrirModalAgendaHoje = () => { 
    const hoje = getHojeLocal();
    document.getElementById('tarefa-data-inicio').value = dataSelecionada || hoje;
    document.getElementById('tarefa-data-fim').value = dataSelecionada || hoje;
    document.getElementById('modal-agenda').style.display = 'flex'; 
};

window.fecharModalAgenda = () => { 
    document.getElementById('modal-agenda').style.display = 'none'; 
    document.getElementById('tarefa-nome').value = ""; 
    document.getElementById('tarefa-desc').value = ""; 
    document.getElementById('tarefa-materia').value = "Geral";
    document.getElementById('preview-container').innerHTML = "";
    imagemBase64 = ""; 
};
          
