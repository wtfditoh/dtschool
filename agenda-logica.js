import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, increment, getDoc, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const userEmail = localStorage.getItem('dt_user_email');
const userType = localStorage.getItem('dt_user_type');

let mesExibido = new Date();
let dataSelecionada = '';
let imagemBase64 = '';
let agendaGlobal = [];
let filtroBimestre = 'todos';
let filtroMateria = 'todas';

// BIMESTRES — datas aproximadas (editável)
const BIMESTRES = {
    '1': { inicio: '-02-01', fim: '-04-30', label: '1° Bimestre' },
    '2': { inicio: '-05-01', fim: '-07-31', label: '2° Bimestre' },
    '3': { inicio: '-08-01', fim: '-10-31', label: '3° Bimestre' },
    '4': { inicio: '-11-01', fim: '-12-31', label: '4° Bimestre' },
};

const TIPOS = {
    'tarefa':   { emoji: '📝', label: 'Tarefa',   xp: 10 },
    'prova':    { emoji: '🎯', label: 'Prova',    xp: 30 },
    'trabalho': { emoji: '📋', label: 'Trabalho', xp: 20 },
    'revisao':  { emoji: '🔄', label: 'Revisão',  xp: 10 },
    'projeto':  { emoji: '💡', label: 'Projeto',  xp: 25 },
};

const getHojeLocal = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const pad = n => String(n).padStart(2,'0');
const formatData = d => d.split('-').reverse().join('/');

function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.innerText = msg; el.style.display = 'block'; el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.style.display = 'none', 300); }, 2500);
}

// --- XP ---
async function atualizarXP(val) {
    if (userType === 'local' || !userEmail) return;
    try { await setDoc(doc(db,'notas',userEmail), { xp: increment(val) }, { merge: true }); } catch(e){}
}

// --- CONQUISTAS ---
const NOMES_CONQUISTAS = {
    organizado:     { emoji:'📋', nome:'Organizado',    desc:'Concluiu 5 tarefas'   },
    produtivo:      { emoji:'⚙️', nome:'Produtivo',     desc:'Concluiu 20 tarefas'  },
    maquina:        { emoji:'🤖', nome:'Máquina',       desc:'Concluiu 50 tarefas'  },
    implacavel:     { emoji:'💣', nome:'Implacável',    desc:'Concluiu 100 tarefas' },
    perfeccionista: { emoji:'⭐', nome:'Perfeccionista',desc:'Todas as tarefas do dia' },
};

function popupConquista(id) {
    const c = NOMES_CONQUISTAS[id]; if (!c) return;
    const p = document.createElement('div');
    p.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%) translateY(100px);background:#111116;border:1px solid rgba(138,43,226,0.4);border-radius:20px;padding:16px 24px;z-index:99999;display:flex;align-items:center;gap:14px;box-shadow:0 10px 40px rgba(138,43,226,0.3);transition:transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275);min-width:280px;`;
    p.innerHTML = `<div style="font-size:36px;">${c.emoji}</div><div><div style="font-size:9px;font-weight:800;letter-spacing:2px;color:#8a2be2;margin-bottom:3px;">CONQUISTA DESBLOQUEADA!</div><div style="font-size:15px;font-weight:900;color:white;">${c.nome}</div><div style="font-size:11px;color:#555;">${c.desc}</div></div>`;
    document.body.appendChild(p);
    setTimeout(() => p.style.transform='translateX(-50%) translateY(0)', 50);
    setTimeout(() => { p.style.opacity='0'; setTimeout(()=>p.remove(),400); }, 3500);
}

async function verificarConquistas() {
    if (!userEmail || userType==='local') return;
    try {
        const snap = await getDoc(doc(db,'notas',userEmail));
        if (!snap.exists()) return;
        const atuais = snap.data().conquistas || [];
        const concl = agendaGlobal.filter(t=>t.concluida).length;
        const hoje = getHojeLocal();
        const hojeArr = agendaGlobal.filter(t => hoje >= t.dataInicio && hoje <= t.dataFim);
        const todasHoje = hojeArr.length > 0 && hojeArr.every(t=>t.concluida);
        const novas = [];
        const marcos = [{id:'organizado',min:5},{id:'produtivo',min:20},{id:'maquina',min:50},{id:'implacavel',min:100}];
        marcos.forEach(m => { if (concl >= m.min && !atuais.includes(m.id)) novas.push(m.id); });
        if (todasHoje && !atuais.includes('perfeccionista')) novas.push('perfeccionista');
        if (novas.length > 0) {
            await updateDoc(doc(db,'notas',userEmail), { conquistas: arrayUnion(...novas) });
            novas.forEach((id,i) => setTimeout(()=>popupConquista(id), i*1000));
        }
    } catch(e) {}
}

// --- CARREGAR DADOS ---
async function buscarDados() {
    if (userType === 'local') {
        agendaGlobal = JSON.parse(localStorage.getItem('dt_agenda') || '[]');
    } else {
        try {
            const q = query(collection(db,'agenda'), where('usuario','==',userEmail));
            const snap = await getDocs(q);
            agendaGlobal = snap.docs.map(d => ({ id_firebase: d.id, ...d.data() }));
        } catch(e) { console.error(e); }
    }
    renderTudo();
}
window.buscarDadosNuvem = buscarDados;

function renderTudo() {
    renderFiltrosMateria();
    renderCalendario();
    renderResumo();
    renderLista();
}

// --- FILTROS MATÉRIA ---
function renderFiltrosMateria() {
    const materias = ['todas', ...new Set(agendaGlobal.map(t => t.materia).filter(Boolean))];
    const wrap = document.getElementById('filtros-materia');
    if (!wrap) return;
    wrap.innerHTML = materias.map(m => `
        <div class="filtro-pill ${m === filtroMateria ? 'active' : ''}" onclick="selecionarMateria('${m}')">
            ${m === 'todas' ? 'TODAS' : m.toUpperCase()}
        </div>
    `).join('');
}

window.selecionarMateria = function(m) {
    filtroMateria = m;
    renderTudo();
};

window.selecionarBimestre = function(el, bim) {
    filtroBimestre = bim;
    document.querySelectorAll('.bim-tab').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    renderTudo();
};

function getTarefasFiltradas() {
    let arr = [...agendaGlobal];
    if (filtroMateria !== 'todas') arr = arr.filter(t => t.materia === filtroMateria);
    if (filtroBimestre !== 'todos') {
        const ano = new Date().getFullYear();
        const bim = BIMESTRES[filtroBimestre];
        const ini = ano + bim.inicio;
        const fim = ano + bim.fim;
        arr = arr.filter(t => t.dataFim >= ini && t.dataInicio <= fim || t.bimestre === filtroBimestre);
    }
    if (dataSelecionada) arr = arr.filter(t => dataSelecionada >= t.dataInicio && dataSelecionada <= t.dataFim);
    return arr;
}

// --- RESUMO ---
function renderResumo() {
    const arr = getTarefasFiltradas();
    const hojeStr = getHojeLocal();
    const urgentes = arr.filter(t => {
        if (t.concluida) return false;
        const diff = Math.ceil((new Date(t.dataFim+'T00:00:00') - new Date(hojeStr+'T00:00:00')) / 86400000);
        return diff <= 3 && diff >= 0;
    }).length;
    const concl = arr.filter(t=>t.concluida).length;
    const pct = arr.length > 0 ? Math.round((concl/arr.length)*100) : 0;
    document.getElementById('res-total').innerText = arr.length;
    document.getElementById('res-urgente').innerText = urgentes;
    document.getElementById('res-conc').innerText = concl;
    document.getElementById('res-pct').innerText = pct + '%';
}

// --- CALENDÁRIO ---
function renderCalendario() {
    const grid = document.getElementById('calendar-grid');
    const nomeEl = document.getElementById('cal-mes-nome');
    if (!grid) return;
    grid.innerHTML = '';
    const nomesDias = ['D','S','T','Q','Q','S','S'];
    nomesDias.forEach(d => grid.innerHTML += `<div class="dia-semana">${d}</div>`);
    const ano = mesExibido.getFullYear();
    const mes = mesExibido.getMonth();
    nomeEl.innerText = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(mesExibido);
    const primeirodia = new Date(ano,mes,1).getDay();
    const diasNoMes = new Date(ano,mes+1,0).getDate();
    for (let i=0;i<primeirodia;i++) grid.innerHTML += '<div></div>';
    const hojeStr = getHojeLocal();
    for (let dia=1;dia<=diasNoMes;dia++) {
        const ds = `${ano}-${pad(mes+1)}-${pad(dia)}`;
        const tarefas = agendaGlobal.filter(t => ds >= t.dataInicio && ds <= t.dataFim);
        let dot = '';
        if (tarefas.length > 0) {
            const ativas = tarefas.filter(t=>!t.concluida);
            if (ativas.length === 0) { dot = '<div class="dot status-concluido"></div>'; }
            else {
                const diff = Math.ceil((new Date(ativas.sort((a,b)=>new Date(a.dataFim)-new Date(b.dataFim))[0].dataFim+'T00:00:00') - new Date(hojeStr+'T00:00:00'))/86400000);
                const cl = diff<=3 ? 'status-urgente' : diff<=7 ? 'status-alerta' : 'status-tranquilo';
                dot = `<div class="dot ${cl}"></div>`;
            }
        }
        const hj = hojeStr===ds ? 'hoje' : '';
        const sel = dataSelecionada===ds ? 'selecionado' : '';
        grid.innerHTML += `<div class="dia-numero ${hj} ${sel}" onclick="selecionarDia('${ds}')">${dia}${dot}</div>`;
    }
    if (window.lucide) lucide.createIcons();
}

window.selecionarDia = function(d) {
    dataSelecionada = dataSelecionada === d ? '' : d;
    const titulo = document.getElementById('lista-titulo');
    if (titulo) titulo.innerText = dataSelecionada ? `DIA ${formatData(dataSelecionada)}` : 'TODAS AS ATIVIDADES';
    renderCalendario(); renderResumo(); renderLista();
};
window.mudarMes = function(v) { mesExibido.setMonth(mesExibido.getMonth()+v); renderCalendario(); };

// --- LISTA POR MATÉRIA ---
function renderLista() {
    const lista = document.getElementById('lista-agenda');
    if (!lista) return;
    const arr = getTarefasFiltradas();
    const hojeStr = getHojeLocal();

    if (arr.length === 0) {
        lista.innerHTML = '<div class="empty-state">Nenhuma atividade encontrada 📭</div>';
        return;
    }

    // Agrupa por matéria
    const grupos = {};
    arr.forEach(t => {
        const m = t.materia || 'Geral';
        if (!grupos[m]) grupos[m] = [];
        grupos[m].push(t);
    });

    let html = '';
    Object.entries(grupos).forEach(([materia, tarefas]) => {
        tarefas.sort((a,b) => {
            if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
            return new Date(a.dataFim) - new Date(b.dataFim);
        });
        const pendentes = tarefas.filter(t=>!t.concluida).length;
        html += `<div class="materia-group">
            <div class="materia-group-header" onclick="toggleGrupo('${materia}')">
                <div class="materia-group-nome">${materia.toUpperCase()}</div>
                <div class="materia-group-count">${pendentes} pendente${pendentes!==1?'s':''}</div>
                <div class="materia-group-arrow" id="arrow-${materia}">↓</div>
            </div>
            <div id="grupo-${materia}">`;

        tarefas.forEach(t => {
            const fim = new Date(t.dataFim+'T00:00:00');
            const hoje = new Date(hojeStr+'T00:00:00');
            const diff = Math.ceil((fim - hoje) / 86400000);
            const tipo = TIPOS[t.tipo] || TIPOS['tarefa'];

            let statusClass = 'tranquilo', statusHtml = '';
            if (t.concluida) {
                statusClass = 'concluida-card';
                statusHtml = `<span class="status-tag st-concluido">✓ CONCLUÍDO</span>`;
            } else if (diff < 0) {
                statusClass = '';
                statusHtml = `<span class="status-tag st-expirado">EXPIRADO</span>`;
            } else if (diff === 0) {
                statusClass = 'urgente';
                statusHtml = `<span class="status-tag st-urgente">🔥 HOJE!</span>`;
            } else if (diff <= 3) {
                statusClass = 'urgente';
                statusHtml = `<span class="status-tag st-urgente">⚡ ${diff}d restante${diff!==1?'s':''}</span>`;
            } else if (diff <= 7) {
                statusClass = 'alerta';
                statusHtml = `<span class="status-tag st-alerta">⏰ ${diff} dias</span>`;
            } else {
                statusHtml = `<span class="status-tag st-tranquilo">${diff} dias</span>`;
            }

            const bimLabel = t.bimestre ? `<span style="font-size:9px;color:#444;margin-left:6px;">${t.bimestre}° BIM</span>` : '';

            html += `<div class="tarefa-card ${statusClass}${t.concluida?' concluida-card':''}">
                <div class="tarefa-top">
                    <div style="flex:1;">
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                            <span class="tarefa-materia-badge">${tipo.emoji} ${tipo.label}</span>
                            ${bimLabel}
                        </div>
                        <div class="tarefa-titulo ${t.concluida?'riscado':''}" onclick="alternarConcluida('${t.id_firebase||''}',${t.criadoEm||0})">${t.nome}</div>
                        ${t.descricao ? `<div class="tarefa-desc-text">${t.descricao}</div>` : ''}
                        <div class="tarefa-footer">
                            ${statusHtml}
                            <div class="tarefa-prazo" style="color:#333;font-size:11px;">Prazo: ${formatData(t.dataFim)}</div>
                        </div>
                    </div>
                    <div class="tarefa-actions" style="flex-shrink:0;margin-left:8px;">
                        <button class="btn-acao ok" onclick="alternarConcluida('${t.id_firebase||''}',${t.criadoEm||0})">
                            <i data-lucide="${t.concluida?'rotate-ccw':'check-circle'}" style="width:16px;height:16px;"></i>
                        </button>
                        <button class="btn-acao del" onclick="removerTarefa('${t.id_firebase||''}',${t.criadoEm||0})">
                            <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                        </button>
                    </div>
                </div>
                ${t.imagem ? `<img src="${t.imagem}" class="tarefa-img">` : ''}
            </div>`;
        });
        html += '</div></div>';
    });

    lista.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

window.toggleGrupo = function(materia) {
    const el = document.getElementById('grupo-' + materia);
    const arrow = document.getElementById('arrow-' + materia);
    if (!el) return;
    const aberto = el.style.display !== 'none';
    el.style.display = aberto ? 'none' : 'block';
    if (arrow) arrow.innerText = aberto ? '→' : '↓';
};

// --- CRUD ---
window.adicionarTarefa = async function() {
    const nome = document.getElementById('tarefa-nome').value.trim();
    const desc = document.getElementById('tarefa-desc').value.trim();
    const dataInicio = document.getElementById('tarefa-data-inicio').value;
    const dataFim = document.getElementById('tarefa-data-fim').value;
    const materia = document.getElementById('tarefa-materia').value;
    const tipo = document.getElementById('tarefa-tipo').value;
    const bimestre = document.getElementById('tarefa-bimestre').value;
    if (!nome || !dataInicio || !dataFim || !userEmail) return;

    let playerId = null;
    if (window.OneSignalDeferred) {
        await new Promise(res => { OneSignalDeferred.push(async (OS) => { playerId = OS.User.PushSubscription.token; res(); }); });
    }

    const nova = { nome, descricao:desc, dataInicio, dataFim, materia, tipo, bimestre, imagem:imagemBase64, concluida:false, usuario:userEmail, onesignal_player_id:playerId||null, criadoEm:Date.now() };

    if (userType === 'local') {
        agendaGlobal.push(nova); localStorage.setItem('dt_agenda', JSON.stringify(agendaGlobal));
    } else {
        await addDoc(collection(db,'agenda'), nova);
    }
    fecharModal();
    await buscarDados();
    toast('✓ Atividade agendada!');
};

window.removerTarefa = async function(idFb, idLocal) {
    if (!confirm('Deletar esta atividade?')) return;
    const t = agendaGlobal.find(x => userType==='local' ? x.criadoEm===idLocal : x.id_firebase===idFb);
    if (t?.concluida) await atualizarXP(-(TIPOS[t.tipo]||TIPOS.tarefa).xp);
    if (userType === 'local') {
        agendaGlobal = agendaGlobal.filter(x=>x.criadoEm!==idLocal); localStorage.setItem('dt_agenda', JSON.stringify(agendaGlobal));
    } else { await deleteDoc(doc(db,'agenda',idFb)); }
    await buscarDados();
};

window.alternarConcluida = async function(idFb, idLocal) {
    let t;
    if (userType === 'local') {
        const idx = agendaGlobal.findIndex(x=>x.criadoEm===idLocal);
        if (idx!==-1) { t=agendaGlobal[idx]; t.concluida=!t.concluida; localStorage.setItem('dt_agenda',JSON.stringify(agendaGlobal)); }
    } else {
        t = agendaGlobal.find(x=>x.id_firebase===idFb);
        if (!t) return;
        const novoStatus = !t.concluida;
        await updateDoc(doc(db,'agenda',idFb), {concluida:novoStatus});
        t.concluida = novoStatus;
    }
    if (t) {
        const xp = (TIPOS[t.tipo]||TIPOS.tarefa).xp;
        await atualizarXP(t.concluida ? xp : -xp);
        if (t.concluida) await verificarConquistas();
    }
    renderTudo();
};

// --- MODAL ---
window.abrirModal = function() {
    const hoje = getHojeLocal();
    document.getElementById('tarefa-data-inicio').value = dataSelecionada || hoje;
    document.getElementById('tarefa-data-fim').value = dataSelecionada || hoje;
    carregarMateriasNoSelect();
    document.getElementById('modal-agenda').style.display = 'flex';
};
window.fecharModal = function() {
    document.getElementById('modal-agenda').style.display='none';
    ['tarefa-nome','tarefa-desc'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('tarefa-materia').value='Geral';
    document.getElementById('tarefa-tipo').value='tarefa';
    document.getElementById('tarefa-bimestre').value='';
    document.getElementById('preview-container').innerHTML='';
    imagemBase64='';
};

function carregarMateriasNoSelect() {
    const sel = document.getElementById('tarefa-materia'); if(!sel) return;
    const mats = JSON.parse(localStorage.getItem('materias_db')||localStorage.getItem('materias')||'[]');
    sel.innerHTML = '<option value="Geral">Geral / Outros</option>';
    mats.forEach(m => { if(m.nome) { const o=document.createElement('option'); o.value=m.nome; o.textContent=m.nome; sel.appendChild(o); } });
}
window.carregarMateriasNoSelect = carregarMateriasNoSelect;

window.previewImg = function(input) {
    if (input.files?.[0]) {
        const r = new FileReader();
        r.onload = e => { imagemBase64=e.target.result; document.getElementById('preview-container').innerHTML=`<img src="${imagemBase64}" style="width:100%;border-radius:12px;margin-top:12px;">`; };
        r.readAsDataURL(input.files[0]);
    }
};

// --- COMPARTILHAR ---
window.abrirCompartilhar = function() {
    const arr = getTarefasFiltradas().filter(t=>!t.concluida).sort((a,b)=>new Date(a.dataFim)-new Date(b.dataFim)).slice(0,8);
    const hojeStr = getHojeLocal();
    const bimLabel = filtroBimestre !== 'todos' ? BIMESTRES[filtroBimestre]?.label : 'Todas as atividades';
    const mLabel = filtroMateria !== 'todas' ? filtroMateria : '';

    let itemsHtml = arr.map(t => {
        const diff = Math.ceil((new Date(t.dataFim+'T00:00:00') - new Date(hojeStr+'T00:00:00'))/86400000);
        const cor = diff<=3 ? '#ff4444' : diff<=7 ? '#ffbb33' : '#00c851';
        const tipo = TIPOS[t.tipo]||TIPOS.tarefa;
        return `<div class="share-item">
            <div class="share-item-dot" style="background:${cor};box-sha
