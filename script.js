let materias = JSON.parse(localStorage.getItem('materias')) || [];

function toggleMenu() {
    document.getElementById('menu-lateral').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}

function atualizarLista() {
    const lista = document.getElementById('lista-materias');
    lista.innerHTML = '';

    materias.forEach(m => {
        const media = ((m.n1 + m.n2 + m.n3 + m.n4) / 4).toFixed(1);
        const card = document.createElement('div');
        card.className = 'materia-card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="color:var(--primary)">${m.nome}</h3>
                <button onclick="excluirMateria(${m.id})" class="btn-delete">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
            <p style="font-size:0.8rem; margin:5px 0;">Média: ${media}</p>
            <div class="bimestres-grid">
                ${[1,2,3,4].map(n => `
                    <div>
                        <label style="font-size:0.6rem; color:#888; display:block">B${n}</label>
                        <input type="number" class="bimestre-input" value="${m['n'+n]}" 
                            onchange="editarNota(${m.id}, ${n}, this.value)">
                    </div>
                `).join('')}
            </div>
        `;
        lista.appendChild(card);
    });
    lucide.createIcons();
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
        document.getElementById('modal-materia').style.display = 'none';
    }
}

function excluirMateria(id) {
    if(confirm("Excluir esta matéria?")) {
        materias = materias.filter(m => m.id !== id);
        localStorage.setItem('materias', JSON.stringify(materias));
        atualizarLista();
    }
}

document.addEventListener('DOMContentLoaded', atualizarLista);
