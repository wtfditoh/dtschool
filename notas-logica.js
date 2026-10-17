import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
        
        // Calcula XP ATUAL das notas
        let xpNotas = 0;
        materias.forEach(m => { xpNotas += calcularXP(m, cfg); });
        
        const docRef = doc(db, "notas", email);
        const docSnap = await getDoc(docRef);
        
        let xpNotasAntigo = 0;
        let xpTotalAtual = 0;
        if (docSnap.exists()) {
            xpNotasAntigo = docSnap.data().xpNotas || 0;
            xpTotalAtual = docSnap.data().xp || 0;
        }
        
        const diferencaXP = xpNotas - xpNotasAntigo;
        
        await setDoc(docRef, {
            materias,
            xpNotas: xpNotas,
            email,
            nome: localStorage.getItem('dt_user_name') || 'Estudante',
            avatar: localStorage.getItem('dt_user_avatar') || 'user',
            atualizadoEm: Date.now()
        }, { merge: true });
        
        if (diferencaXP !== 0) {
            await setDoc(docRef, {
                xp: increment(diferencaXP)
            }, { merge: true });
        }
    } catch (e) {
        console.error('❌ Erro ao salvar na nuvem:', e);
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

window.fecharModalExcluir = function() {
    document.getElementById('modal-excluir').style.display = 'none';
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
// COMPARTILHAR (NOVO DESIGN)
// ═══════════════════════════════════════════════════════════════════════════
window.gerarCardVitoria = async function(nomeMateria, mediaReal) {
    let container = document.getElementById('compartilhamento-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'compartilhamento-container';
        document.body.appendChild(container);
    }

    const nota = parseFloat(mediaReal);
    
    // Define o status e a cor baseado na nota
    let statusTxt, statusEmoji, corDestaque;
    if (nota >= 10) {
        statusTxt = 'NOTA MÁXIMA'; statusEmoji = '💯'; corDestaque = '#00e5a0'; // Verde
    } else if (nota >= 8) {
        statusTxt = 'NÍVEL ELITE'; statusEmoji = '⚡'; corDestaque = '#ffcc00'; // Dourado
    } else if (nota >= 6) {
        statusTxt = 'APROVADO'; statusEmoji = '🎯'; corDestaque = '#c084fc'; // Roxo Claro
    } else {
        statusTxt = 'NA LUTA'; statusEmoji = '💪'; corDestaque = '#ff4455'; // Vermelho
    }

    container.innerHTML = `
        <div style="width:1080px; height:1920px; background:#050508; position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Outfit',sans-serif;">
            
            <!-- FUNDO COM GRID -->
            <div style="position:absolute; inset:0; background-image:linear-gradient(rgba(138,43,226,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(138,43,226,0.05) 1px, transparent 1px); background-size: 60px 60px; z-index:0;"></div>
            
            <!-- GLOW ROXO GIGANTE -->
            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:800px; height:800px; background:radial-gradient(circle, rgba(138,43,226,0.4) 0%, transparent 70%); filter:blur(80px); z-index:1;"></div>

            <!-- CARD DE VIDRO CENTRAL -->
            <div style="position:relative; z-index:2; width:780px; height:1100px; background:linear-gradient(160deg, rgba(30,30,40,0.8), rgba(15,15,20,0.9)); border:2px solid rgba(138,43,226,0.4); border-top:4px solid rgba(255,255,255,0.2); border-radius:60px; box-shadow:0 40px 100px rgba(0,0,0,0.8), inset 0 0 60px rgba(138,43,226,0.1); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px; text-align:center;">
                
                <!-- Ícone do Cérebro -->
                <div style="width:180px; height:180px; background:rgba(138,43,226,0.15); border:2px solid rgba(138,43,226,0.4); border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:50px; box-shadow:0 0 50px rgba(138,43,226,0.4);">
                    <img src="icon-514_20260512_161420_0000.png" style="width:120px; height:120px; object-fit:contain;">
                </div>

                <!-- Texto de Status -->
                <div style="display:inline-flex; align-items:center; gap:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:12px 30px; border-radius:40px; margin-bottom:30px;">
                    <span style="font-size:32px;">${statusEmoji}</span>
                    <span style="color:${corDestaque}; font-size:28px; font-weight:900; letter-spacing:4px; text-transform:uppercase;">${statusTxt}</span>
                </div>

                <!-- Nome da Matéria -->
                <h1 style="color:#fff; font-size:70px; font-weight:900; margin:0 0 10px 0; line-height:1.1; letter-spacing:-2px; text-transform:uppercase; word-break:break-word;">${nomeMateria}</h1>
                
                <!-- Linha divisória -->
                <div style="width:150px; height:4px; background:linear-gradient(90deg, transparent, ${corDestaque}, transparent); border-radius:4px; margin:20px 0 40px 0;"></div>

                <!-- Nota Gigante -->
                <span style="color:#9ca3af; font-size:24px; font-weight:800; letter-spacing:6px; text-transform:uppercase;">MÉDIA FINAL</span>
                <h2 style="color:${corDestaque}; font-size:220px; font-weight:900; margin:0; line-height:1; letter-spacing:-10px; text-shadow:0 0 60px ${corDestaque}80;">${mediaReal}</h2>

            </div>

            <!-- RODAPÉ -->
            <div style="position:absolute; bottom:80px; z-index:2; display:flex; flex-direction:column; align-items:center; gap:8px;">
                <p style="color:#fff; font-size:36px; font-weight:900; letter-spacing:8px; margin:0;">HUB BRAIN</p>
                <p style="color:#666; font-size:24px; font-weight:600; margin:0;">hubbrain.netlify.app</p>
            </div>
        </div>
    `;

    // Aguarda a imagem do cérebro carregar no DOM
    await new Promise(r => setTimeout(r, 500));

    try {
        if (!window.html2canvas) throw new Error('html2canvas não carregou');

        const canvas = await html2canvas(container.firstElementChild, {
            backgroundColor: '#050508',
            width: 1080,
            height: 1920,
            scale: 1, // Mantém 1 pra não estourar a memória no celular
            useCORS: true,
            allowTaint: true
        });

        canvas.toBlob(async blob => {
            const file = new File([blob], `Vitoria_${nomeMateria}.png`, { type: 'image/png' });
            
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Hub Brain',
                        text: `Passei em ${nomeMateria} com média ${mediaReal}! 🚀\nhubbrain.netlify.app`,
                        files: [file]
                    });
                } catch (e) {
                    if (e.name !== 'AbortError') console.error(e);
                }
            } else {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `Vitoria_${nomeMateria}.png`;
                a.click();
            }
            
            container.innerHTML = ''; // Limpa a área de renderização
        });
    } catch (e) {
        console.error('Erro ao compartilhar:', e);
        showToast('Erro ao gerar imagem', 'error');
        container.innerHTML = '';
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// PONTE para scripts normais (notas-esquema.js)
// ═══════════════════════════════════════════════════════════════════════════
window.HBNotas = {
    getMaterias: () => materias,
    getCfg,
    toast: showToast,
    persistir: () => {
        localStorage.setItem('materias', JSON.stringify(materias));
        window.atualizarLista();
        return salvarNaNuvem();
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    // Sempre renderiza as notas locais primeiro
    window.atualizarLista();
    
    // Só depois tenta sincronizar com Firebase (sem sobrescrever)
    const email = localStorage.getItem('dt_user_email');
    if (email && email !== 'null') {
        try {
            const snap = await getDoc(doc(db, 'notas', email));
            if (snap.exists() && snap.data().materias) {
                const materiasFirebase = snap.data().materias;
                
                // Se não tem matérias locais, usa as do Firebase
                if (materias.length === 0 && materiasFirebase.length > 0) {
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
