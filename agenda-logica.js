let mesExibido = new Date();
let dataSelecionada = "";
let imagemBase64 = "";

document.addEventListener('DOMContentLoaded', () => {
    carregarMateriasNoSelect();
    renderizarCalendario();
    carregarTarefas();
});

function carregarMateriasNoSelect() {
    const select = document.getElementById('tarefa-materia');
    const materiasDB = JSON.parse(localStorage.getItem('materias_db') || '[]');
    
    if (materiasDB.length === 0) {
        select.innerHTML = '<option value="Geral">Crie matérias nas Notas</option>';
        return;
    }

    select.innerHTML = materiasDB.map(m => `<option value="${m.nome}">${m.nome}</option>`).join('');
    select.insertAdjacentHTML('afterbegin', '<option value="Geral">Geral / Outros</option>');
}

function renderizarCalendario() {
    const grid = document.getElementById('calendar-grid');
    const topoMes = document.getElementById('mes-topo');
    grid.innerHTML = "";

    const nomesDias = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    nomesDias.forEach(d => grid.innerHTML += `<div class="dia-semana">${d}</div>`);

    const ano = mesExibido.getFullYear();
    const mes = mesExibido.getMonth();
    topoMes.innerText = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(mesExibido);

    const primeiroDiaMes = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const agenda = JSON.parse(localStorage.getItem('dt_agenda') || '[]');

    for (let i = 0; i < primeiroDiaMes; i++) grid.innerHTML += `<div></div>`;

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const temTarefa = agenda.some(t => t.data === dataStr);
        const hoje = new Date().toISOString().split('T')[0] === dataStr ? 'hoje' : '';
        const sel = dataSelecionada === dataStr ? 'selecionado' : '';
        
        grid.innerHTML += `
            <div class="dia-numero ${hoje} ${sel}" onclick="selecionarDia('${dataStr}')">
                ${dia}
                ${temTarefa ? '<div class="dot"></div>' : ''}
            </div>`;
    }
    lucide.createIcons();
}

function selecionarDia(data) {
    if (dataSelecionada === data) {
        dataSelecionada = "";
    } else {
        dataSelecionada = data;
    }
    renderizarCalendario();
    carregarTarefas(dataSelecionada);
}

function mudarMes(valor) {
    mesExibido.setMonth(mesExibido.getMonth() + valor);
    renderizarCalendario();
}

function abrirModalAgendaHoje() {
    const dataAlvo = dataSelecionada || new Date().toISOString().split('T')[0];
    document.getElementById('tarefa-data-input').value = dataAlvo;
    document.getElementById('modal-agenda').style.display = 'flex';
}

function fecharModalAgenda() {
    document.getElementById('modal-agenda').style.display = 'none';
}

function previewImg(input) {
    const reader = new FileReader();
    reader.onload = e => {
        imagemBase64 = e.target.result;
        document.getElementById('preview-container').innerHTML = `<img src="${imagemBase64}" style="width:100%; border-radius:15px; margin-top:15px;">`;
    };
    reader.readAsDataURL(input.files[0]);
}

function adicionarTarefa() {
    const nome = document.getElementById('tarefa-nome').value;
    const data = document.getElementById('tarefa-data-input').value;
    const materia = document.getElementById('tarefa-materia').value;

    if (!nome || !data) return alert("Preencha título e data!");

    const nova = { id: Date.now(), nome, data, materia, imagem: imagemBase64 };
    let agenda = JSON.parse(localStorage.getItem('dt_agenda') || '[]');
    agenda.push(nova);
    localStorage.setItem('dt_agenda', JSON.stringify(agenda));

    document.getElementById('tarefa-nome').value = "";
    imagemBase64 = "";
    document.getElementById('preview-container').innerHTML = "";
    fecharModalAgenda();
    renderizarCalendario();
    carregarTarefas(data);
}

function carregarTarefas(filtroData = null) {
    const lista = document.getElementById('lista-agenda');
    const titulo = document.getElementById('titulo-lista');
    let agenda = JSON.parse(localStorage.getItem('dt_agenda') || '[]');
    
    if (filtroData) {
        agenda = agenda.filter(t => t.data === filtroData);
        titulo.innerText = "Compromissos em " + filtroData.split('-').reverse().join('/');
    } else {
        titulo.innerText = "Todos os Compromissos";
    }

    if (agenda.length === 0) {
        lista.innerHTML = "<p style='color:#666; text-align:center; padding:20px;'>Nenhum compromisso.</p>";
        return;
    }

    agenda.sort((a, b) => new Date(a.data) - new Date(b.data));

    lista.innerHTML = agenda.map(t => `
        <div class="tarefa-item">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <span style="background:var(--primary); font-size:10px; padding:3px 8px; border-radius:5px; font-weight:bold;">${t.materia}</span>
                    <b style="display:block; margin-top:5px; font-size:17px;">${t.nome}</b>
                    <small style="color:#888;">${t.data.split('-').reverse().join('/')}</small>
                </div>
                <button onclick="removerTarefa(${t.id})" style="background:none; border:none; color:#ff4444; padding:10px;"><i data-lucide="trash-2"></i></button>
            </div>
            ${t.imagem ? `<img src="${t.imagem}" style="width:100%; border-radius:12px; margin-top:12px;">` : ''}
        </div>
    `).join('');
    lucide.createIcons();
}

function removerTarefa(id) {
    let agenda = JSON.parse(localStorage.getItem('dt_agenda') || '[]');
    agenda = agenda.filter(t => t.id !== id);
    localStorage.setItem('dt_agenda', JSON.stringify(agenda));
    renderizarCalendario();
    carregarTarefas(dataSelecionada);
        }
