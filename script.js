let materias = JSON.parse(localStorage.getItem('materias')) || [];

function atualizarLista() {
    const lista = document.getElementById('lista-materias');
    if (!lista) return;
    lista.innerHTML = '';

    materias.forEach(m => {
        const media = ((m.n1 + m.n2 + m.n3 + m.n4) / 4).toFixed(1);
        const card = document.createElement('div');
        card.className = 'materia-card';
        card.innerHTML = `
            <div class="materia-header">
                <div>
                    <span class="materia-title">${m.nome}</span>
                    <p style="font-size: 0.8rem; color: #888;">Média: ${media}</p>
                </div>
                <button onclick="excluirMateria(${m.id})" style="background:none; border:none; color:#ff4d4d; opacity:0.7;">
                    <i data-lucide="trash-2" size="18"></i>
                </button>
            </div>
            <div class="bimestres-grid">
                ${[1,2,3,4].map(n => `
                    <div class="bimestre-box">
                        <label>${n}º Bim</label>
                        <input type="number" class="bimestre-input" value="${m['n'+n]}" 
                            onchange="editarNota(${m.id}, ${n}, this.value)">
                    </div>
                `).join('')}
            </div>
        `;
        lista.appendChild(card);
    });
    lucide.createIcons();
    calcularGeral();
}

function editarNota(id, b, val) {
    const i = materias.findIndex(m => m.id === id);
    materias[i]['n'+b] = parseFloat(val) || 0;
    localStorage.setItem('materias', JSON.stringify(materias));
    atualizarLista();
}

function confirmarNovaMateria() {
    const nome = document.getElementById('nome-materia-input').value;
    if(nome) {
        materias.push({ id: Date.now(), nome, n1:0, n2:0, n3:0, n4:0 });
        localStorage.setItem('materias', JSON.stringify(materias));
        atualizarLista();
        fecharModal();
    }
}

function toggleMenu() {
    document.getElementById('menu-lateral').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}

function excluirMateria(id) {
    if(confirm("Deseja apagar esta matéria?")) {
        materias = materias.filter(m => m.id !== id);
        localStorage.setItem('materias', JSON.stringify(materias));
        atualizarLista();
    }
}

document.addEventListener('DOMContentLoaded', atualizarLista);
