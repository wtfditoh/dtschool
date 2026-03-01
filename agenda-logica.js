let mesExibido = new Date();
let imagemBase64 = "";

document.addEventListener('DOMContentLoaded', () => {
    renderizarCalendario();
    carregarTarefas();
});

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
        const dataString = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const temTarefa = agenda.some(t => t.data === dataString);
        const hoje = new Date().toISOString().split('T')[0] === dataString ? 'hoje' : '';
        
        grid.innerHTML += `
            <div class="dia-numero ${hoje}" onclick="abrirParaData('${dataString}')">
                ${dia}
                ${temTarefa ? '<div class="dot"></div>' : ''}
            </div>`;
    }
    lucide.createIcons();
}

function mudarMes(valor) {
    mesExibido.setMonth(mesExibido.getMonth() + valor);
    renderizarCalendario();
}

function abrirModalAgendaHoje() {
    const hoje = new Date().toISOString().split('T')[0];
    abrirParaData(hoje);
}

function abrirParaData(data) {
    document.getElementById('tarefa-data-input').value = data;
    document.getElementById('modal-agenda').style.display = 'flex';
}

function fecharModalAgenda() {
    document.getElementById('modal-agenda').style.display = 'none';
}

function previewImg(input) {
    const reader = new FileReader();
    reader.onload = e => {
        imagemBase64 = e.target.result;
        document.getElementById('preview-container').innerHTML = `<img src="${imagemBase64}" style="width:100%; border-radius:10px; margin-top:10px;">`;
    };
    reader.readAsDataURL(input.files[0]);
}

function adicionarTarefa() {
    const nome = document.getElementById('tarefa-nome').value;
    const data = document.getElementById('tarefa-data-input').value;
    const materia = document.getElementById('tarefa-materia').value;

    if (!nome || !data) return alert("Preencha o título e a data!");

    const novaTarefa = { id: Date.now(), nome, data, materia, imagem: imagemBase64 };
    let agenda = JSON.parse(localStorage.getItem('dt_agenda') || '[]');
    agenda.push(novaTarefa);
    localStorage.setItem('dt_agenda', JSON.stringify(agenda));

    // Reset
    document.getElementById('tarefa-nome').value = "";
    imagemBase64 = "";
    document.getElementById('preview-container').innerHTML = "";
    fecharModalAgenda();
    renderizarCalendario();
    carregarTarefas();
}

function carregarTarefas() {
    const lista = document.getElementById('lista-agenda');
    const agenda = JSON.parse(localStorage.getItem('dt_agenda') || '[]');
    
    if (agenda.length === 0) {
        lista.innerHTML = "<p style='color:#666; text-align:center;'>Nenhum compromisso.</p>";
        return;
    }

    agenda.sort((a, b) => new Date(a.data) - new Date(b.data));

    lista.innerHTML = agenda.map(t => `
        <div class="tarefa-item">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <span class="badge-materia">${t.materia}</span>
                    <b style="display:block; font-size:16px;">${t.nome}</b>
                    <small style="color:#888;">${t.data.split('-').reverse().join('/')}</small>
                </div>
                <button onclick="removerTarefa(${t.id})" style="background:none; border:none; color:#ff4444;"><i data-lucide="trash-2"></i></button>
            </div>
            ${t.imagem ? `<img src="${t.imagem}" style="width:100%; border-radius:10px; margin-top:10px;">` : ''}
        </div>
    `).join('');
    lucide.createIcons();
}

function removerTarefa(id) {
    let agenda = JSON.parse(localStorage.getItem('dt_agenda') || '[]');
    agenda = agenda.filter(t => t.id !== id);
    localStorage.setItem('dt_agenda', JSON.stringify(agenda));
    renderizarCalendario();
    carregarTarefas();
                        }
