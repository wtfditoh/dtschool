let materias = JSON.parse(localStorage.getItem('materias')) || [];

function toggleMenu() {
    document.getElementById('menu-lateral').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}

function navegar(p) {
    if(p === 'agenda') alert("Agenda em breve!");
    toggleMenu();
}

function abrirModal() { document.getElementById('modal-materia').style.display = 'flex'; }
function fecharModal() { document.getElementById('modal-materia').style.display = 'none'; }

function atualizarLista() {
    const lista = document.getElementById('lista-materias');
    if(!lista) return;

    lista.innerHTML = materias.map(m => {
        const soma = (m.n1||0) + (m.n2||0) + (m.n3||0) + (m.n4||0);
        const media = (soma / 4).toFixed(1);
        const falta = Math.max(0, (24 - soma)).toFixed(1);
        const percent = Math.min((media / 10) * 100, 100);

        return `
        <div class="materia-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="color:white;">${m.nome}</h3>
                <button onclick="excluirMateria(${m.id})" class="btn-icon" style="color:#ff4444;">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
            
            <div class="progress-bg"><div class="progress-fill" style="width:${percent}%"></div></div>
            
            <div style="display:flex; justify-content:space-between; font-size:11px; color:#666; margin-bottom:12px;">
                <span>Média: ${media}</span>
                <span>${falta > 0 ? 'Faltam ' + falta + ' pts' : 'Aprovado!'}</span>
            </div>

            <div class="bimestres-grid">
                ${[1,2,3,4].map(n => `
                    <input type="number" class="bimestre-input" value="${m['n'+n] || ''}" placeholder="${n}º"
                        onchange="salvarNota(${m.id}, ${n}, this.value)">
                `).join('')}
            </div>
        </div>
        `;
    }).join('');
    
    const total = materias.length;
    const mediaGeral = total > 0 ? (materias.reduce((acc, m) => acc + (m.n1+m.n2+m.n3+m.n4)/4, 0) / total).toFixed(1) : "0.0";
    document.getElementById('media-geral').innerText = mediaGeral;
    document.getElementById('aprov-count').innerText = `${materias.filter(m => (m.n1+m.n2+m.n3+m.n4)/4 >= 6).length}/${total}`;
    
    lucide.createIcons(); // Ativa a lixeirinha
}

function salvarNota(id, b, val) {
    const i = materias.findIndex(m => m.id === id);
    materias[i]['n'+b] = parseFloat(val) || 0;
    localStorage.setItem('materias', JSON.stringify(materias));
    atualizarLista();
}

function confirmarNovaMateria() {
    const input = document.getElementById('nome-materia-input');
    if(input.value) {
        materias.push({ id: Date.now(), nome: input.value, n1:0, n2:0, n3:0, n4:0 });
        localStorage.setItem('materias', JSON.stringify(materias));
        input.value = '';
        fecharModal();
        atualizarLista();
    }
}

function excluirMateria(id) {
    if(confirm("Deseja apagar?")) {
        materias = materias.filter(m => m.id !== id);
        localStorage.setItem('materias', JSON.stringify(materias));
        atualizarLista();
    }
}

document.addEventListener('DOMContentLoaded', atualizarLista);
