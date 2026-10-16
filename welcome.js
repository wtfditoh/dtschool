/* ═══════════ LOADER ═══════════ */
const FRASES = [
    'Chamando o cérebro pra trabalhar...',
    'Garantindo mais um café antes da aula...',
    'Só um instante, tá quase...',
    'Concentração em 3... 2... 1...',
    'Puxando seus dados do além...',
    'Acalma o coração, já vai abrir...',
    'Organizando a bagunça mental...',
    'Aquecendo os neurônios...'
];

const fraseEl = document.querySelector('#hb-loading p');
if (fraseEl) fraseEl.textContent = FRASES[Math.floor(Math.random() * FRASES.length)];

window.addEventListener('load', () => {
    setTimeout(() => {
        const el = document.getElementById('hb-loading');
        if (!el) return;
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 400);
    }, 800);
});

/* ═══════════ MODAL CALCULADORA ═══════════ */
window.abrirCalc = function () {
    const m = document.getElementById('calc-modal');
    if (!m) return;
    m.classList.add('on');
    if (window.lucide) lucide.createIcons();
    if (document.querySelectorAll('.calc-linha').length === 0) adicionarLinha();
};

window.fecharCalc = function () {
    const m = document.getElementById('calc-modal');
    if (m) m.classList.remove('on');
};

// Fecha ao clicar fora do sheet
document.getElementById('calc-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'calc-modal') fecharCalc();
});

/* ═══════════ LÓGICA DA CALCULADORA ═══════════ */
const lista = document.getElementById('calc-lista');

function adicionarLinha(nome = '', nota = '', peso = '') {
    if (!lista) return;
    const id = 'linha-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const div = document.createElement('div');
    div.className = 'calc-linha';
    div.id = id;
    div.innerHTML = `
        <div class="calc-campo">
            <span class="calc-label">AVALIAÇÃO</span>
            <input type="text" class="calc-nome" placeholder="Prova 1" value="${nome}">
        </div>
        <div class="calc-campo">
            <span class="calc-label">NOTA</span>
            <input type="number" class="calc-nota" placeholder="0" min="0" max="10" step="0.1" value="${nota}">
        </div>
        <div class="calc-campo">
            <span class="calc-label">PESO</span>
            <input type="number" class="calc-peso" placeholder="1" min="1" max="10" step="1" value="${peso}">
        </div>
        <button class="calc-remover" onclick="removerLinha('${id}')" title="Remover">
            <i data-lucide="trash-2"></i>
        </button>
    `;
    lista.appendChild(div);
    if (window.lucide) lucide.createIcons();
}

window.removerLinha = function (id) {
    const el = document.getElementById(id);
    if (el) el.remove();
};

window.calcularMedia = function () {
    const linhas = document.querySelectorAll('.calc-linha');
    const valorEl = document.getElementById('calc-valor');
    const statusEl = document.getElementById('calc-status');
    const resultadoEl = document.getElementById('calc-resultado');
    resultadoEl.classList.remove('ok', 'ruim');

    let somaNotas = 0, somaPesos = 0, validas = 0;
    linhas.forEach(linha => {
        const nota = parseFloat(linha.querySelector('.calc-nota').value);
        const peso = parseFloat(linha.querySelector('.calc-peso').value) || 1;
        if (!isNaN(nota)) {
            somaNotas += nota * peso;
            somaPesos += peso;
            validas++;
        }
    });

    if (validas === 0) {
        valorEl.textContent = '—';
        statusEl.textContent = 'Preencha pelo menos uma nota';
        statusEl.style.color = '';
        return;
    }

    const media = somaNotas / somaPesos;
    valorEl.textContent = media.toFixed(1);

    if (media >= 6) {
        statusEl.textContent = '✅ Aprovado';
        statusEl.style.color = '#00e5a0';
        resultadoEl.classList.add('ok');
    } else if (media >= 4) {
        statusEl.textContent = '⚠️ Recuperação';
        statusEl.style.color = '#ffbb33';
    } else {
        statusEl.textContent = '❌ Reprovado';
        statusEl.style.color = '#ff4455';
        resultadoEl.classList.add('ruim');
    }
};
