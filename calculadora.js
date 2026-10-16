/* ═══════════ ESTADO ═══════════ */
let tipoAtual = 'anual';

const CONFIG = {
    anual: {
        etapas: [
            { titulo: '1ª Avaliação', peso: 2 },
            { titulo: '2ª Avaliação', peso: 2 },
            { titulo: '3ª Avaliação', peso: 3 },
            { titulo: '4ª Avaliação', peso: 3 }
        ],
        divisor: 10
    },
    semestral: {
        etapas: [
            { titulo: '1ª Avaliação', peso: 2 },
            { titulo: '2ª Avaliação', peso: 3 }
        ],
        divisor: 5
    }
};

/* ═══════════ RENDER ═══════════ */
function renderNotas() {
    const cfg = CONFIG[tipoAtual];
    const lista = document.getElementById('notas-lista');
    lista.innerHTML = '';

    cfg.etapas.forEach((etapa, i) => {
        const div = document.createElement('div');
        div.className = 'nota-linha';
        div.innerHTML = `
            <div class="nota-info">
                <span class="nota-titulo">${etapa.titulo}</span>
                <span class="nota-peso">Peso ${etapa.peso}</span>
            </div>
            <input
                type="number"
                class="nota-input"
                id="nota-${i}"
                placeholder="—"
                min="0" max="10" step="0.1"
                oninput="recalcular()">
        `;
        lista.appendChild(div);
    });

    if (window.lucide) lucide.createIcons();
}

function mudarTipo(tipo) {
    if (tipoAtual === tipo) return;
    tipoAtual = tipo;

    // Atualiza botões
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.toggle('on', btn.dataset.tipo === tipo);
    });

    renderNotas();
    recalcular();
}

/* ═══════════ CÁLCULO ═══════════ */
function obterNotas() {
    const cfg = CONFIG[tipoAtual];
    return cfg.etapas.map((etapa, i) => {
        const input = document.getElementById('nota-' + i);
        const valor = parseFloat(input.value);
        return {
            valor: isNaN(valor) ? null : valor,
            peso: etapa.peso,
            titulo: etapa.titulo
        };
    });
}

function calcularMedia(notas) {
    const validas = notas.filter(n => n.valor !== null);
    if (validas.length === 0) return null;

    // Média = soma(nota × peso) / soma(pesos das preenchidas)
    // mas queremos considerar o divisor cheio se todas preenchidas
    const somaNotasPesos = validas.reduce((a, n) => a + n.valor * n.peso, 0);
    const somaPesosValidos = validas.reduce((a, n) => a + n.peso, 0);

    // Se ainda não preencheu tudo, mostra a média parcial (dos preenchidos)
    // Se preencheu tudo, mostra a média final
    return somaNotasPesos / somaPesosValidos;
}

function recalcular() {
    const notas = obterNotas();
    const mediaMinima = parseFloat(document.getElementById('media-minima').value) || 6;
    const media = calcularMedia(notas);

    const valorEl = document.getElementById('valor-media');
    const statusEl = document.getElementById('status-media');
    const fillEl = document.getElementById('fill-media');
    const resultadoEl = document.getElementById('resultado');

    // Remove classes antigas
    resultadoEl.classList.remove('ok', 'aviso', 'ruim');

    if (media === null) {
        valorEl.textContent = '—';
        valorEl.style.color = '#fff';
        statusEl.textContent = 'Preencha pelo menos 1 nota';
        statusEl.style.color = 'var(--txt-dim)';
        fillEl.style.width = '0%';
        document.getElementById('simulador').style.display = 'none';
        return;
    }

    valorEl.textContent = media.toFixed(1);
    fillEl.style.width = Math.min((media / 10) * 100, 100) + '%';

    // Status
    if (media >= mediaMinima) {
        valorEl.style.color = 'var(--sucesso)';
        statusEl.textContent = '✓ Acima da média';
        statusEl.style.color = 'var(--sucesso)';
        resultadoEl.classList.add('ok');
    } else if (media >= mediaMinima - 2) {
        valorEl.style.color = 'var(--aviso)';
        statusEl.textContent = '⚠ Recuperação';
        statusEl.style.color = 'var(--aviso)';
        resultadoEl.classList.add('aviso');
    } else {
        valorEl.style.color = 'var(--erro)';
        statusEl.textContent = '✗ Abaixo da média';
        statusEl.style.color = 'var(--erro)';
        resultadoEl.classList.add('ruim');
    }

    atualizarSimulador(notas, mediaMinima);
}

/* ═══════════ SIMULADOR ═══════════ */
function atualizarSimulador(notas, mediaMinima) {
    const cfg = CONFIG[tipoAtual];
    const preenchidas = notas.filter(n => n.valor !== null);
    const faltam = notas.filter(n => n.valor === null);

    const sim = document.getElementById('simulador');
    const titulo = document.getElementById('simulador-titulo');
    const corpo = document.getElementById('simulador-corpo');

    // Se já preencheu tudo, mostra se passou ou não
    if (faltam.length === 0) {
        const soma = preenchidas.reduce((a, n) => a + n.valor * n.peso, 0);
        const media = soma / cfg.divisor;

        sim.style.display = 'block';
        titulo.textContent = 'Resultado final';

        if (media >= mediaMinima) {
            corpo.innerHTML = `Você <span class="bom">fechou com ${media.toFixed(1)}</span>. Passou direto! 🎉`;
        } else {
            const precisaRec = (mediaMinima * cfg.divisor) - soma;
            corpo.innerHTML = `Você fechou com <span class="ruim">${media.toFixed(1)}</span>. Ficou abaixo de ${mediaMinima.toFixed(1)}. Bora pra recuperação. 💪`;
        }
        return;
    }

    // Se ainda faltam notas, calcula quanto precisa
    // Soma atual com pesos
    const somaAtual = preenchidas.reduce((a, n) => a + n.valor * n.peso, 0);
    const somaNecessaria = mediaMinima * cfg.divisor;
    const falta = somaNecessaria - somaAtual;

    // Soma dos pesos das que faltam
    const pesoFaltando = faltam.reduce((a, n) => a + n.peso, 0);

    // Nota necessária em CADA uma das que faltam (assumindo que todas terão a mesma nota)
    const notaNecessaria = falta / pesoFaltando;
    const mediaProvisoria = somaAtual / preenchidas.reduce((a, n) => a + n.peso, 0);

    sim.style.display = 'block';

    if (notaNecessaria <= 0) {
        titulo.textContent = 'Tá tranquilo!';
        corpo.innerHTML = `Você já tem <span class="bom">${mediaProvisoria.toFixed(1)}</span> de média parcial. Mesmo tirando <b>0</b> nas próximas, você passa. 😎`;
        return;
    }

    if (notaNecessaria > 10) {
        titulo.textContent = 'Eita... 😬';
        corpo.innerHTML = `Precisaria de <span class="ruim">${notaNecessaria.toFixed(1)}</span> nas próximas ${faltam.length === 1 ? 'avaliação' : 'avaliações'}. Como o máximo é 10, <b>não fecha direto</b> — vai precisar de recuperação.`;
        return;
    }

    titulo.textContent = faltam.length === 1
        ? 'Quanto preciso na última?'
        : `Quanto preciso nas próximas ${faltam.length}?`;

    if (faltam.length === 1) {
        corpo.innerHTML = `Você precisa de <span class="destaque">${notaNecessaria.toFixed(1)}</span> na <b>${faltam[0].titulo}</b> pra fechar com ${mediaMinima.toFixed(1)}. Bora! 🎯`;
    } else {
        const pesoTexto = pesoFaltando === faltam[0].peso * faltam.length
            ? `em cada uma (peso ${faltam[0].peso})`
            : `na média delas`;
        corpo.innerHTML = `Você precisa de <span class="destaque">${notaNecessaria.toFixed(1)}</span> ${pesoTexto} pra fechar com ${mediaMinima.toFixed(1)}. Tá ao alcance! 💪`;
    }
}

/* ═══════════ LIMPAR ═══════════ */
function limpar() {
    document.querySelectorAll('.nota-input').forEach(input => input.value = '');
    document.getElementById('media-minima').value = 6;
    recalcular();
}

/* ═══════════ INIT ═══════════ */
renderNotas();
recalcular();
if (window.lucide) lucide.createIcons();
