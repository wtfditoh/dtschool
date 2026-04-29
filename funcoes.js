import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { verificarConquistas, mostrarPopupConquista } from "./conquistas.js";

const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let materias = JSON.parse(localStorage.getItem('materias')) || [];
let idParaExcluir = null;
let versaoLocal = null;

// ─── LÊ CONFIGS ───────────────────────────
function getCfg() {
    try {
        const raw = localStorage.getItem('dt_config');
        const cfg = raw ? JSON.parse(raw) : {};
        const periodo = cfg.periodo || 'bimestral';
        const numPeriodos = { bimestral: 4, trimestral: 3, semestral: 2 }[periodo] || 4;
        const notaMax = parseFloat(cfg.nota_max || cfg.notaMax || 10);
        const media = parseFloat(cfg.media_aprovacao || cfg.media || 6.0);
        // Soma mínima = média × numPeriodos
        const somaMinima = media * numPeriodos;
        // Labels dos períodos
        const labels = {
            bimestral:  ['1º BIM', '2º BIM', '3º BIM', '4º BIM'],
            trimestral: ['1º TRI', '2º TRI', '3º TRI'],
            semestral:  ['1º SEM', '2º SEM'],
        }[periodo] || ['1º', '2º', '3º', '4º'];
        return { numPeriodos, notaMax, media, somaMinima, labels, periodo };
    } catch(e) {
        return { numPeriodos: 4, notaMax: 10, media: 6.0, somaMinima: 24, labels: ['1º BIM','2º BIM','3º BIM','4º BIM'], periodo: 'bimestral' };
    }
}

// ─── HELPER: notas da matéria ─────────────
function getNotas(m, numPeriodos) {
    const notas = [];
    for (let i = 1; i <= numPeriodos; i++) {
        const v = m['n' + i];
        notas.push(v === '' || v === undefined || v === null ? null : parseFloat(v));
    }
    return notas;
}

function somaNotas(notas) {
    return notas.reduce((acc, v) => acc + (v !== null && !isNaN(v) ? v : 0), 0);
}

// ─── MONITOR VERSÃO ───────────────────────
function monitorarVersaoSistema() {
    onSnapshot(doc(db, "config", "versao_sistema"), (s) => {
        if (s.exists()) {
            const v = s.data().v;
            if (versaoLocal === null) versaoLocal = v;
            else if (v !== versaoLocal) setTimeout(() => window.location.reload(true), 1000);
        }
    });
}

// ─── XP ───────────────────────────────────
function calcularXP(m, cfg) {
    let xp = 0;
    const notas = getNotas(m, cfg.numPeriodos);
    notas.forEach(n => {
        if (n === null || isNaN(n)) return;
        const pct = n / cfg.notaMax;
        if (pct >= 1.0)       xp += 100;
        else if (pct >= 0.8)  xp += 50;
        else if (pct >= 0.6)  xp += 20;
        else if (pct >= 0.4)  xp -= 20;
        else if (pct > 0)     xp -= 50;
        else                  xp -= 100;
    });
    return xp;
}

// ─── SALVAR NA NUVEM ──────────────────────
async function salvarNaNuvem() {
    const email = localStorage.getItem('dt_user_email');
    const userType = localStorage.getItem('dt_user_type');
    if (userType === 'local' || !email || email === 'null') return;

    try {
        const cfg = getCfg();
        let xpTotal = 0;
        materias.forEach(m => { xpTotal += calcularXP(m, cfg); });

        await setDoc(doc(db, "notas", email), {
            materias,
            xp: xpTotal,
            email,
            nome: localStorage.getItem('dt_user_name') || 'Estudante',
            avatar: localStorage.getItem('dt_user_avatar') || 'user',
            atualizadoEm: Date.now()
        }, { merge: true });

        await verificarConquistasNotas(email);
    } catch(e) { console.error('Erro Firebase:', e); }
}

async function verificarConquistasNotas(email) {
    try {
        const snap = await getDoc(doc(db, "notas", email));
        if (!snap.exists()) return;
        const novas = await verificarConquistas(email, { ...snap.data(), materias });
        if (novas.length > 0) mostrarPopupConquista(novas);
    } catch(e) {}
}

// ─── RENDERIZAR LISTA ─────────────────────
window.atualizarLista = function() {
    const lista = document.getElementById('lista-materias');
    if (!lista) return;
    const cfg = getCfg();
    materias.sort((a, b) => b.id - a.id);

    if (materias.length === 0) {
        lista.innerHTML = `<div style="text-align:center;color:#555;padding:40px;font-weight:bold;">Nenhuma matéria criada. Clique no + para começar!</div>`;
        atualizarStats(cfg);
        return;
    }

    lista.innerHTML = materias.map(m => {
        const notas = getNotas(m, cfg.numPeriodos);
        const soma = somaNotas(notas);
        const mediaM = (soma / cfg.numPeriodos).toFixed(1);
        const percent = Math.min((soma / cfg.somaMinima) * 100, 100);
        const aprovado = soma >= cfg.somaMinima;
        const faltam = Math.max(0, cfg.somaMinima - soma).toFixed(1);

        // Cor da barra
        const barCor = aprovado ? '#2ecc71' : soma >= cfg.somaMinima * 0.7 ? '#ffcc00' : '#8a2be2';

        return `
        <div class="materia-card">
            <div class="card-top">
                <h3 style="font-size:17px;font-weight:800;color:white;">${m.nome}</h3>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:11px;font-weight:800;color:${aprovado?'#2ecc71':'#555'};">
                        ${aprovado ? '✓ APROVADO' : `Média: ${mediaM}`}
                    </span>
                    <button onclick="window.abrirModalExcluir(${m.id})" style="background:none;border:none;color:#ff4444;opacity:0.5;cursor:pointer;padding:4px;">
                        <i data-lucide="trash-2" style="width:16px;"></i>
                    </button>
                </div>
            </div>

            <!-- BARRA PROGRESSO -->
            <div style="height:5px;background:rgba(255,255,255,0.05);border-radius:10px;margin:10px 0;overflow:hidden;">
                <div style="width:${percent}%;height:100%;background:${barCor};box-shadow:0 0 8px ${barCor};border-radius:10px;transition:width 0.5s ease;"></div>
            </div>

            <!-- INPUTS DINÂMICOS por período -->
            <div style="display:grid;grid-template-columns:repeat(${cfg.numPeriodos},1fr);gap:8px;">
                ${Array.from({length: cfg.numPeriodos}, (_, i) => {
                    const n = i + 1;
                    const val = m['n' + n] !== undefined && m['n' + n] !== '' ? m['n' + n] : '';
                    const nota = parseFloat(val);
                    const notaCor = isNaN(nota) ? 'rgba(138,43,226,0.2)' : nota >= cfg.media * (nota / (cfg.somaMinima / cfg.numPeriodos) >= 1 ? 1 : 1) ? nota >= cfg.notaMax * 0.8 ? 'rgba(46,204,113,0.3)' : nota >= cfg.notaMax * 0.6 ? 'rgba(138,43,226,0.2)' : 'rgba(255,204,0,0.2)' : 'rgba(255,68,68,0.2)';
                    return `
                    <div style="display:flex;flex-direction:column;gap:4px;">
                        <span style="font-size:8px;font-weight:800;letter-spacing:1px;color:#444;text-align:center;">${cfg.labels[i]}</span>
                        <input type="number" step="0.1" min="0" max="${cfg.notaMax}" value="${val}"
                            style="width:100%;background:rgba(0,0,0,0.5);border:1px solid ${notaCor};color:white;padding:12px 4px;border-radius:12px;text-align:center;font-size:14px;font-weight:800;outline:none;-webkit-appearance:none;"
                            onchange="window.salvarNota(${m.id},${n},this.value)"
                            onfocus="this.style.borderColor='#8a2be2'"
                            onblur="this.style.borderColor='${notaCor}'">
                    </div>`;
                }).join('')}
            </div>

            <!-- RODAPÉ -->
            <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;flex-direction:column;gap:2px;">
                    <span style="font-size:11px;color:#555;font-weight:700;">
                        SOMA: ${soma.toFixed(1)} / ${cfg.somaMinima.toFixed(1)}
                    </span>
                    <span style="font-size:10px;color:#333;">
                        Nota máx/período: ${cfg.notaMax} | Média: ${cfg.media}
                    </span>
                </div>
                ${aprovado
                    ? `<div style="display:flex;align-items:center;gap:8px;">
                        <span style="background:rgba(46,204,113,0.1);color:#2ecc71;padding:4px 10px;border-radius:8px;font-size:10px;font-weight:900;border:1px solid rgba(46,204,113,0.2);">✓ APROVADO</span>
                        <button onclick="window.gerarCardVitoria('${m.nome}','${mediaM}')" style="background:none;border:none;color:#8a2be2;cursor:pointer;padding:4px;">
                            <i data-lucide="share-2" style="width:16px;"></i>
                        </button>
                       </div>`
                    : `<span style="color:#ffcc00;font-size:11px;font-weight:800;">
                        Faltam ${faltam} pts
                       </span>`
                }
            </div>
        </div>`;
    }).join('');

    atualizarStats(cfg);
    if (window.lucide) lucide.createIcons();
};

function atualizarStats(cfg) {
    const total = materias.length;
    let somaMedias = 0, aprovados = 0;
    materias.forEach(m => {
        const notas = getNotas(m, cfg.numPeriodos);
        const soma = somaNotas(notas);
        somaMedias += soma / cfg.numPeriodos;
        if (soma >= cfg.somaMinima) aprovados++;
    });
    const mediaGeral = total > 0 ? (somaMedias / total).toFixed(1) : '0.0';
    const mgEl = document.getElementById('media-geral');
    const acEl = document.getElementById('aprov-count');
    if (mgEl) mgEl.innerText = mediaGeral;
    if (acEl) acEl.innerText = `${aprovados}/${total}`;
}

// ─── SALVAR NOTA ──────────────────────────
window.salvarNota = async function(id, periodo, valor) {
    const i = materias.findIndex(m => m.id === id);
    if (i !== -1) {
        materias[i]['n' + periodo] = valor === '' ? '' : parseFloat(valor);
        localStorage.setItem('materias', JSON.stringify(materias));
        window.atualizarLista();
        await salvarNaNuvem();
    }
};

// ─── NOVA MATÉRIA ─────────────────────────
window.confirmarNovaMateria = async function() {
    const input = document.getElementById('nome-materia-input');
    if (input && input.value.trim() !== '') {
        const nova = { id: Date.now(), nome: input.value.trim(), n1:'', n2:'', n3:'', n4:'' };
        materias.push(nova);
        localStorage.setItem('materias', JSON.stringify(materias));
        window.atualizarLista();
        if (window.fecharModal) window.fecharModal();
        input.value = '';
        await salvarNaNuvem();
    }
};

// ─── EXCLUIR MATÉRIA ──────────────────────
window.abrirModalExcluir = function(id) {
    idParaExcluir = id;
    document.getElementById('modal-excluir-container').style.display = 'flex';
};
window.confirmarExclusao = async function() {
    materias = materias.filter(m => m.id !== idParaExcluir);
    localStorage.setItem('materias', JSON.stringify(materias));
    window.atualizarLista();
    window.fecharModalExcluir();
    await salvarNaNuvem();
};

// ─── COMPARTILHAR ─────────────────────────
window.gerarCardVitoria = async function(nomeMateria, mediaReal) {
    let container = document.getElementById('compartilhamento-container');
    if (!container) { container = document.createElement('div'); container.id = 'compartilhamento-container'; document.body.appendChild(container); }

    container.innerHTML = `
        <div class="card-vitoria-story">
            <div class="vitoria-content">
                <div class="logo-neon-vitoria"><i data-lucide="brain-circuit" style="width:240px;height:240px;color:#8a2be2;"></i></div>
                <p class="status-conquista">${parseFloat(mediaReal) >= 8.0 ? 'Nível Elite' : 'Objetivo Concluído'}</p>
                <h1 class="materia-nome-vitoria">${nomeMateria}</h1>
                <p class="badge-comemorativa">${parseFloat(mediaReal) >= 8.0 ? `NOTA EXTRAORDINÁRIA: ${mediaReal}` : `MÉDIA ${mediaReal} SUPERADA`}</p>
            </div>
            <div class="vitoria-footer"><p>HUB BRAIN</p><p class="link-app-vitoria">https://hubbrain.netlify.app/</p></div>
        </div>`;

    if (window.lucide) lucide.createIcons({ container });

    setTimeout(async () => {
        try {
            const canvas = await html2canvas(container, { backgroundColor: '#0d0d0d', width: 1080, height: 1920, scale: 1, useCORS: true });
            canvas.toBlob(async blob => {
                const file = new File([blob], `Vitoria_${nomeMateria}.png`, { type: 'image/png' });
                if (navigator.share) {
                    await navigator.share({ title: 'Hub Brain', text: `Menos uma! Passei em ${nomeMateria}. 🚀\nhttps://hubbrain.netlify.app/`, files: [file] });
                } else {
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Vitoria_${nomeMateria}.png`; a.click();
                }
                container.innerHTML = '';
            });
        } catch(e) { console.error('Erro ao compartilhar', e); }
    }, 400);
};

// ─── INIT ─────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    monitorarVersaoSistema();
    window.atualizarLista();
    const email = localStorage.getItem('dt_user_email');
    if (email && email !== 'null') {
        try {
            const snap = await getDoc(doc(db, 'notas', email));
            if (snap.exists() && snap.data().materias) {
                materias = snap.data().materias;
                localStorage.setItem('materias', JSON.stringify(materias));
                window.atualizarLista();
            }
        } catch(e) {}
    }
});
          
