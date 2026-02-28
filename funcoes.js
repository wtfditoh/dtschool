let materias = JSON.parse(localStorage.getItem('materias')) || [];
let idParaExcluir = null;

function toggleMenu() {
    document.getElementById('menu-lateral').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}

function navegar(p) {
    toggleMenu();
    if(p === 'notas') return;
    const msg = p === 'agenda' ? 'Em breve poderás marcar teus testes aqui!' : 'Em breve verás quem é o melhor da DT School!';
    document.getElementById('aviso-titulo').innerText = p.charAt(0).toUpperCase() + p.slice(1);
    document.getElementById('aviso-texto').innerText = msg;
    document.getElementById('aviso-icon').innerHTML = `<i data-lucide="${p === 'agenda' ? 'calendar' : 'trophy'}" style="width:45px; height:45px; color:#8a2be2;"></i>`;
    document.getElementById('modal-aviso-container').style.display = 'flex';
    lucide.createIcons();
}

function fecharAviso() { document.getElementById('modal-aviso-container').style.display = 'none'; }

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
        const percent = Math.min((soma / 24) * 100, 100);
        const aprovado = soma >= 24;

        return `
        <div class="materia-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="font-size:16px; font-weight:800;">${m.nome}</h3>
                ${aprovado ? '<span class="aprovado-badge">APROVADO</span>' : `<span style="font-size:10px; color:#444;">FALTAM ${(24-soma).toFixed(1)}</span>`}
            </div>
            <div class="progress-bg"><div class="progress-fill" style="width:${percent}%;"></div></div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <span style="font-size:11px; color:#555; font-weight:bold;">MÉDIA: ${media}</span>
                <button onclick="abrirModalExcluir(${m.id})" style="background:none; border:none; color:#ff4444; opacity:0.4;"><i data-lucide="trash-2" style="width:16px;"></i></button>
            </div>
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px;">
                ${[1,2,3,4].map(n => `
                    <input type="number" value="${m['n'+n] || ''}" placeholder="${n}º"
                        style="width:100%; background:rgba(0,0,0,0.3); border:1px solid #222; color:white; padding:10px; border-radius:10px; text-align:center; font-size:13px; font-weight:bold;"
                        onchange="salvarNota(${m.id}, ${n}, this.value)">
                `).join('')}
            </div>
        </div>`;
    }).join('');
    
    const total = materias.length;
    const somaMedias = materias.reduce((acc, m) => acc + (Number(m.n1)+Number(m.n2)+Number(m.n3)+Number(m.n4))/4, 0);
    document.getElementById('media-geral').innerText = total > 0 ? (somaMedias / total).toFixed(1) : "0.0";
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
