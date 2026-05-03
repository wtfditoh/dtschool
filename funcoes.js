import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// ═══════════════════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════════════════
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
        <span>${msg}</span>
    `;
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════════════════
function getCfg() {
    try {
        const raw = localStorage.getItem('dt_config');
        const cfg = raw ? JSON.parse(raw) : {};
        
        const periodo = cfg.periodo || 'bimestral';
        const numPeriodos = { bimestral: 4, trimestral: 3, semestral: 2 }[periodo] || 4;
        const notaMax = parseFloat(cfg.nota_max || cfg.notaMax || 10);
        const media = parseFloat(cfg.media_aprovacao || cfg.media || 6.0);
        const somaMinima = media * numPeriodos;
        
        const labels = {
            bimestral: ['1º BIM', '2º BIM', '3º BIM', '4º BIM'],
            trimestral: ['1º TRI', '2º TRI', '3º TRI'],
            semestral: ['1º SEM', '2º SEM']
        }[periodo] || ['1º', '2º', '3º', '4º'];
        
        return { numPeriodos, notaMax, media, somaMinima, labels, periodo };
    } catch (e) {
        return { 
            numPeriodos: 4, 
            notaMax: 10, 
            media: 6.0, 
            somaMinima: 24, 
            labels: ['1º BIM', '2º BIM', '3º BIM', '4º BIM'], 
            periodo: 'bimestral' 
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
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

function calcularXP(m, cfg) {
    let xp = 0;
    const notas = getNotas(m, cfg.numPeriodos);
    
    notas.forEach(n => {
        if (n === null || isNaN(n)) return;
        const pct = n / cfg.notaMax;
        
        if (pct >= 1.0) xp += 100;
        else if (pct >= 0.8) xp += 50;
        else if (pct >= 0.6) xp += 20;
        else if (pct >= 0.4) xp -= 20;
        else if (pct > 0) xp -= 50;
        else xp -= 100;
    });
    
    return xp;
}

function getNotaClass(nota, cfg) {
    if (nota === null || isNaN(nota)) return '';
    const pct = nota / cfg.notaMax;
    if (pct >= 0.8) return 'boa';
    if (pct >= 0.6) return 'media';
    return 'baixa';
}

// ═══════════════════════════════════════════════════════════════════════════
// SALVAR NA NUVEM
// ═══════════════════════════════════════════════════════════════════════════
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
    } catch (e) {
        console.error('Erro ao salvar na nuvem:', e);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDERIZAR
// ═══════════════════════════════════════════════════════════════════════════
window.atualizarLista = function() {
    const lista = document.getElementById('lista-materias');
    if (!lista) return;
    
    const cfg = getCfg();
    materias.sort((a, b) => b.id - a.id);

    if (materias.length === 0) {
        lista.innerHTML = `
            <div class="empty-state">
                <i data-lucide="book-open"></i>
                <h3>Nenhuma disciplina</h3>
                <p>Clique no + para adicionar sua primeira matéria</p>
            </div>
        `;
        atualizarStats(cfg);
        if (window.lucide) lucide.createIcons();
        return;
    }

    lista.innerHTML = materias.map((m, idx) => {
        const notas = getNotas(m, cfg.numPeriodos);
        const soma = somaNotas(notas);
        const mediaM = (soma / cfg.numPeriodos).toFixed(1);
        const percent = Math.min((soma / cfg.somaMinima) * 100, 100);
        const aprovado = soma >= cfg.somaMinima;
        const quase = soma >= cfg.somaMinima * 0.85 && soma < cfg.somaMinima;
        const faltam = Math.max(0, cfg.somaMinima - soma).toFixed(1);

        // Cor da barra
        let barCor = '#8a2be2';
        if (aprovado) barCor = '#00e5a0';
        else if (quase) barCor = '#ffb800';

        // Status badge
        let statusHTML = '';
        if (aprovado) {
            statusHTML = '<span class="status-badge aprovado">✓ APROVADO</span>';
        } else if (quase) {
            statusHTML = '<span class="status-badge quase">⚡ QUASE LÁ</span>';
        } else {
            statusHTML = `<span class="status-badge media">Média: ${mediaM}</span>`;
        }

        return `
        <div class="materia-card" style="animation-delay: ${idx * 0.1}s">
            <div class="card-header">
                <h2 class="materia-nome">${m.nome}</h2>
                <div class="card-actions">
                    ${statusHTML}
                    <button onclick="window.abrirModalExcluir(${m.id})" class="btn-delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>

            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percent}%; background: ${barCor}; box-shadow: 0 0 10px ${barCor};"></div>
            </div>

            <div class="notas-grid">
                ${Array.from({ length: cfg.numPeriodos }, (_, i) => {
                    const n = i + 1;
                    const val = m['n' + n] !== undefined && m['n' + n] !== '' ? m['n' + n] : '';
                    const nota = parseFloat(val);
                    const notaClass = getNotaClass(nota, cfg);
                    
                    return `
                    <div class="nota-input-group">
                        <label class="nota-label">${cfg.labels[i]}</label>
                        <input 
                            type="number" 
                            step="0.1" 
                            min="0" 
                            max="${cfg.notaMax}" 
                            value="${val}"
                            class="nota-input ${notaClass}"
                            onchange="window.salvarNota(${m.id}, ${n}, this.value)"
                            placeholder="0.0"
                        >
                    </div>`;
                }).join('')}
            </div>

            <div class="card-footer">
                <div class="footer-info">
                    <span class="soma-info">SOMA: ${soma.toFixed(1)} / ${cfg.somaMinima.toFixed(1)}</span>
                    <span class="config-info">Nota máx: ${cfg.notaMax} | Média: ${cfg.media}</span>
                </div>
                <div class="footer-actions">
                    ${aprovado 
                        ? `<button onclick="window.gerarCardVitoria('${m.nome}', '${mediaM}')" class="btn-share">
                            <i data-lucide="share-2"></i>
                           </button>` 
                        : `<span class="falta-badge">Faltam ${faltam} pts</span>`
                    }
                </div>
            </div>
        </div>`;
    }).join('');

    atualizarStats(cfg);
    if (window.lucide) lucide.createIcons();
};

function atualizarStats(cfg) {
    const total = materias.length;
    let somaMedias = 0;
    let aprovados = 0;
    let xpTotal = 0;

    materias.forEach(m => {
        const notas = getNotas(m, cfg.numPeriodos);
        const soma = somaNotas(notas);
        somaMedias += soma / cfg.numPeriodos;
        if (soma >= cfg.somaMinima) aprovados++;
        xpTotal += calcularXP(m, cfg);
    });

    const mediaGeral = total > 0 ? (somaMedias / total).toFixed(1) : '0.0';

    const mgEl = document.getElementById('media-geral');
    const acEl = document.getElementById('aprov-count');
    const xpEl = document.getElementById('total-xp');

    if (mgEl) mgEl.textContent = mediaGeral;
    if (acEl) acEl.textContent = `${aprovados}/${total}`;
    if (xpEl) xpEl.textContent = xpTotal;
}

// ═══════════════════════════════════════════════════════════════════════════
// SALVAR NOTA
// ═══════════════════════════════════════════════════════════════════════════
window.salvarNota = async function(id, periodo, valor) {
    const i = materias.findIndex(m => m.id === id);
    if (i !== -1) {
        materias[i]['n' + periodo] = valor === '' ? '' : parseFloat(valor);
        localStorage.setItem('materias', JSON.stringify(materias));
        window.atualizarLista();
        await salvarNaNuvem();
        showToast('Nota salva!');
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// NOVA MATÉRIA
// ═══════════════════════════════════════════════════════════════════════════
window.confirmarNovaMateria = async function() {
    const input = document.getElementById('nome-materia-input');
    if (input && input.value.trim() !== '') {
        // Sempre cria com n1, n2, n3, n4 pra garantir compatibilidade
        const nova = { 
            id: Date.now(), 
            nome: input.value.trim(),
            n1: '', n2: '', n3: '', n4: ''
        };
        
        materias.push(nova);
        localStorage.setItem('materias', JSON.stringify(materias));
        window.atualizarLista();
        
        if (window.fecharModal) window.fecharModal();
        input.value = '';
        
        await salvarNaNuvem();
        showToast(`${nova.nome} adicionada!`);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXCLUIR
// ═══════════════════════════════════════════════════════════════════════════
window.abrirModalExcluir = function(id) {
    idParaExcluir = id;
    document.getElementById('modal-excluir').style.display = 'flex';
    if (window.lucide) lucide.createIcons();
};

window.confirmarExclusao = async function() {
    const materia = materias.find(m => m.id === idParaExcluir);
    materias = materias.filter(m => m.id !== idParaExcluir);
    localStorage.setItem('materias', JSON.stringify(materias));
    window.atualizarLista();
    
    if (window.fecharModalExcluir) window.fecharModalExcluir();
    
    await salvarNaNuvem();
    if (materia) showToast(`${materia.nome} excluída`, 'error');
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPARTILHAR
// ═══════════════════════════════════════════════════════════════════════════
window.gerarCardVitoria = async function(nomeMateria, mediaReal) {
    let container = document.getElementById('compartilhamento-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'compartilhamento-container';
        document.body.appendChild(container);
    }

    container.innerHTML = `
        <div style="width:1080px;height:1920px;background:radial-gradient(circle at center,#1a0b2e 0%,#050505 100%);display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:120px 60px;position:relative;">
            <div style="flex-grow:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;z-index:1;">
                <div style="margin-bottom:60px;filter:drop-shadow(0 0 40px rgba(138,43,226,0.8));">
                    <i data-lucide="brain-circuit" style="width:240px;height:240px;color:#8a2be2;"></i>
                </div>
                <p style="color:#fff;font-size:50px;font-weight:800;text-transform:uppercase;letter-spacing:4px;margin-bottom:20px;text-shadow:0 0 20px rgba(138,43,226,0.8);">
                    ${parseFloat(mediaReal) >= 8.0 ? 'NÍVEL ELITE' : 'OBJETIVO CONCLUÍDO'}
                </p>
                <h1 style="color:#fff;font-size:140px;font-weight:900;line-height:1;margin:0;text-transform:uppercase;text-shadow:0 0 30px rgba(138,43,226,0.5);">
                    ${nomeMateria}
                </h1>
                <p style="margin-top:40px;font-size:35px;font-weight:600;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:8px;border-bottom:1px solid rgba(138,43,226,0.4);padding-bottom:10px;">
                    ${parseFloat(mediaReal) >= 8.0 ? `NOTA EXTRAORDINÁRIA: ${mediaReal}` : `MÉDIA ${mediaReal} SUPERADA`}
                </p>
            </div>
            <div style="text-align:center;z-index:1;">
                <p style="color:#8a2be2;font-size:30px;font-weight:800;letter-spacing:5px;text-transform:uppercase;">HUB BRAIN</p>
                <p style="font-size:24px;color:#444;margin-top:15px;text-transform:lowercase;font-weight:400;letter-spacing:1px;">hubbrain.netlify.app</p>
            </div>
        </div>
    `;

    if (window.lucide) lucide.createIcons({ container });

    setTimeout(async () => {
        try {
            const canvas = await html2canvas(container, {
                backgroundColor: '#0d0d0d',
                width: 1080,
                height: 1920,
                scale: 1,
                useCORS: true
            });

            canvas.toBlob(async blob => {
                const file = new File([blob], `Vitoria_${nomeMateria}.png`, { type: 'image/png' });
                
                if (navigator.share) {
                    await navigator.share({
                        title: 'Hub Brain',
                        text: `Menos uma! Passei em ${nomeMateria}. 🚀\nhubbrain.netlify.app`,
                        files: [file]
                    });
                } else {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `Vitoria_${nomeMateria}.png`;
                    a.click();
                }
                
                container.innerHTML = '';
            });
        } catch (e) {
            console.error('Erro ao compartilhar:', e);
            showToast('Erro ao gerar imagem', 'error');
        }
    }, 400);
};

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    window.atualizarLista();
    
    const email = localStorage.getItem('dt_user_email');
    if (email && email !== 'null') {
        try {
            const snap = await getDoc(doc(db, 'notas', email));
            if (snap.exists() && snap.data().materias) {
                const materiasFirebase = snap.data().materias;
                
                // Se tem mais matérias locais do que no Firebase, usa as locais
                if (materias.length > materiasFirebase.length) {
                    console.log('Usando matérias locais (mais atualizadas)');
                    await salvarNaNuvem(); // Sincroniza pro Firebase
                } else {
                    materias = materiasFirebase;
                    localStorage.setItem('materias', JSON.stringify(materias));
                    window.atualizarLista();
                }
            }
        } catch (e) {
            console.error('Erro ao carregar do Firebase:', e);
        }
    }
    
    if (window.lucide) lucide.createIcons();
});
