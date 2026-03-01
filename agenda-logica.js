let dataAtual = new Date();
let dataSelecionada = "";

document.addEventListener('DOMContentLoaded', () => {
    renderizarCalendario();
    carregarTarefas();
});

function renderizarCalendario() {
    const grid = document.getElementById('calendar-grid');
    const mesTxt = document.getElementById('mes-atual');
    grid.innerHTML = "";

    const nomesDias = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    nomesDias.forEach(d => grid.innerHTML += `<div class="dia-semana">${d}</div>`);

    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();
    mesTxt.innerText = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dataAtual);

    const primeiroDiaMes = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    for (let i = 0; i < primeiroDiaMes; i++) grid.innerHTML += `<div></div>`;

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dataString = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const hoje = new Date().toISOString().split('T')[0] === dataString ? 'hoje' : '';
        
        grid.innerHTML += `<div class="dia-numero ${hoje}" onclick="abrirModalAgenda('${dataString}')">${dia}</div>`;
    }
    lucide.createIcons();
}

function abrirModalAgenda(data) {
    dataSelecionada = data;
    document.getElementById('data-selecionada-txt').innerText = data.split('-').reverse().join('/');
    document.getElementById('modal-agenda').style.display = 'block';
}

function fecharModalAgenda() {
    document.getElementById('modal-agenda').style.display = 'none';
}

function mudarMes(dir) {
    dataAtual.setMonth(dataAtual.getMonth() + dir);
    renderizarCalendario();
}

// ... manter funções de adicionarTarefa, carregarTarefas e removerTarefa anteriores ...
// No adicionarTarefa, use dataSelecionada em vez de ler o input de data.
