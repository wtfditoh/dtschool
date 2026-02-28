let materias = JSON.parse(localStorage.getItem('materias')) || [];

function atualizarLista() {
    const lista = document.getElementById('lista-materias');
    lista.innerHTML = '';

    materias.forEach(m => {
        const card = document.createElement('div');
        card.className = 'materia-card';
        
        // Cálculo da média da matéria
        const mediaMateria = ((m.n1 + m.n2 + m.n3 + m.n4) / 4).toFixed(1);

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h3 style="color: var(--primary);">${m.nome}</h3>
                    <small>Média: ${mediaMateria}</small>
                </div>
                <button onclick="abrirExcluir(${m.id})" class="btn-trash">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
            <div class="bimestres-grid">
                ${[1,2,3,4].map(num => `
                    <div class="bimestre-item">
                        <label>${num}º B</label>
                        <input type="number" step="0.5" value="${m['n'+num]}" 
                            onchange="atualizarNota(${m.id}, ${num}, this.value)">
                    </div>
                `).join('')}
            </div>
        `;
        lista.appendChild(card);
    });
    lucide.createIcons();
    calcularGeral();
}

function atualizarNota(id, bimestre, valor) {
    const idx = materias.findIndex(m => m.id === id);
    materias[idx]['n' + bimestre] = parseFloat(valor) || 0;
    localStorage.setItem('materias', JSON.stringify(materias));
    atualizarLista();
}

function confirmarNovaMateria() {
    const nome = document.getElementById('nome-materia-input').value;
    if(nome) {
        materias.push({ id: Date.now(), nome: nome, n1: 0, n2: 0, n3: 0, n4: 0 });
        localStorage.setItem('materias', JSON.stringify(materias));
        atualizarLista();
        fecharModal();
        document.getElementById('nome-materia-input').value = '';
    }
}

function abrirExcluir(id) {
    const modal = document.getElementById('modal-excluir');
    modal.style.display = 'flex';
    document.getElementById('btn-confirmar-exclusao').onclick = () => {
        materias = materias.filter(m => m.id !== id);
        localStorage.setItem('materias', JSON.stringify(materias));
        atualizarLista();
        modal.style.display = 'none';
    };
}

// Funções de Menu e Modal permanecem as mesmas...
function toggleMenu() {
    document.getElementById('menu-lateral').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}
