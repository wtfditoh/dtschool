import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc, deleteDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, sendPasswordResetEmail, deleteUser } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
    tema: 'dark', escola: '', serie: '',
    periodo: 'bimestral', media: 6.0, notaMax: 10,
    tick: true, notifFoco: true, lembrete: false,
    horarioLembrete: '20:00', streak: true, prazo: true,
    conquistas: true, ranking: true, showEscola: false,
    focoH: 0, focoM: 25,
};

function getCfg() {
    try { return { ...defaultConfig, ...JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') }; }
    catch(e) { return { ...defaultConfig }; }
}

function salvarLocal(c) { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); }

let cfg = getCfg();
let feedbackTipoAtual = 'sugestao';
let _confirmCallback = null;

// TOAST
function toast(msg, cor) {
    const el = document.getElementById('toast-cfg'); if (!el) return;
    el.innerText = msg;
    el.style.borderColor = (cor || '#8a2be2') + '88';
    el.style.display = 'block'; el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.style.display = 'none', 300); }, 2800);
}

// ─── FIREBASE: CARREGAR ───────────────────
async function carregarDoFirebase(email) {
    try {
        const snap = await getDoc(doc(db, 'notas', email));
        if (!snap.exists()) return;
        const d = snap.data();
        if (d.config) Object.assign(cfg, d.config);
        if (d.meta_minutos) { cfg.focoH = Math.floor(d.meta_minutos/60); cfg.focoM = d.meta_minutos%60; }
        if (d.escola) cfg.escola = d.escola;
        if (d.serie) cfg.serie = d.serie;
        if (d.media_aprovacao !== undefined) cfg.media = d.media_aprovacao;
        if (d.nota_max !== undefined) cfg.notaMax = d.nota_max;
        if (d.periodo) cfg.periodo = d.periodo;
        salvarLocal(cfg);
        popularInterface();
    } catch(e) { console.error(e); }
}

// ─── FIREBASE: SALVAR ─────────────────────
async function salvarNoFirebase(email) {
    try {
        await updateDoc(doc(db, 'notas', email), {
            config: cfg, escola: cfg.escola, serie: cfg.serie,
            media_aprovacao: cfg.media, nota_max: cfg.notaMax,
            periodo: cfg.periodo, meta_minutos: cfg.focoH*60 + cfg.focoM,
            ranking_visivel: cfg.ranking, escola_visivel: cfg.showEscola,
        });
    } catch(e) {
        try {
            await setDoc(doc(db,'notas',email), {
                config:cfg, escola:cfg.escola, serie:cfg.serie,
                media_aprovacao:cfg.media, nota_max:cfg.notaMax,
                periodo:cfg.periodo, meta_minutos:cfg.focoH*60+cfg.focoM,
            }, { merge:true });
        } catch(e2) { console.error(e2); }
    }
}

// ─── CONTROLES ────────────────────────────
window.setTema = function(tema) {
    cfg.tema = tema;
    document.querySelectorAll('.theme-pill').forEach(p => p.classList.remove('active'));
    document.getElementById('theme-'+tema)?.classList.add('active');
    document.body.classList.toggle('light-mode', tema === 'light');
};

window.setPeriodo = function(p) {
    cfg.periodo = p;
    document.querySelectorAll('.period-option').forEach(el => el.classList.remove('active'));
    document.getElementById('p-'+p)?.classList.add('active');
};

window.ajustarMedia = function(delta) {
    cfg.media = Math.max(0, Math.min(10, parseFloat((cfg.media+delta).toFixed(1))));
    document.getElementById('cfg-media-val').innerText = cfg.media.toFixed(1);
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.toggle('active', parseFloat(b.innerText) === cfg.media));
};

window.setMedia = function(val) {
    cfg.media = val;
    document.getElementById('cfg-media-val').innerText = val.toFixed(1);
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.toggle('active', parseFloat(b.innerText) === val));
};

window.ajustarNotaMax = function(delta) {
    cfg.notaMax = Math.max(1, Math.min(100, cfg.notaMax+delta));
    document.getElementById('cfg-notamax-val').innerText = cfg.notaMax;
};

const toggleIds = { tick:'toggle-tick', notifFoco:'toggle-notifFoco', lembrete:'toggle-lembrete', streak:'toggle-streak', prazo:'toggle-prazo', conquistas:'toggle-conquistas', ranking:'toggle-ranking', showEscola:'toggle-showEscola' };

window.toggleOpcao = function(key) {
    cfg[key] = !cfg[key];
    document.getElementById(toggleIds[key])?.classList.toggle('active', cfg[key]);
    if (key === 'lembrete') {
        document.getElementById('card-horario').style.display = cfg.lembrete ? 'block' : 'none';
    }
};

// ─── FEEDBACK ─────────────────────────────
window.setFeedbackTipo = function(el, tipo) {
    feedbackTipoAtual = tipo;
    document.querySelectorAll('.feedback-tipo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
};

window.enviarFeedback = async function() {
    const texto = document.getElementById('feedback-texto').value.trim();
    if (!texto) { toast('Escreve sua mensagem primeiro!', '#ff4455'); return; }

    const btn = document.getElementById('btn-feedback');
    btn.disabled = true;
    btn.innerText = 'Enviando...';

    try {
        const user = auth.currentUser;
        await addDoc(collection(db, 'feedbacks'), {
            tipo: feedbackTipoAtual,
            mensagem: texto,
            usuario: user?.email || localStorage.getItem('dt_user_email') || 'anônimo',
            nome: localStorage.getItem('dt_user_name') || 'Anônimo',
            timestamp: Date.now(),
            lido: false,
        });

        document.getElementById('feedback-texto').value = '';
        document.getElementById('feedback-chars').innerText = '0/500';
        toast('✓ Mensagem enviada! Obrigado 🔥');
        btn.innerHTML = '<i data-lucide="check" style="width:16px;height:16px;"></i> ENVIADO!';
        btn.style.background = 'linear-gradient(135deg,#2ecc71,#1a9954)';
        if (window.lucide) lucide.createIcons();
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="send" style="width:16px;height:16px;"></i> ENVIAR MENSAGEM';
            btn.style.background = '';
            if (window.lucide) lucide.createIcons();
        }, 3000);
    } catch(e) {
        toast('Erro ao enviar. Tenta de novo!', '#ff4455');
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" style="width:16px;height:16px;"></i> ENVIAR MENSAGEM';
        if (window.lucide) lucide.createIcons();
    }
};

// ─── ALTERAR SENHA ────────────────────────
window.alterarSenha = async function() {
    const user = auth.currentUser;
    const email = user?.email || localStorage.getItem('dt_user_email');
    if (!email) { toast('Nenhuma conta logada', '#ff4455'); return; }
    try {
        await sendPasswordResetEmail(auth, email);
        toast(`✓ Link enviado para ${email}`);
    } catch(e) { toast('Erro ao enviar link', '#ff4455'); }
};

// ─── EXCLUIR CONTA ────────────────────────
window.confirmarExcluirConta = function() {
    abrirModal(
        '💀',
        'Excluir sua conta?',
        'Digite "EXCLUIR" para confirmar. Todos os seus dados serão apagados permanentemente do Firebase.',
        async () => {
            const input = document.getElementById('modal-confirm-input').value.trim();
            if (input !== 'EXCLUIR') { toast('Digite EXCLUIR corretamente', '#ff4455'); return; }
            try {
                const user = auth.currentUser;
                const email = user?.email || localStorage.getItem('dt_user_email');
                if (email) await deleteDoc(doc(db, 'notas', email));
                if (user) await deleteUser(user);
                localStorage.clear();
                toast('Conta excluída. Até mais 👋');
                setTimeout(() => window.location.href = 'login.html', 1500);
            } catch(e) {
                toast('Erro ao excluir. Faça login novamente e tente.', '#ff4455');
            }
            fecharModal();
        },
        true // mostra input
    );
};

// ─── LIMPAR DADOS ─────────────────────────
window.confirmarLimpeza = function(tipo, titulo, desc) {
    abrirModal('⚠️', titulo, desc, () => {
        if (tipo === 'foco') {
            Object.keys(localStorage).filter(k => k.startsWith('dt_foco') || k.startsWith('dt_crono_conc')).forEach(k => localStorage.removeItem(k));
        } else if (tipo === 'cronograma') {
            localStorage.removeItem('dt_cronogramas');
        }
        toast('✓ Dados limpos!');
        fecharModal();
    });
};

// ─── EXPORTAR ─────────────────────────────
window.exportarConfig = function() {
    const blob = new Blob([JSON.stringify(getCfg(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'hubbrain-config.json'; a.click();
    toast('✓ Config exportada!');
};

window.exportarDados = function() {
    const dados = {
        config: getCfg(),
        materias: JSON.parse(localStorage.getItem('materias') || '[]'),
        agenda: JSON.parse(localStorage.getItem('dt_agenda') || '[]'),
        cronogramas: JSON.parse(localStorage.getItem('dt_cronogramas') || '[]'),
        exportadoEm: new Date().toISOString(),
        usuario: localStorage.getItem('dt_user_email') || '',
    };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'hubbrain-backup.json'; a.click();
    toast('✓ Dados exportados!');
};

// ─── SALVAR TUDO ──────────────────────────
window.salvarTudo = async function() {
    cfg.escola = document.getElementById('cfg-escola')?.value.trim() || '';
    cfg.serie = document.getElementById('cfg-serie')?.value || '';
    cfg.horarioLembrete = document.getElementById('cfg-horario-lembrete')?.value || '20:00';
    cfg.focoH = parseInt(document.getElementById('cfg-foco-h')?.value) || 0;
    cfg.focoM = parseInt(document.getElementById('cfg-foco-m')?.value) || 25;

    salvarLocal(cfg);

    const user = auth.currentUser;
    if (user) await salvarNoFirebase(user.email);

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

// ─── MODAL GENÉRICO ───────────────────────
function abrirModal(emoji, titulo, desc, callback, comInput = false) {
    _confirmCallback = callback;
    document.getElementById('modal-emoji').innerText = emoji;
    document.getElementById('modal-title').innerText = titulo;
    document.getElementById('modal-desc').innerText = desc;
    const inp = document.getElementById('modal-confirm-input');
    inp.style.display = comInput ? 'block' : 'none';
    inp.value = '';
    document.getElementById('btn-confirm-ok').onclick = () => { if(_confirmCallback) _confirmCallback(); };
    document.getElementById('modal-confirm').classList.add('active');
}

window.fecharModal = function() {
    document.getElementById('modal-confirm').classList.remove('active');
    _confirmCallback = null;
};

// ─── POPULAR INTERFACE ────────────────────
function popularInterface() {
    document.querySelectorAll('.theme-pill').forEach(p => p.classList.remove('active'));
    document.getElementById('theme-'+cfg.tema)?.classList.add('active');

    document.getElementById('cfg-escola').value = cfg.escola || '';
    document.getElementById('cfg-serie').value = cfg.serie || '';

    document.querySelectorAll('.period-option').forEach(p => p.classList.remove('active'));
    document.getElementById('p-'+cfg.periodo)?.classList.add('active');

    document.getElementById('cfg-media-val').innerText = (cfg.media||6).toFixed(1);
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.toggle('active', parseFloat(b.innerText) === cfg.media));
    document.getElementById('cfg-notamax-val').innerText = cfg.notaMax || 10;

    Object.entries(toggleIds).forEach(([key, id]) => {
        document.getElementById(id)?.classList.toggle('active', !!cfg[key]);
    });

    document.getElementById('cfg-horario-lembrete').value = cfg.horarioLembrete || '20:00';
    document.getElementById('card-horario').style.display = cfg.lembrete ? 'block' : 'none';

    document.getElementById('cfg-foco-h').value = cfg.focoH ?? 0;
    document.getElementById('cfg-foco-m').value = cfg.focoM ?? 25;

    document.body.classList.toggle('light-mode', cfg.tema === 'light');

    if (window.lucide) lucide.createIcons();
}

// ─── INIT ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    popularInterface();
    if (window.lucide) lucide.createIcons();
});

onAuthStateChanged(auth, user => {
    if (user) carregarDoFirebase(user.email);
});

window.getHubConfig = getCfg;
