let dataHoje = new Date();
let mesExibido = new Date();

document.addEventListener('DOMContentLoaded', () => {
    renderizarCalendario();
    carregarTarefas();
});

function renderizarCalendario() {
    const grid = document.getElementById('calendar-grid');
    const labelMes = document.getElementById('label-mes');
    grid.innerHTML = "";

    const nomesDias = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    nomesDias.forEach(d => grid.innerHTML += `<div class="dia-semana">${d}</div>`);

    const ano = mesExibido.getFullYear();
    const mes = mesExibido.getMonth();
    labelMes.innerText = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(mesExibido);

    const primeiroDiaMes = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const agenda = JSON.parse(localStorage.getItem('dt_agenda') || '[]');

    for (let i = 0; i < primeiroDiaMes; i++) grid.innerHTML += `<div></div>`;

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dataString = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const temTarefa = agenda.some(t => t.data === dataString);
        const classeHoje = new Date().toISOString().split('T')[0] === dataString ? 'hoje' : '';
        
        grid.innerHTML += `
            <div class="dia-numero ${classeHoje}" onclick="abrirParaData('${dataString}')">
                ${dia}
                ${temTarefa ? '<div class="dot"></div>' : ''}
            </div>`;
    }
}

function abrirModalAgendaHoje() {
    document.getElementById('modal-agenda').style.display = 'flex';
}

function fecharModalAgenda() {
    document.getElementById('modal-agenda').style.display = 'none';
}

function mudarMes(valor) {
    mesExibido.setMonth(mesExibido.getMonth() + valor);
    renderizarCalendario();
}

// ... manter carregarTarefas e adicionarTarefa (lendo o id 'tarefa-data-input') ...
