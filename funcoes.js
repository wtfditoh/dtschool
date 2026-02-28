let materias = JSON.parse(localStorage.getItem('materias')) || [];
let idParaExcluir = null;

function toggleMenu() {
    document.getElementById('menu-lateral').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}

function mostrarAviso(titulo, texto, icone) {
    document.getElementById('aviso-titulo').innerText = titulo;
    document.getElementById('aviso-texto').innerText = texto;
    document.getElementById('aviso-icon').innerHTML = `<i data-lucide="${icone}" style="width:50px; height:50px; color:#8a2be2;"></i>`;
    document.getElementById('modal-aviso-container').style.display = 'flex';
    lucide.createIcons();
}

function fecharAviso() { document.getElementById('modal-aviso-container').style.display = 'none'; }

function navegar(p, elemento) {
    if(p === 'notas') {
        toggleMenu();
        return;
    }
    // Para Agenda e Ranking
    const icon = p === 'agenda' ? 'calendar' : 'trophy';
    const msg = p === 'agenda' ? 'A tua agenda escolar estará disponível em breve!' : 'O ranking global chega na próxima atualização.';
    mostrarAviso(p.charAt(0).toUpperCase() + p.slice(1), msg, icon);
    toggleMenu();
}

function abrirModalExcluir(id) {
    idParaExcluir = id;
    document.getElementById('modal-excluir-container').style.display = 'flex';
    lucide.createIcons();
}

function fecharModalExcluir() { document.getElementById('modal-excluir-container').style.display = 'none'; }

function confirmarExclusao() {
    materias = materias.filter(m => m.id !== idParaExcluir);
    localStorage.setItem('materias', JSON.stringify(materias));
    atualizarLista();
    fecharModalExcluir();
}

function atualizarLista() {
    const lista = document.getElementById('lista-materias');
    if(!lista) return;

    lista.innerHTML = materias.map(m => {
        const soma = (Number(m.n1)||0) + (Number(m.n2)||0) + (Number(m.n3)||0) + (Number(m.n4)||0);
        const media = (soma / 4).toFixed(1);
        const falta = Math.max(0, (24 - soma)).toFixed(1);
        const percent = Math.min((soma / 24) * 100, 100);

        return `
        <div class="materia-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h3 style="margin-bottom:5px;">${m.nome}</h3>
                    <span class="status-badge ${soma >= 24 ? 'aprovado' : ''}">
                        ${soma >= 24 ? '✓ APROVADO' : 'EM CURSO'}
                    </span>
                </div>
                <button onclick="abrirModalExcluir(${m.id})" style="background:none; border:none; color:#ff4444;">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
            
            <div class="progress-bg">
                <div class="progress-fill" style="width:${percent}%; background:${soma >= 24 ? '#00ff7f' : '#8a2be2'}; box-shadow:${soma >= 24 ? '0 0 10px #00ff7f' : 'none'};"></div>
            </div>

            <div style="display:flex; justify-content:space-between; font-size:11px; color:#666; margin-bottom:10px;">
                <span>Média: ${media}</span>
                <span style="color: ${falta > 0 ? '#666' : '#00ff7f'}">${falta > 0 ? 'Faltam ' + falta + ' pts' : 'Meta batida!'}</span>
            </div>

            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px;">
                ${[1,2,3,4].map(n => `
                    <input type="number" value="${m['n'+n] || ''}" placeholder="${n}º"
                        style="width:100%; background:#000; border:1px solid #333; color:white; padding:10px; border-radius:10px; text-align:center;"
                        onchange="salvarNota(${m.id}, ${n}, this.value)">
                `).join('')}
            </div>
        </div>`;
    }).join('');
    
    const total = materias.length;
    const mediaGeral = total > 0 ? (materias.reduce((acc, m) => acc + (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4))/4, 0) / total).toFixed(1) : "0.0";
    document.getElementById('media-geral').innerText = mediaGeral;
    document.getElementById('aprov-count').innerText = `${materias.filter(m => (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4)) >= 24).length}/${total}`;
    lucide.createIcons();
}

function salvarNota(id, b, val) {
    const i = materias.findIndex(m => m.id === id);
    materias[i]['n'+b] = parseFloat(val) || 0;
    localStorage.setItem('materias', JSON.stringify(materias));
    atualizarLista();
}

function abrirModal() { document.getElementById('modal-materia').style.display = 'flex'; }
function fecharModal() { document.getElementById('modal-materia').style.display = 'none'; }

function confirmarNovaMateria() {
    const input = document.getElementById('nome-materia-input');
    if(input.value) {
        materias.push({ id: Date.now(), nome: input.value, n1:0, n2:0, n3:0, n4:0 });
        localStorage.setItem('materias', JSON.stringify(materias));
        input.value = ''; fecharModal(); atualizarLista();
    }
}

document.addEventListener('DOMContentLoaded', atualizarLista);
