// ============================================
// HUB BRAIN — CONFIGURAÇÕES
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const auth = getAuth(app);

const CONFIG_KEY = 'dt_config';

const defaultConfig = {
    tema: 'dark',
    fonte: 'medium',
    escola: '',
    serie: '',
    periodo: 'bimestral',
    media: 6.0,
    notaMax: 10,
    tickSom: true,
    notifFoco: true,
    lembrete: false,
    horarioLembrete: '20:00',
    prazo: true,
    focoH: 0,
    focoM: 25,
};

function getConfig() {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        return saved ? { ...defaultConfig, ...JSON.parse(saved) } : { ...defaultConfig };
    } catch(e) { return { ...defaultConfig }; }
}

function salvarConfigLocal(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

// TOAST
function toast(msg, cor) {
    const el = document.getElementById('toast-cfg');
    if (!el) return;
    el.innerText = msg;
    el.style.borderColor = (cor || '#8a2be2') + '66';
    el.style.display = 'block'; el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.style.display = 'none', 300); }, 2500);
}

// ─── FIREBASE: CARREGA CONFIGS DO USUÁRIO ─
async function carregarDoFirebase(email) {
    try {
        const snap = await getDoc(doc(db, 'notas', email));
        if (!snap.exists()) return;
        const d = snap.data();

        // Mescla configs do Firebase com local
        if (d.config) {
            const merged = { ...cfg, ...d.config };
            Object.assign(cfg, merged);
            salvarConfigLocal(cfg);
        }

        // Campos individuais salvos no perfil
        if (d.meta_minutos) {
            cfg.focoH = Math.floor(d.meta_minutos / 60);
            cfg.focoM = d.meta_minutos % 60;
        }
        if (d.escola) cfg.escola = d.escola;
        if (d.serie) cfg.serie = d.serie;
        if (d.media_aprovacao) cfg.media = d.media_aprovacao;
        if (d.nota_max) cfg.notaMax = d.nota_max;
        if (d.periodo) cfg.periodo = d.periodo;

        salvarConfigLocal(cfg);
        popularInterface();

    } catch(e) { console.error('Erro ao carregar config Firebase:', e); }
}

// ─── FIREBASE: SALVA CONFIGS ──────────────
async function salvarNoFirebase(email) {
    try {
        // Campos que vão pro Firebase (relevantes pro app todo)
        const dadosFirebase = {
            config: cfg,                          // objeto completo
            escola: cfg.escola,
            serie: cfg.serie,
            media_aprovacao: cfg.media,
            nota_max: cfg.notaMax,
            periodo: cfg.periodo,
            meta_minutos: (cfg.focoH * 60) + cfg.focoM,
        };
        await updateDoc(doc(db, 'notas', email), dadosFirebase);
    } catch(e) {
        // Se doc não existir, cria
        try {
            const email2 = auth.currentUser?.email;
            if (email2) {
                await setDoc(doc(db, 'notas', email2), {
                    config: cfg,
                    escola: cfg.escola,
                    serie: cfg.serie,
                    media_aprovacao: cfg.media,
                    nota_max: cfg.notaMax,
                    periodo: cfg.periodo,
                    meta_minutos: (cfg.focoH * 60) + cfg.focoM,
                }, { merge: true });
            }
        } catch(e2) { console.error('Erro ao salvar no Firebase:', e2); }
    }
}

// ─── TEMA ─────────────────────────────────
window.setTema = function(tema) {
    document.querySelectorAll('.theme-pill').forEach(p => p.classList.remove('active'));
    document.getElementById('theme-' + tema)?.classList.add('active');
    document.body.classList.toggle('light-mode', tema === 'light');
    cfg.tema = tema;
};

// ─── FONTE ────────────────────────────────
window.setFonte = function(size) {
    document.querySelectorAll('.font-pill').forEach(p => p.classList.remove('active'));
    document.getElementById('font-' + size)?.classList.add('active');
    document.body.classList.remove('font-small', 'font-large');
    if (size !== 'medium') document.body.classList.add('font-' + size);
    cfg.fonte = size;
};

// ─── PERÍODO ──────────────────────────────
window.setPeriodo = function(p) {
    document.querySelectorAll('.period-option').forEach(el => el.classList.remove('active'));
    document.getElementById('p-' + p)?.classList.add('active');
    cfg.periodo = p;
};

// ─── MÉDIA ────────────────────────────────
window.ajustarMedia = function(delta) {
    cfg.media = Math.max(0, Math.min(10, parseFloat((cfg.media + delta).toFixed(1))));
    const el = document.getElementById('cfg-media-val');
    if (el) el.innerText = cfg.media.toFixed(1);
    document.querySelectorAll('.preset-btn').forEach(b => {
        b.classList.toggle('active', parseFloat(b.innerText) === cfg.media);
    });
};

window.setMedia = function(val) {
    cfg.media = val;
    const el = document.getElementById('cfg-media-val');
    if (el) el.innerText = val.toFixed(1);
    document.querySelectorAll('.preset-btn').forEach(b => {
        b.classList.toggle('active', parseFloat(b.innerText) === val);
    });
};

// ─── NOTA MAX ─────────────────────────────
window.ajustarNotaMax = function(delta) {
    cfg.notaMax = Math.max(1, Math.min(100, cfg.notaMax + delta));
    const el = document.getElementById('cfg-notamax-val');
    if (el) el.innerText = cfg.notaMax;
};

// ─── TOGGLES ──────────────────────────────
const toggleIds = {
    tick: 'toggle-tick',
    notifFoco: 'toggle-notif-foco',
    lembrete: 'toggle-lembrete',
    prazo: 'toggle-prazo'
};

window.toggleOpcao = function(key) {
    cfg[key] = !cfg[key];
    const el = document.getElementById(toggleIds[key]);
    if (el) el.classList.toggle('active', cfg[key]);
    if (key === 'lembrete') {
        const card = document.getElementById('card-horario-lembrete');
        if (card) card.style.display = cfg.lembrete ? 'block' : 'none';
    }
};

// ─── SALVAR TUDO ──────────────────────────
window.salvarTudo = async function() {
    cfg.escola = document.getElementById('cfg-escola')?.value.trim() || '';
    cfg.serie = document.getElementById('cfg-serie')?.value || '';
    cfg.horarioLembrete = document.getElementById('cfg-horario-lembrete')?.value || '20:00';
    cfg.focoH = parseInt(document.getElementById('cfg-foco-h')?.value) || 0;
    cfg.focoM = parseInt(document.getElementById('cfg-foco-m')?.value) || 25;

    salvarConfigLocal(cfg);
    aplicarConfigGlobal(cfg);

    // Salva no Firebase se logado
    const user = auth.currentUser;
    if (user) {
        await salvarNoFirebase(user.email);
    }

    const btn = document.getElementById('btn-salvar');
    if (btn) {
        btn.style.background = 'linear-gradient(135deg,#2ecc71,#1a9954)';
        btn.innerText = '✓ SALVO!';
        setTimeout(() => {
            btn.style.background = '';
            btn.innerHTML = '<i data-lucide="check-circle" style="width:18px;height:18px;"></i> SALVAR CONFIGURAÇÕES';
            if (window.lucide) lucide.createIcons();
        }, 2000);
    }
    toast('✓ Configurações salvas!');
};

// ─── APLICAR GLOBAL ───────────────────────
function aplicarConfigGlobal(c) {
    document.body.classList.toggle('light-mode', c.tema === 'light');
    document.body.classList.remove('font-small', 'font-large');
    if (c.fonte !== 'medium') document.body.classList.add('font-' + c.fonte);
    salvarConfigLocal(c);
}

// ─── EXPORT / IMPORT ──────────────────────
window.exportarConfig = function() {
    const data = JSON.stringify(getConfig(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hubbrain-config.json';
    a.click();
    toast('✓ Arquivo exportado!');
};

window.importarConfig = function(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
        try {
            const imported = JSON.parse(e.target.result);
            const merged = { ...defaultConfig, ...imported };
            Object.assign(cfg, merged);
            salvarConfigLocal(cfg);
            const user = auth.currentUser;
            if (user) await salvarNoFirebase(user.email);
            popularInterface();
            aplicarConfigGlobal(cfg);
            toast('✓ Configurações importadas!');
        } catch(err) {
            toast('Arquivo inválido!', '#ff4455');
        }
    };
    reader.readAsText(file);
};

// ─── LIMPAR DADOS ─────────────────────────
let _pendingClear = null;

window.confirmarLimpeza = function(tipo) {
    const labels = {
        caderno: 'Limpar todas as notas do Caderno?',
        cronograma: 'Limpar todos os Cronogramas?',
        foco: 'Limpar todo o Histórico de Foco?',
    };
    const descs = {
        caderno: 'Todas as suas notas do caderno serão apagadas permanentemente.',
        cronograma: 'Todos os cronogramas criados serão removidos.',
        foco: 'Todo o histórico de sessões de foco será removido do dispositivo.',
    };
    _pendingClear = tipo;
    document.getElementById('modal-confirm-title').innerText = labels[tipo];
    document.getElementById('modal-confirm-desc').innerText = descs[tipo];
    document.getElementById('btn-confirm-ok').onclick = executarLimpeza;
    document.getElementById('modal-confirm').classList.add('active');
};

function executarLimpeza() {
    if (!_pendingClear) return;
    if (_pendingClear === 'foco') {
        Object.keys(localStorage)
            .filter(k => k.startsWith('dt_foco') || k.startsWith('dt_crono_conc'))
            .forEach(k => localStorage.removeItem(k));
    } else if (_pendingClear === 'caderno') {
        ['dt_notes','dt_notas_locais'].forEach(k => localStorage.removeItem(k));
    } else if (_pendingClear === 'cronograma') {
        localStorage.removeItem('dt_cronogramas');
    }
    fecharModal();
    toast('✓ Dados limpos!');
    _pendingClear = null;
}

window.fecharModal = function() {
    document.getElementById('modal-confirm').classList.remove('active');
    _pendingClear = null;
};

// ─── POPULAR INTERFACE ────────────────────
function popularInterface() {
    // Tema
    document.querySelectorAll('.theme-pill').forEach(p => p.classList.remove('active'));
    document.getElementById('theme-' + cfg.tema)?.classList.add('active');

    // Fonte
    document.querySelectorAll('.font-pill').forEach(p => p.classList.remove('active'));
    document.getElementById('font-' + cfg.fonte)?.classList.add('active');

    // Escola e série
    const escEl = document.getElementById('cfg-escola');
    if (escEl) escEl.value = cfg.escola || '';
    const serEl = document.getElementById('cfg-serie');
    if (serEl) serEl.value = cfg.serie || '';

    // Período
    document.querySelectorAll('.period-option').forEach(p => p.classList.remove('active'));
    document.getElementById('p-' + cfg.periodo)?.classList.add('active');

    // Média
    const mEl = document.getElementById('cfg-media-val');
    if (mEl) mEl.innerText = (cfg.media || 6).toFixed(1);
    document.querySelectorAll('.preset-btn').forEach(b => {
        b.classList.toggle('active', parseFloat(b.innerText) === cfg.media);
    });

    // Nota max
    const nmEl = document.getElementById('cfg-notamax-val');
    if (nmEl) nmEl.innerText = cfg.notaMax || 10;

    // Toggles
    Object.entries(toggleIds).forEach(([key, id]) => {
        document.getElementById(id)?.classList.toggle('active', !!cfg[key]);
    });

    // Horário lembrete
    const horEl = document.getElementById('cfg-horario-lembrete');
    if (horEl) horEl.value = cfg.horarioLembrete || '20:00';
    const cardHor = document.getElementById('card-horario-lembrete');
    if (cardHor) cardHor.style.display = cfg.lembrete ? 'block' : 'none';

    // Foco padrão
    const focoH = document.getElementById('cfg-foco-h');
    const focoM = document.getElementById('cfg-foco-m');
    if (focoH) focoH.value = cfg.focoH ?? 0;
    if (focoM) focoM.value = cfg.focoM ?? 25;

    aplicarConfigGlobal(cfg);
    if (window.lucide) lucide.createIcons();
}

// ─── INIT ─────────────────────────────────
let cfg = getConfig();

document.addEventListener('DOMContentLoaded', () => {
    popularInterface();
    if (window.lucide) lucide.createIcons();
});

// Auth state — carrega do Firebase quando logado
onAuthStateChanged(auth, (user) => {
    if (user) carregarDoFirebase(user.email);
});

// Expõe pra outras páginas
window.getHubConfig = getConfig;

/*
  COMO OUTRAS PÁGINAS LEEM AS CONFIGS:
  ──────────────────────────────────────
  const cfg = JSON.parse(localStorage.getItem('dt_config') || '{}');
  const media = cfg.media_aprovacao || cfg.media || 6.0;
  const periodo = cfg.periodo || 'bimestral';
  const numPeriodos = { bimestral:4, trimestral:3, semestral:2 }[periodo] || 4;
  const notaMax = cfg.nota_max || cfg.notaMax || 10;
*/
