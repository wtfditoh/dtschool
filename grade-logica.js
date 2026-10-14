/* grade-logica.js — Hub Brain · Grade Horária + Escanear com IA */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ═══════════════ FIREBASE ═══════════════ */
const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a",
    measurementId: "G-F7TG23TBTL"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ═══════════════ HORÁRIOS ═══════════════ */
const TABELA_HORARIOS = {
    matutino: [
        { ordem: "1ª Aula", inicio: "07:00" },
        { ordem: "2ª Aula", inicio: "07:50" },
        { ordem: "3ª Aula", inicio: "08:40" },
        { ordem: "4ª Aula", inicio: "09:50" },
        { ordem: "5ª Aula", inicio: "10:40" },
        { ordem: "6ª Aula", inicio: "11:30" }
    ],
    vespertino: [
        { ordem: "1ª Aula", inicio: "13:00" },
        { ordem: "2ª Aula", inicio: "13:50" },
        { ordem: "3ª Aula", inicio: "14:40" },
        { ordem: "4ª Aula", inicio: "15:50" },
        { ordem: "5ª Aula", inicio: "16:40" },
        { ordem: "6ª Aula", inicio: "17:30" }
    ]
};

const DIAS_UTEIS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
const DIAS_FULL = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const NOMES_DIA = { domingo: 'Domingo', segunda: 'Segunda', terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta', sexta: 'Sexta', sabado: 'Sábado' };
const ABREV_DIA = { domingo: 'DOM', segunda: 'SEG', terca: 'TER', quarta: 'QUA', quinta: 'QUI', sexta: 'SEX', sabado: 'SÁB' };
const STORAGE_KEY = 'hub_brain_grade';
const DURACAO_AULA_MIN = 50;

const PALETA = ['#8a2be2', '#00d2ff', '#00e5a0', '#ff8c32', '#ff4455', '#c084fc', '#ffbb33', '#3b82f6', '#ec4899', '#10b981'];

/* ═══════════════ ESTADO ═══════════════ */
let diaAtualGrade = 'segunda';
let gradeHoraria = { domingo: [], segunda: [], terca: [], quarta: [], quinta: [], sexta: [], sabado: [] };
let indexParaExcluir = null;
let intervaloAgora = null;

let arquivoScanAtual = null;
let resultadoScanIA = null;

const userPhone = localStorage.getItem('dt_user_phone');
const userEmail = localStorage.getItem('dt_user_email');
const userId = userPhone || userEmail || "convidado";

/* ═══════════════ HELPERS ═══════════════ */
function corMateria(nome) {
    if (!nome || nome === 'Geral') return PALETA[0];
    let h = 0;
    for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) | 0;
    return PALETA[Math.abs(h) % PALETA.length];
}

function minutosDoHorario(hhmm) {
    if (!hhmm) return 0;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

function agoraEmMinutos() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
}

function formatarHora(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function hojeStr() { return DIAS_FULL[new Date().getDay()]; }

/* ═══════════════ TOAST ═══════════════ */
window.mostrarAvisoCustom = (msg) => {
    const toast = document.getElementById('custom-toast');
    if (!toast) return;
    const msgEl = document.getElementById('toast-message');
    if (msgEl) msgEl.innerText = msg;
    toast.classList.add('show');
    clearTimeout(window.mostrarAvisoCustom._t);
    window.mostrarAvisoCustom._t = setTimeout(() => toast.classList.remove('show'), 3000);
};

/* ═══════════════ MODAIS ═══════════════ */
window.fecharModalAula = () => { document.getElementById('modal-aula').style.display = 'none'; };
window.fecharModalExcluir = () => { document.getElementById('modal-confirm-excluir').style.display = 'none'; };
window.fecharAjudaBateria = () => { document.getElementById('modal-ajuda-bateria').style.display = 'none'; };
window.fecharModalScan = () => { document.getElementById('modal-scan').style.display = 'none'; };
window.fecharConfirmScan = () => { document.getElementById('modal-confirm-scan').style.display = 'none'; };

/* ═══════════════ ONESIGNAL ═══════════════ */
async function salvarPlayerIdNoFirebase() {
    if (userId === "convidado") return;
    if (!window.OneSignalDeferred) return;
    try {
        window.OneSignalDeferred.push(async function (OneSignal) {
            await new Promise(r => setTimeout(r, 2000));
            let playerId = null;
            try { playerId = OneSignal.User.PushSubscription.id; } catch (e) {}
            if (!playerId) try { playerId = OneSignal.User.PushSubscription.token; } catch (e) {}
            if (!playerId) try { playerId = await OneSignal.User.getOnesignalId(); } catch (e) {}
            if (!playerId) return;
            await setDoc(doc(db, "grades_horarias", userId), { onesignal_player_id: playerId }, { merge: true });
            console.log('[grade] Player ID salvo');
        });
    } catch (e) { console.error(e); }
}

function verificarStatusNotificacoes() {
    if (!window.OneSignalDeferred) return;
    window.OneSignalDeferred.push(function (OneSignal) {
        try {
            const permissao = OneSignal.Notifications.permission;
            const btn = document.getElementById('btn-sino');
            if (btn && permissao) btn.classList.add('ativo');
        } catch (e) {}
    });
}

/* ═══════════════ INIT ═══════════════ */
document.addEventListener('DOMContentLoaded', async () => {
    console.log("[grade] Iniciado");
    try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) gradeHoraria = { ...gradeHoraria, ...JSON.parse(local) };
    } catch (e) {}

    const hoje = hojeStr();
    if (DIAS_UTEIS.includes(hoje)) diaAtualGrade = hoje;
    else diaAtualGrade = 'segunda';

    const selectDia = document.getElementById('aula-dia');
    if (selectDia) selectDia.value = diaAtualGrade;

    renderizarSemana();
    window.selecionarDia(diaAtualGrade);
    atualizarAgora();

    if (userId !== "convidado") await carregarDadosNuvem();
    salvarPlayerIdNoFirebase();
    verificarStatusNotificacoes();

    intervaloAgora = setInterval(atualizarAgora, 30000);
    initScan();

    if (window.lucide) lucide.createIcons();
});

/* ═══════════════ CARREGAR NUVEM ═══════════════ */
async function carregarDadosNuvem() {
    try {
        const docSnap = await getDoc(doc(db, "grades_horarias", userId));
        if (docSnap.exists()) {
            const dados = docSnap.data();
            if (dados.grade) {
                gradeHoraria = { ...gradeHoraria, ...dados.grade };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(gradeHoraria));
                renderizarSemana();
                window.renderizarAulas();
                atualizarAgora();
            }
        }
    } catch (e) { console.error("[grade] Nuvem:", e); }
}

/* ═══════════════ SELECIONAR DIA ═══════════════ */
window.selecionarDia = (dia) => {
    diaAtualGrade = dia;
    document.querySelectorAll('.dia-col').forEach(col => {
        col.classList.toggle('selecionado', col.dataset.dia === dia);
    });
    const titulo = document.getElementById('dia-titulo-txt');
    if (titulo) titulo.innerText = (NOMES_DIA[dia] || '').toUpperCase();
    window.renderizarAulas();
};

/* ═══════════════ RENDERIZAR SEMANA ═══════════════ */
function renderizarSemana() {
    const grid = document.getElementById('semana-grid');
    if (!grid) return;

    const hoje = hojeStr();
    let html = '';

    DIAS_UTEIS.forEach(dia => {
        const aulas = (gradeHoraria[dia] || []).slice().sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
        const isHoje = dia === hoje;
        const isSel = dia === diaAtualGrade;

        let slots = '';
        for (let i = 0; i < 6; i++) {
            const aula = aulas[i];
            const cor = aula ? corMateria(aula.materia) : null;
            slots += `<div class="slot">${cor ? `<div class="slot-cheio" style="background:${cor}"></div>` : ''}</div>`;
        }

        html += `
            <div class="dia-col ${isHoje ? 'hoje' : ''} ${isSel ? 'selecionado' : ''}" data-dia="${dia}" onclick="window.selecionarDia('${dia}')">
                <div class="dia-col-head">${ABREV_DIA[dia]}</div>
                <div class="dia-col-body">${slots}</div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

/* ═══════════════ RENDERIZAR LISTA DO DIA ═══════════════ */
window.renderizarAulas = () => {
    const lista = document.getElementById('lista-aulas');
    if (!lista) return;

    const aulas = (gradeHoraria[diaAtualGrade] || []).slice();
    aulas.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

    const info = aulaAtualDoDia(diaAtualGrade);

    if (aulas.length === 0) {
        const nomeDia = NOMES_DIA[diaAtualGrade] || '';
        lista.innerHTML = `<p>Nenhuma aula na ${nomeDia.toLowerCase()}.</p>`;
        return;
    }

    lista.innerHTML = aulas.map((a, i) => {
        const isAgora = info && info.index === i;
        const isPassada = info && i < info.index;

        return `
            <div class="card-aula ${isAgora ? 'agora' : ''} ${isPassada ? 'passada' : ''}" style="animation-delay: ${i * 0.05}s">
                <div class="aula-tempo">
                    <span>${a.ordem}</span>
                    ${a.hora}
                </div>
                <div class="aula-info">
                    <b>${escapeHtml(a.materia)}</b>
                    <span>
                        <i data-lucide="user"></i>
                        ${escapeHtml(a.prof || 'Sem prof.')}
                    </span>
                </div>
                ${isAgora ? '<span class="aula-badge agora">AGORA</span>' : ''}
                <button class="btn-deletar-aula" onclick="event.stopPropagation(); abrirConfirmExcluir(${i})" aria-label="Excluir">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
};

/* ═══════════════ AULA ATUAL DO DIA ═══════════════ */
function aulaAtualDoDia(dia) {
    if (dia !== hojeStr()) return null;
    const aulas = (gradeHoraria[dia] || []).slice().sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    if (!aulas.length) return null;

    const agora = agoraEmMinutos();

    for (let i = 0; i < aulas.length; i++) {
        const inicio = minutosDoHorario(aulas[i].hora);
        const proxima = aulas[i + 1] ? minutosDoHorario(aulas[i + 1].hora) : inicio + DURACAO_AULA_MIN;
        const fim = proxima;
        if (agora >= inicio && agora < fim) return { index: i, inicio, fim, agora };
    }
    return null;
}

/* ═══════════════ BANNER "AGORA" ═══════════════ */
function atualizarAgora() {
    const card = document.getElementById('agora-card');
    if (!card) return;

    const hoje = hojeStr();
    const aulasHoje = (gradeHoraria[hoje] || []).slice().sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    const agora = agoraEmMinutos();

    const info = aulaAtualDoDia(hoje);
    if (info) {
        const aula = aulasHoje[info.index];
        const cor = corMateria(aula.materia);
        const total = info.fim - info.inicio;
        const decorrido = info.agora - info.inicio;
        const pct = Math.max(0, Math.min(100, Math.round((decorrido / total) * 100)));
        const faltam = info.fim - agora;

        card.innerHTML = `
            <div class="agora-rotulo pulso">
                <i data-lucide="radio" style="width:11px;height:11px;"></i>
                AGORA · ${aula.ordem}
            </div>
            <div class="agora-materia" style="color:${cor};">${escapeHtml(aula.materia)}</div>
            <div class="agora-info">
                <span>${aula.hora} — ${formatarHora(info.fim)}</span>
                ${aula.prof ? ` · <b>${escapeHtml(aula.prof)}</b>` : ''}
            </div>
            <div class="agora-tempo">
                <i data-lucide="hourglass"></i>
                <span>Faltam <b>${faltam}min</b> pra acabar</span>
            </div>
            <div class="agora-progresso">
                <div class="agora-progresso-fill" style="width:${pct}%"></div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    const proxima = aulasHoje.find(a => minutosDoHorario(a.hora) > agora);
    if (proxima) {
        const faltaMin = minutosDoHorario(proxima.hora) - agora;
        const cor = corMateria(proxima.materia);
        card.innerHTML = `
            <div class="agora-rotulo proximo">
                <i data-lucide="clock" style="width:11px;height:11px;"></i>
                PRÓXIMA · ${proxima.ordem}
            </div>
            <div class="agora-materia" style="color:${cor};">${escapeHtml(proxima.materia)}</div>
            <div class="agora-info">
                <span>Começa às ${proxima.hora}</span>
                ${proxima.prof ? ` · <b>${escapeHtml(proxima.prof)}</b>` : ''}
            </div>
            <div class="agora-tempo">
                <i data-lucide="alarm-clock"></i>
                <span>Faltam <b>${faltaMin}min</b> pra começar</span>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    if (aulasHoje.length === 0) {
        card.innerHTML = `
            <div class="agora-rotulo livre">
                <i data-lucide="coffee" style="width:11px;height:11px;"></i>
                DIA LIVRE
            </div>
            <div class="agora-materia" style="color:#888;">Nenhuma aula hoje</div>
            <div class="agora-info">Aproveita pra estudar ou descansar 😌</div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    card.innerHTML = `
        <div class="agora-rotulo livre">
            <i data-lucide="check-circle" style="width:11px;height:11px;"></i>
            AULAS ACABARAM
        </div>
        <div class="agora-materia" style="color:#00e5a0;">Fim por hoje ✨</div>
        <div class="agora-info">${aulasHoje.length} aula${aulasHoje.length === 1 ? '' : 's'} concluída${aulasHoje.length === 1 ? '' : 's'}</div>
    `;
    if (window.lucide) lucide.createIcons();
}

/* ═══════════════ MODAL MANUAL ═══════════════ */
window.abrirModalAula = async () => {
    const inputProf = document.getElementById('aula-prof');
    const inputCustom = document.getElementById('aula-materia-custom');
    if (inputProf) inputProf.value = '';
    if (inputCustom) inputCustom.value = '';

    const selectDia = document.getElementById('aula-dia');
    if (selectDia) selectDia.value = DIAS_UTEIS.includes(diaAtualGrade) ? diaAtualGrade : 'segunda';

    const selectMat = document.getElementById('aula-materia-select');
    selectMat.innerHTML = '<option value="">Carregando matérias...</option>';

    document.getElementById('modal-aula').style.display = 'flex';

    try {
        const docSnap = await getDoc(doc(db, "notas", userId));
        if (docSnap.exists()) {
            const listaMaterias = docSnap.data().materias || [];
            if (listaMaterias.length > 0) {
                selectMat.innerHTML = '<option value="">Selecionar...</option>';
                listaMaterias.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.nome;
                    opt.textContent = m.nome;
                    selectMat.appendChild(opt);
                });
            } else {
                selectMat.innerHTML = '<option value="">Nenhuma matéria nas Notas</option>';
            }
        } else {
            selectMat.innerHTML = '<option value="">Abra a aba Notas primeiro</option>';
        }
    } catch (e) {
        selectMat.innerHTML = '<option value="">Erro ao carregar</option>';
    }
};

/* ═══════════════ SALVAR AULA ═══════════════ */
window.salvarAula = async () => {
    const dia = document.getElementById('aula-dia').value || diaAtualGrade;
    const turno = document.getElementById('aula-turno').value;
    const nAula = document.getElementById('aula-numero').value;
    const matSelect = document.getElementById('aula-materia-select').value;
    const matCustom = document.getElementById('aula-materia-custom').value.trim();
    const prof = document.getElementById('aula-prof').value.trim();

    const materiaFinal = matSelect || matCustom;

    if (!materiaFinal) {
        const btn = document.getElementById('btn-salvar-aula');
        if (btn) {
            btn.classList.add('erro');
            btn.innerText = '⚠️ Falta a matéria!';
            setTimeout(() => { btn.classList.remove('erro'); btn.innerText = 'Agendar'; }, 2000);
        }
        window.mostrarAvisoCustom("Escolha ou digite a matéria!");
        return;
    }

    const infoHorario = TABELA_HORARIOS[turno][nAula];
    if (!infoHorario) return;

    if (!gradeHoraria[dia]) gradeHoraria[dia] = [];

    gradeHoraria[dia].push({
        ordem: infoHorario.ordem,
        materia: materiaFinal,
        hora: infoHorario.inicio,
        prof: prof
    });

    gradeHoraria[dia].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

    window.fecharModalAula();
    renderizarSemana();
    if (dia === diaAtualGrade) window.renderizarAulas();
    atualizarAgora();

    try {
        await setDoc(doc(db, "grades_horarias", userId), {
            grade: gradeHoraria,
            atualizadoEm: Date.now()
        }, { merge: true });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gradeHoraria));
        window.mostrarAvisoCustom(`Aula agendada na ${NOMES_DIA[dia]}!`);
    } catch (e) {
        console.error(e);
        window.mostrarAvisoCustom("Erro ao salvar na nuvem.");
    }
};

/* ═══════════════ EXCLUIR ═══════════════ */
window.abrirConfirmExcluir = (i) => {
    indexParaExcluir = i;
    document.getElementById('modal-confirm-excluir').style.display = 'flex';
};

/* ═══════════════════════════════════════════════════ */
/* SCAN COM IA VISION                                   */
/* ═══════════════════════════════════════════════════ */
const MODELO_VISAO = 'qwen/qwen3.8-27b';

function initScan() {
    const btnEscanear = document.getElementById('btn-escanear');
    const inputFoto = document.getElementById('input-grade-foto');
    const btnCamera = document.getElementById('btn-scan-camera');
    const btnGaleria = document.getElementById('btn-scan-galeria');
    const btnProcessar = document.getElementById('btn-scan-processar');
    const btnAplicar = document.getElementById('btn-scan-aplicar');

    if (btnEscanear) btnEscanear.addEventListener('click', window.abrirModalScan);

    if (inputFoto) {
        inputFoto.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
                arquivoScanAtual = file;
                mostrarPreviewScan(file);
            }
            e.target.value = '';
        });
    }

    if (btnCamera) btnCamera.addEventListener('click', () => {
        const input = document.getElementById('input-grade-foto');
        input.setAttribute('capture', 'environment');
        input.click();
    });

    if (btnGaleria) btnGaleria.addEventListener('click', () => {
        const input = document.getElementById('input-grade-foto');
        input.removeAttribute('capture');
        input.click();
    });

    if (btnProcessar) btnProcessar.addEventListener('click', processarScan);
    if (btnAplicar) btnAplicar.addEventListener('click', aplicarResultadoScan);
}

window.abrirModalScan = () => {
    document.getElementById('modal-scan').style.display = 'flex';
    arquivoScanAtual = null;
    resultadoScanIA = null;
    const preview = document.getElementById('scan-preview');
    if (preview) {
        preview.innerHTML = `<i data-lucide="image" style="width:36px;height:36px;color:#555;"></i><span>Nenhuma foto ainda</span>`;
    }
    atualizarStatusScan('');
    const btnProc = document.getElementById('btn-scan-processar');
    if (btnProc) { btnProc.disabled = true; btnProc.innerText = 'Ler com IA'; }
    if (window.lucide) lucide.createIcons();
};

function mostrarPreviewScan(file) {
    const preview = document.getElementById('scan-preview');
    if (!preview) return;
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${url}" alt="">`;
    atualizarStatusScan('Foto pronta. Toque em "Ler com IA".', 'ok');
    const btnProc = document.getElementById('btn-scan-processar');
    if (btnProc) btnProc.disabled = false;
}

function atualizarStatusScan(msg, tipo) {
    const el = document.getElementById('scan-status');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'scan-status' + (tipo ? ' ' + tipo : '');
}

/* Comprime pra max 1100px (leve o bastante pra caber no proxy) */
function comprimirImagemParaIA(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            try {
                const MAX = 1100;
                let w = img.naturalWidth, h = img.naturalHeight;
                if (w >= h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                const ctx = c.getContext('2d');
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                c.toBlob(b => {
                    URL.revokeObjectURL(url);
                    if (!b) return reject(new Error('compress'));
                    resolve(b);
                }, 'image/jpeg', 0.8);
            } catch (e) { URL.revokeObjectURL(url); reject(e); }
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img')); };
        img.src = url;
    });
}

function blobParaBase64(blob) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
            const s = r.result;
            resolve(s.slice(s.indexOf(',') + 1));
        };
        r.onerror = () => reject(new Error('read'));
        r.readAsDataURL(blob);
    });
}

function montarPromptScan() {
    return [
        'Você é um assistente que lê a grade horária escolar de uma foto de tabela.',
        'Extraia TODAS as aulas da tabela, organizadas por dia da semana.',
        '',
        'Dias possíveis: segunda, terca, quarta, quinta, sexta (sem acentos nas chaves).',
        'Numere as aulas na ordem que aparecem (1ª, 2ª, 3ª, 4ª, 5ª, 6ª).',
        'Se a célula da matéria tiver texto como "Componente Curricular 5", mantém exatamente assim.',
        'Se tiver o nome do professor na linha de baixo, separa no campo "prof".',
        '',
        'Responda SOMENTE com JSON válido, sem markdown, sem explicação, neste formato exato:',
        '{',
        '  "segunda": [',
        '    { "ordem": "1ª Aula", "materia": "Física", "prof": "Jean Ricardo" },',
        '    { "ordem": "2ª Aula", "materia": "Língua Portuguesa", "prof": "Ester Cavalcanti" }',
        '  ],',
        '  "terca": [...],',
        '  "quarta": [...],',
        '  "quinta": [...],',
        '  "sexta": [...]',
        '}',
        '',
        'Se um dia não tiver aulas na foto, devolva o array vazio: "quinta": [].',
        'Se não conseguir ler algum professor, deixa "" no campo prof.'
    ].join('\n');
}

async function chamarIAVisao(base64Imagem) {
    const chavePropria = (localStorage.getItem('hb_groq_key') || '').trim();

    const payload = {
        model: MODELO_VISAO,
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: montarPromptScan() },
                    { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + base64Imagem } }
                ]
            }
        ],
        temperature: 0.1,
        max_completion_tokens: 2000
    };

    let url, headers;
    if (chavePropria) {
        url = 'https://api.groq.com/openai/v1/chat/completions';
        headers = { 'Authorization': 'Bearer ' + chavePropria, 'Content-Type': 'application/json' };
    } else {
        const token = await obterTokenFirebase();
        if (!token) throw new Error('Sem chave da IA. Cola sua chave da Groq no Estudos.');
        url = '/.netlify/functions/groq';
        headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
    }

    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await r.json();
    if (!r.ok) {
        const msg = (data && data.error && data.error.message) || ('Erro ' + r.status);
        throw new Error(msg);
    }
    const texto = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!texto) throw new Error('Resposta vazia da IA');
    return texto;
}

async function obterTokenFirebase() {
    try {
        const { getAuth, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        const auth = getAuth(app);
        let user = auth.currentUser;
        if (!user) {
            user = await new Promise(res => {
                const off = onAuthStateChanged(auth, u => { off(); res(u); });
            });
        }
        return user ? await user.getIdToken() : null;
    } catch (e) { return null; }
}

function parseJSONRobusto(texto) {
    let t = String(texto).replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1].trim();
    else t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a !== -1 && b > a) t = t.slice(a, b + 1);

    try { return JSON.parse(t); } catch (e) {}
    try { return JSON.parse(t.replace(/,\s*([\]}])/g, '$1')); } catch (e) {}
    throw new Error('JSON inválido');
}

function normalizarRespostaIA(dado) {
    const out = { segunda: [], terca: [], quarta: [], quinta: [], sexta: [] };
    if (!dado || typeof dado !== 'object') return out;

    Object.keys(out).forEach(dia => {
        const arr = dado[dia];
        if (!Array.isArray(arr)) return;
        out[dia] = arr
            .filter(a => a && (a.materia || a.nome))
            .map((a, i) => {
                let ordem = a.ordem || '';
                if (!ordem) ordem = (i + 1) + 'ª Aula';
                const idx = TABELA_HORARIOS.vespertino.findIndex(t => t.ordem === ordem);
                const hora = idx !== -1 ? TABELA_HORARIOS.vespertino[idx].inicio
                           : TABELA_HORARIOS.vespertino[i]?.inicio || '13:00';
                return {
                    ordem: ordem,
                    materia: String(a.materia || a.nome || '').trim(),
                    prof: String(a.prof || a.professor || '').trim(),
                    hora: hora
                };
            });
    });
    return out;
}

async function processarScan() {
    if (!arquivoScanAtual) return;
    const btn = document.getElementById('btn-scan-processar');
    btn.disabled = true;
    btn.innerText = 'Lendo...';
    atualizarStatusScan('🔍 Comprimindo imagem...', 'trabalhando');

    try {
        const blob = await comprimirImagemParaIA(arquivoScanAtual);
        atualizarStatusScan('🤖 IA lendo a tabela... (uns 10s)', 'trabalhando');
        const base64 = await blobParaBase64(blob);
        const resposta = await chamarIAVisao(base64);
        atualizarStatusScan('✅ Pronto! Confere aí', 'ok');

        let parsed;
        try { parsed = parseJSONRobusto(resposta); }
        catch (e) { throw new Error('A IA devolveu um formato inesperado. Tenta de novo.'); }

        resultadoScanIA = normalizarRespostaIA(parsed);

        window.fecharModalScan();
        mostrarConfirmScan(resultadoScanIA);

    } catch (e) {
        console.error('[scan]', e);
        atualizarStatusScan('❌ ' + (e.message || 'Erro ao ler'), 'erro');
        btn.disabled = false;
        btn.innerText = 'Tentar de novo';
    }
}

function mostrarConfirmScan(grade) {
    const box = document.getElementById('scan-resultado');
    if (!box) return;

    let html = '';
    let totalAulas = 0;
    DIAS_UTEIS.forEach(dia => {
        const aulas = grade[dia] || [];
        totalAulas += aulas.length;
        html += `
            <div class="scan-dia">
                <div class="scan-dia-titulo">
                    <i data-lucide="calendar" style="width:12px;"></i>
                    ${NOMES_DIA[dia]}
                    <span class="scan-dia-count">${aulas.length}</span>
                </div>
                ${aulas.length === 0
                    ? '<div style="font-size:11px;color:#555;font-weight:600;text-align:center;padding:6px 0;">Vazio</div>'
                    : aulas.map(a => `
                        <div class="scan-aula">
                            <div class="scan-aula-num">${a.ordem.replace(' Aula','')}</div>
                            <div class="scan-aula-info">
                                <b>${escapeHtml(a.materia)}</b>
                                ${a.prof ? `<i>${escapeHtml(a.prof)}</i>` : ''}
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        `;
    });

    if (totalAulas === 0) {
        html = '<div style="text-align:center;color:#888;padding:30px 10px;font-size:13px;">A IA não conseguiu ler nada. Tenta com uma foto mais nítida.</div>';
    }

    box.innerHTML = html;
    document.getElementById('modal-confirm-scan').style.display = 'flex';
    if (window.lucide) lucide.createIcons();
}

async function aplicarResultadoScan() {
    if (!resultadoScanIA) return;
    const btn = document.getElementById('btn-scan-aplicar');
    btn.disabled = true;
    btn.innerText = 'Salvando...';

    try {
        Object.keys(resultadoScanIA).forEach(dia => {
            if (resultadoScanIA[dia] && resultadoScanIA[dia].length > 0) {
                gradeHoraria[dia] = resultadoScanIA[dia];
            }
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(gradeHoraria));
        renderizarSemana();
        window.renderizarAulas();
        atualizarAgora();

        await setDoc(doc(db, "grades_horarias", userId), {
            grade: gradeHoraria,
            atualizadoEm: Date.now()
        }, { merge: true });

        window.fecharConfirmScan();
        window.mostrarAvisoCustom("✅ Grade importada com sucesso!");
    } catch (e) {
        console.error(e);
        window.mostrarAvisoCustom("Erro ao salvar a grade");
    } finally {
        btn.disabled = false;
        btn.innerText = 'Aplicar';
    }
}

/* ═══════════════ CONFIRMAR DELETE ═══════════════ */
document.addEventListener('DOMContentLoaded', () => {
    const btnDelete = document.getElementById('btn-confirmar-delete');
    if (btnDelete) {
        btnDelete.onclick = async () => {
            if (indexParaExcluir == null) return;
            gradeHoraria[diaAtualGrade].splice(indexParaExcluir, 1);
            indexParaExcluir = null;
            renderizarSemana();
            window.renderizarAulas();
            atualizarAgora();
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(gradeHoraria));
                await setDoc(doc(db, "grades_horarias", userId), { grade: gradeHoraria }, { merge: true });
                window.mostrarAvisoCustom("Aula removida.");
            } catch (e) { console.error(e); }
            window.fecharModalExcluir();
        };
    }
});

/* ═══════════════ NOTIFICAÇÕES ═══════════════ */
window.ativarNotificacoesReal = () => {
    if (!window.OneSignalDeferred) {
        window.mostrarAvisoCustom("Notificações indisponíveis neste navegador");
        return;
    }
    window.OneSignalDeferred.push(async function (OneSignal) {
        try {
            await OneSignal.Notifications.requestPermission();
            const ok = OneSignal.Notifications.permission;
            const btn = document.getElementById('btn-sino');
            if (ok && btn) btn.classList.add('ativo');
            window.mostrarAvisoCustom(ok ? "Notificações ativadas!" : "Permissão negada");
            salvarPlayerIdNoFirebase();
        } catch (e) {
            window.mostrarAvisoCustom("Não foi possível ativar");
        }
    });
};

/* ═══════════════ FECHAR MODAIS ═══════════════ */
document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal-grade')) {
        e.target.style.display = 'none';
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-grade').forEach(m => {
        if (m.style.display === 'flex') m.style.display = 'none';
    });
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') atualizarAgora();
});
