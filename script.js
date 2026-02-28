// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    renderizarMaterias();
    renderizarTarefas();
});

let materias = JSON.parse(localStorage.getItem('dt_materias')) || [];
let tarefas = JSON.parse(localStorage.getItem('dt_tarefas')) || [];

// --- GESTÃO DE MATÉRIAS ---
function adicionarMateria() {
    const nome = prompt("Nome da Disciplina:");
    if (!nome) return;

    materias.push({
        id: Date.now(),
        nome: nome,
        notas: [0, 0, 0, 0]
    });
    salvar();
    renderizarMaterias();
}

function atualizarNota(id, index, valor) {
    const mat = materias.find(m => m.id === id);
    mat.notas[index] = parseFloat(valor) || 0;
    salvar();
    atualizarStats();
}

function renderizarMaterias() {
    const container = document.getElementById('lista-materias');
    container.innerHTML = '';

    materias.forEach(m => {
        const total = m.notas.reduce((a, b) => a + b, 0);
        const isAprovado = total >= 24;
        
        container.innerHTML += `
            <div class="card-materia">
                <div class="materia-info">
                    <h3>${m.nome}</h3>
                    <span class="status-badge ${isAprovado ? 'aprovado' : 'pendente'}">
                        ${isAprovado ? 'APROVADO' : (24 - total).toFixed(1) + ' PTS FALTAM'}
                    </span>
                </div>
                <div class="notas-grid">
                    ${m.notas.map((n, i) => `
                        <input type="number" value="${n}" step="0.5" 
                        onchange="atualizarNota(${m.id}, ${i}, this.value)">
                    `).join('')}
                </div>
            </div>
        `;
    });
    atualizarStats();
}

function atualizarStats() {
    const totalNotas = materias.reduce((acc, m) => acc + m.notas.reduce((a, b) => a + b, 0), 0);
    const media = materias.length ? (totalNotas / (materias.length * 4)).toFixed(1) : "0.0";
    const aprovadas = materias.filter(m => m.notas.reduce((a, b) => a + b, 0) >= 24).length;

    document.getElementById('media-geral').innerText = media;
    document.getElementById('materias-aprovadas').innerText = aprovadas;
}

// --- NAVEGAÇÃO ---
function mudarAba(aba) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(`aba-${aba}`).classList.add('active');
    document.getElementById(`nav-${aba}`).classList.add('active');
}

// --- PERSISTÊNCIA ---
function salvar() {
    localStorage.setItem('dt_materias', JSON.stringify(materias));
    localStorage.setItem('dt_tarefas', JSON.stringify(tarefas));
}

// (Funções de Agenda/Modal omitidas por brevidade, mas seguem a mesma lógica de salvar/renderizar)
