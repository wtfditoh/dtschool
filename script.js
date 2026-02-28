// Verifica se o script carregou
console.log("DT School Script Carregado!");

let materias = JSON.parse(localStorage.getItem('materias')) || [];

// Função de Navegação
function navegar(aba) {
    console.log("Navegando para: " + aba);
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.nav-item-drawer').forEach(b => b.classList.remove('active'));
    
    document.getElementById('aba-' + aba).style.display = 'block';
    document.getElementById('btn-nav-' + aba).classList.add('active');
    
    toggleMenu(); // Fecha o menu ao clicar
}

function toggleMenu() {
    const drawer = document.getElementById('menu-lateral');
    const overlay = document.getElementById('overlay');
    if(drawer && overlay) {
        drawer.classList.toggle('open');
        overlay.classList.toggle('active');
    }
}

function atualizarLista() {
    const lista = document.getElementById('lista-materias');
    if(!lista) return;
    lista.innerHTML = '';

    materias.forEach(m => {
        const card = document.createElement('div');
        card.className = 'materia-card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <h3 style="color: #8a2be2;">${m.nome}</h3>
                <button onclick="excluirMateria(${m.id})" style="background:none; border:none; color:#ff4d4d;">Excluir</button>
            </div>
            <div class="bimestres-grid">
                ${[1,2,3,4].map(n => `
                    <div>
                        <label style="font-size:10px; color:#666; display:block; text-align:center;">B${n}</label>
                        <input type="number" class="bimestre-input" value="${m['n'+n] || 0}" 
                            onchange="editarNota(${m.id}, ${n}, this.value)">
                    </div>
                `).join('')}
            </div>
        `;
        lista.appendChild(card);
    });
    
    // Calcula média geral
    const total = materias.length;
    const mediaGeral = total > 0 ? (materias.reduce((acc, m) => acc + ((m.n1+m.n2+m.n3+m.n4)/4), 0) / total).toFixed(1) : "0.0";
    document.getElementById('media-geral-val').innerText = mediaGeral;
    document.getElementById('aprovadas-val').innerText = `${materias.filter(m => ((m.n1+m.n2+m.n3+m.n4)/4) >= 6).length}/${total}`;
}

function editarNota(id, b, val) {
    const i = materias.findIndex(m => m.id === id);
    materias[i]['n'+b] = parseFloat(val) || 0;
    localStorage.setItem('materias', JSON.stringify(materias));
    atualizarLista();
}

function adicionarMateria() {
    document.getElementById('modal-materia').style.display = 'flex';
}

function confirmarNovaMateria() {
    const nome = document.getElementById('nome-materia-input').value;
    if(nome) {
        materias.push({ id: Date.now(), nome, n1:0, n2:0, n3:0, n4:0 });
        localStorage.setItem('materias', JSON.stringify(materias));
        atualizarLista();
        document.getElementById('modal-materia').style.display = 'none';
        document.getElementById('nome-materia-input').value = '';
    }
}

function excluirMateria(id) {
    if(confirm("Deseja excluir?")) {
        materias = materias.filter(m => m.id !== id);
        localStorage.setItem('materias', JSON.stringify(materias));
        atualizarLista();
    }
}

// Inicializa
document.addEventListener('DOMContentLoaded', () => {
    atualizarLista();
    // Força a Lucide a carregar ícones se você estiver usando
    if(window.lucide) lucide.createIcons();
});
