import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, increment, getDoc, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a",
    measurementId: "G-F7TG23TBTL"
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

const TIPOS = {
    tarefa:   { emoji:'📝', label:'Tarefa',   xp:10 },
    prova:    { emoji:'🎯', label:'Prova',    xp:30 },
    trabalho: { emoji:'📋', label:'Trabalho', xp:20 },
    revisao:  { emoji:'🔄', label:'Revisão',  xp:10 },
    projeto:  { emoji:'💡', label:'Projeto',  xp:25 },
};

const BIMESTRES = {
    '1': { inicio:'-02-01', fim:'-04-30', label:'1° Bimestre' },
    '2': { inicio:'-05-01', fim:'-07-31', label:'2° Bimestre' },
    '3': { inicio:'-08-01', fim:'-10-31', label:'3° Bimestre' },
    '4': { inicio:'-11-01', fim:'-12-31', label:'4° Bimestre' },
};

const getHojeLocal = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};
const pad = n => String(n).padStart(2,'0');
const formatData = d => d ? d.split('-').reverse().join('/') : '';

function toast(msg) {
    const el = document.getElementById('toast-agenda');
    if (!el) return;
    el.innerText = msg; el.style.display = 'block'; el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.style.display = 'none', 300); }, 2500);
}

// XP
async function atualizarXPRanking(val) {
    if (userType === 'local' || !userEmail) return;
    try { await setDoc(doc(db,'notas',userEmail), { xp: increment(val) }, { merge:true }); } catch(e){}
}

function identificarXPTarefa(t) {
    return (TIPOS[t.tipo] || TIPOS.tarefa).xp;
}

// CONQUISTAS
const NOMES_CONQUISTAS = {
    organizado:     { emoji:'📋', nome:'Organizado',    desc:'Concluiu 5 tarefas' },
    produtivo:      { emoji:'⚙️', nome:'Produtivo',     desc:'Concluiu 20 tarefas' },
    maquina:        { emoji:'🤖', nome:'Máquina',       desc:'Concluiu 50 tarefas' },
    implacavel:     { emoji:'💣', nome:'Implacável',    desc:'Concluiu 100 tarefas' },
    perfeccionista: { emoji:'⭐', nome:'Perfeccionista',desc:'Todas as tarefas do dia' },
};

function mostrarPopupLocal(id) {
    const c = NOMES_CONQUISTAS[id]; if (!c) return;
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%) translateY(100px);background:#111116;border:1px solid rgba(138,43,226,0.4);border-radius:20px;padding:16px 24px;z-index:99999;display:flex;align-items:center;gap:14px;box-shadow:0 10px 40px rgba(138,43,226,0.3);transition:transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275);min-width:280px;';
    p.innerHTML = `<div style="font-size:36px;">${c.emoji}</div><div><div style="font-size:9px;font-weight:800;letter-spacing:2px;color:#8a2be2;margin-bottom:3px;">CONQUISTA!</div><div style="font-size:15px;font-weight:900;color:white;">${c.nome}</div><div style="font-size:11px;color:#555;">${c.desc}</div></div>`;
    document.body.appendChild(p);
    setTimeout(() => p.style.transform = 'translateX(-50%) translateY(0)', 50);
    setTimeout(() => { p.style.opacity='0'; setTimeout(()=>p.remove(),400); }, 3500);
}

async function verificarConquistasTarefas() {
    if (!userEmail || userType==='local') return;
    try {
        const snap = await getDoc(doc(db,'notas',userEmail));
        if (!snap.exists()) return;
        const atuais = snap.data().conquistas || [];
        const q = query(collection(db,'agenda'), where('usuario','==',userEmail));
        const aSnap = await getDocs(q);
        const concl = aSnap.docs.filter(d=>d.data().concluida).length;
        const hoje = getHojeLocal();
        const hojeArr = aSnap.docs.map(d=>d.data()).filter(t => hoje >= t.dataInicio && hoje <= t.dataFim);
        const todasHoje = hojeArr.length > 0 && hojeArr.every(t=>t.concluida);
        const novas = [];
        [{id:'organizado',min:5},{id:'produtivo',min:20},{id:'maquina',min:50},{id:'implacavel',min:100}].forEach(c => {
            if (concl >= c.min && !atuais.includes(c.id)) novas.push(c.id);
        });
        if (todasHoje && !atuais.includes('perfeccionista')) novas.push('perfeccionista');
        if (novas.length > 0) {
            await updateDoc(doc(db,'notas',userEmail), { conquistas: arrayUnion(...novas) });
            novas.forEach((id,i) => setTimeout(()=>mostrarPopupLocal(id), i*1000));
        }
    } catch(e) {}
}

// PLAYER ID
async function salvarPlayerIdNasAgendas() {
    if (!userEmail || userType==='local') return;
    try {
        if (!window.OneSignalDeferred) return;
        OneSignalDeferred.push(async function(OS) {
            const pid = OS.User.PushSubscription.token;
            if (!pid) return;
            const q = query(collection(db,'agenda'), where('usuario','==',userEmail));
            const snap = await getDocs(q);
            await Promise.all(snap.docs.map(d => updateDoc(doc(db,'agenda',d.id), { onesignal_player_id: pid })));
        });
    } catch(e) {}
}

// INIT
document.addEventListener('DOMContentLoaded', () => {
    window.carregarMateriasNoSelect();
    window.buscarDadosNuvem();
    salvarPlayerIdNasAgendas();
});

// BUSCAR DADOS
window.buscarDadosNuvem = async function() {
    if (userType === 'local') {
        agendaGlobal = JSON.parse(localStorage.getItem('dt_agenda') || '[]');
    } else {
        try {
            const q = query(collection(db,'agenda'), where('usuario','==',userEmail));
            const snap = await getDocs(q);
            agendaGlobal = snap.docs.map(d => ({ id_firebase: d.id, ...d.data() }));
        } catch(e) { console.error(e); }
    }
    renderFiltrosMateria();
    window.renderizarCalendario();
    renderResumo();
    window.carregarTarefas(dataSelecionada);
};

// FILTRO BIMESTRE
window.selecionarBimestre = function(el, bim) {
    filtroBimestre = bim;
    document.querySelectorAll('.bim-tab').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    renderResumo();
    window.carregarTarefas(dataSelecionada);
};

// FILTRO MATÉRIA
function renderFiltrosMateria() {
    const wrap = document.getElementById('filtros-materias');
    if (!wrap) return;
    const materias = [...new Set(agendaGlobal.map(t=>t.materia).filter(Boolean))];
    if (materias.length === 0) { wrap.innerHTML=''; return; }
    wrap.innerHTML = ['todas',...materias].map(m =>
        `<button class="filtro-mat ${m===filtroMateria?'active':''}" onclick="window.selecionarFiltroMateria('${m}')">${m==='todas'?'TODAS':m.toUpperCase()}</button>`
    ).join('');
}

window.selecionarFiltroMateria = function(m) {
    filtroMateria = m;
    renderFiltrosMateria();
    renderResumo();
    window.carregarTarefas(dataSelecionada);
};

function getTarefasFiltradas() {
    let arr = [...agendaGlobal];
    if (filtroMateria !== 'todas') arr = arr.filter(t => t.materia === filtroMateria);
    if (filtroBimestre !== 'todos') {
        const ano = new Date().getFullYear();
        const bim = BIMESTRES[filtroBimestre];
        const ini = ano + bim.inicio;
        const fim = ano + bim.fim;
        arr = arr.filter(t => (t.bimestre === filtroBimestre) || (t.dataFim >= ini && t.dataInicio <= fim));
    }
    return arr;
}

// RESUMO
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
    const rTotal = document.getElementById('res-total');
    const rUrg = document.getElementById('res-urgente');
    const rConc = document.getElementById('res-conc');
    const rPct = document.getElementById('res-pct');
    if(rTotal) rTotal.innerText = arr.length;
    if(rUrg) rUrg.innerText = urgentes;
    if(rConc) rConc.innerText = concl;
    if(rPct) rPct.innerText = pct + '%';
}

// CALENDÁRIO — igual ao original
window.renderizarCalendario = function() {
    const grid = document.getElementById('calendar-grid');
    const topoMes = document.getElementById('mes-topo');
    if (!grid || !topoMes) return;
    grid.innerHTML = '';
    ['D','S','T','Q','Q','S','S'].forEach(d => grid.innerHTML += `<div class="dia-semana">${d}</div>`);
    const ano = mesExibido.getFullYear();
    const mes = mesExibido.getMonth();
    topoMes.innerText = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(mesExibido);
    const primeiroDia = new Date(ano,mes,1).getDay();
    const diasNoMes = new Date(ano,mes+1,0).getDate();
    for(let i=0;i<primeiroDia;i++) grid.innerHTML += '<div></div>';
    const hojeLocal = getHojeLocal();
    for(let dia=1;dia<=diasNoMes;dia++) {
        const ds = `${ano}-${pad(mes+1)}-${pad(dia)}`;
        const tarefasDoDia = agendaGlobal.filter(t => ds >= t.dataInicio && ds <= t.dataFim);
        let htmlDot = '';
        if (tarefasDoDia.length > 0) {
            const ativas = tarefasDoDia.filter(t=>!t.concluida);
            if (ativas.length === 0) {
                htmlDot = '<div class="dot status-concluido"></div>';
            } else {
                const diffs = ativas.map(t => Math.ceil((new Date(t.dataFim+'T00:00:00') - new Date(hojeLocal+'T00:00:00'))/86400000));
                const minDiff = Math.min(...diffs);
                const cl = minDiff<=3 ? 'status-urgente' : minDiff<=7 ? 'status-alerta' : 'status-tranquilo';
                htmlDot = `<div class="dot ${cl}"></div>`;
            }
        }
        const hjCl = hojeLocal===ds ? 'hoje' : '';
        const selCl = dataSelecionada===ds ? 'selecionado' : '';
        grid.innerHTML += `<div class="dia-numero ${hjCl} ${selCl}" onclick="selecionarDia('${ds}')">${dia}${htmlDot}</div>`;
    }
    if (window.lucide) lucide.createIcons();
};

window.selecionarDia = function(d) {
    dataSelecionada = dataSelecionada === d ? '' : d;
    const titulo = document.getElementById('titulo-lista');
    if (titulo) titulo.innerText = dataSelecionada ? 'DIA ' + formatData(dataSelecionada) : 'ATIVIDADES';
    window.renderizarCalendario();
    renderResumo();
    window.carregarTarefas(dataSelecionada);
};

window.mudarMes = function(v) {
    mesExibido.setMonth(mesExibido.getMonth()+v);
    window.renderizarCalendario();
};

// LISTA COM GRUPOS POR MATÉRIA
window.carregarTarefas = function(filtroData) {
    const lista = document.getElementById('lista-agenda');
    if (!lista) return;
    const hojeStr = getHojeLocal();

    let arr = getTarefasFiltradas();
    if (filtroData) arr = arr.filter(t => filtroData >= t.dataInicio && filtroData <= t.dataFim);

    if (arr.length === 0) {
        lista.innerHTML = '<p style="color:#333;text-align:center;padding:30px;font-size:13px;font-weight:600;">Sem atividades aqui 📭</p>';
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
    Object.entries(grupos).sort((a,b) => {
        const pendA = a[1].filter(t=>!t.concluida).length;
        const pendB = b[1].filter(t=>!t.concluida).length;
        return pendB - pendA;
    }).forEach(([materia, tarefas]) => {
        tarefas.sort((a,b) => {
            if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
            return new Date(a.dataFim) - new Date(b.dataFim);
        });
        const pendentes = tarefas.filter(t=>!t.concluida).length;
        const gId = 'grp_' + materia.replace(/\s/g,'_');

        html += `<div class="grupo-materia">
            <div class="grupo-header" onclick="toggleGrupo('${gId}')">
                <span class="grupo-nome">${materia.toUpperCase()}</span>
                <span class="grupo-count">${pendentes} pendente${pendentes!==1?'s':''}</span>
                <span class="grupo-arrow" id="arrow_${gId}">↓</span>
            </div>
            <div id="${gId}">`;

        tarefas.forEach(t => {
            const fim = new Date(t.dataFim+'T00:00:00');
            const hoje = new Date(hojeStr+'T00:00:00');
            const diff = Math.ceil((fim - hoje) / 86400000);
            const tipo = TIPOS[t.tipo] || TIPOS.tarefa;

            let statusTag = '';
            let borderColor = '#00c851';
            if (t.concluida) {
                statusTag = '<span class="status-tag st-concluido">✓ CONCLUÍDO</span>';
                borderColor = '#00d2ff';
            } else if (diff < 0) {
                statusTag = '<span class="status-tag st-expirado">EXPIRADO</span>';
                borderColor = '#333';
            } else if (diff === 0) {
                statusTag = '<span class="status-tag st-hoje">🔥 HOJE!</span>';
                borderColor = '#ff4444';
            } else if (diff <= 3) {
                statusTag = `<span class="status-tag st-urgente">⚡ ${diff}d</span>`;
                borderColor = '#ff4444';
            } else if (diff <= 7) {
                statusTag = `<span class="status-tag st-alerta">⏰ ${diff} dias</span>`;
                borderColor = '#ffbb33';
            } else {
                statusTag = `<span class="status-tag st-ok">${diff} dias</span>`;
            }

            const bimLabel = t.bimestre ? `<span class="bim-badge">${t.bimestre}° BIM</span>` : '';
            const idFb = t.id_firebase || '';
            const idLc = t.criadoEm || 0;

            html += `
            <div class="tarefa-item" style="border-left:4px solid ${borderColor};opacity:${t.concluida?'0.55':'1'};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                    <div style="flex:1;">
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
                            <span class="tipo-badge">${tipo.emoji} ${tipo.label}</span>
                            ${bimLabel}
                        </div>
                        <b style="display:block;font-size:16px;color:white;text-decoration:${t.concluida?'line-through':'none'};cursor:pointer;margin-bottom:4px;" onclick="alternarConcluida('${idFb}',${idLc})">${t.nome}</b>
                        ${t.descricao ? `<p style="color:#666;font-size:12px;margin:0 0 8px;line-height:1.4;">${t.descricao}</p>` : ''}
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                            ${statusTag}
                            <span style="font-size:10px;color:#333;">Prazo: ${formatData(t.dataFim)}</span>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
                        <button onclick="alternarConcluida('${idFb}',${idLc})" style="background:rgba(138,43,226,0.1);border:1px solid rgba(138,43,226,0.2);color:#8a2be2;padding:8px;border-radius:10px;cursor:pointer;display:flex;align-items:center;">
                            <i data-lucide="${t.concluida?'rotate-ccw':'check-circle'}" style="width:16px;height:16px;"></i>
                        </button>
                        <button onclick="removerTarefa('${idFb}',${idLc})" style="background:rgba(255,68,68,0.08);border:1px solid rgba(255,68,68,0.15);color:#ff4444;padding:8px;border-radius:10px;cursor:pointer;display:flex;align-items:center;">
                            <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                        </button>
                    </div>
                </div>
                ${t.imagem ? `<img src="${t.imagem}" style="width:100%;border-radius:12px;margin-top:12px;">` : ''}
            </div>`;
        });
        html += '</div></div>';
    });

    lista.innerHTML = html;
    if (window.lucide) lucide.createIcons();
};

window.toggleGrupo = function(gId) {
    const el = document.getElementById(gId);
    const arrow = document.getElementById('arrow_' + gId);
    if (!el) return;
    const aberto = el.style.display !== 'none';
    el.style.display = aberto ? 'none' : 'block';
    if (arrow) arrow.innerText = aberto ? '→' : '↓';
};

// ADICIONAR
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
        await new Promise(res => { OneSignalDeferred.push(async OS => { playerId = OS.User.PushSubscription.token; res(); }); });
    }

    const nova = { nome, descricao:desc, dataInicio, dataFim, materia, tipo, bimestre, imagem:imagemBase64, concluida:false, usuario:userEmail, onesignal_player_id:playerId||null, criadoEm:Date.now() };

    if (userType === 'local') {
        agendaGlobal.push(nova); localStorage.setItem('dt_agenda', JSON.stringify(agendaGlobal));
    } else {
        await addDoc(collection(db,'agenda'), nova);
    }
    window.fecharModalAgenda();
    await window.buscarDadosNuvem();
    toast('✓ Atividade agendada!');
};

// REMOVER
window.removerTarefa = async function(idFb, idLc) {
    if (!confirm('Deletar esta atividade?')) return;
    const t = agendaGlobal.find(x => userType==='local' ? x.criadoEm===idLc : x.id_firebase===idFb);
    if (t?.concluida) await atualizarXPRanking(-identificarXPTarefa(t));
    if (userType === 'local') {
        agendaGlobal = agendaGlobal.filter(x=>x.criadoEm!==idLc); localStorage.setItem('dt_agenda',JSON.stringify(agendaGlobal));
    } else { await deleteDoc(doc(db,'agenda',idFb)); }
    await window.buscarDadosNuvem();
};

// ALTERNAR CONCLUÍDA
window.alternarConcluida = async function(idFb, idLc) {
    let t;
    if (userType === 'local') {
        const idx = agendaGlobal.findIndex(x=>x.criadoEm===idLc);
        if(idx!==-1){t=agendaGlobal[idx];t.concluida=!t.concluida;localStorage.setItem('dt_agenda',JSON.stringify(agendaGlobal));}
    } else {
        t = agendaGlobal.find(x=>x.id_firebase===idFb);
        if(!t) return;
        await updateDoc(doc(db,'agenda',idFb),{concluida:!t.concluida});
        t.concluida=!t.concluida;
    }
    if(t){
        await atualizarXPRanking(t.concluida ? identificarXPTarefa(t) : -identificarXPTarefa(t));
        if(t.concluida) await verificarConquistasTarefas();
    }
    renderResumo();
    window.carregarTarefas(dataSelecionada);
};

// MODAL
window.abrirModalAgendaHoje = function() {
    const hoje = getHojeLocal();
    document.getElementById('tarefa-data-inicio').value = dataSelecionada || hoje;
    document.getElementById('tarefa-data-fim').value = dataSelecionada || hoje;
    document.getElementById('modal-agenda').style.display = 'flex';
};
window.fecharModalAgenda = function() {
    document.getElementById('modal-agenda').style.display='none';
    document.getElementById('tarefa-nome').value='';
    document.getElementById('tarefa-desc').value='';
    document.getElementById('tarefa-materia').value='Geral';
    document.getElementById('tarefa-tipo').value='tarefa';
    document.getElementById('tarefa-bimestre').value='';
    document.getElementById('preview-container').innerHTML='';
    imagemBase64='';
};

window.carregarMateriasNoSelect = function() {
    const sel = document.getElementById('tarefa-materia'); if(!sel) return;
    const mats = JSON.parse(localStorage.getItem('materias_db')||localStorage.getItem('materias')||'[]');
    sel.innerHTML = '<option value="Geral">Geral / Outros</option>';
    mats.forEach(m => { if(m.nome){const o=document.createElement('option');o.value=m.nome;o.textContent=m.nome;sel.appendChild(o);} });
};

window.previewImg = function(input) {
    if(input.files?.[0]){
        const r=new FileReader();
        r.onload=e=>{imagemBase64=e.target.result;document.getElementById('preview-container').innerHTML=`<img src="${imagemBase64}" style="width:100%;border-radius:12px;margin-top:12px;">`;};
        r.readAsDataURL(input.files[0]);
    }
};

// COMPARTILHAR
window.abrirCompartilhar = function() {
    // Inclui TODAS (pendentes + concluídas) respeitando filtros ativos
    const arr = getTarefasFiltradas().sort((a,b) => {
        if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
        return new Date(a.dataFim) - new Date(b.dataFim);
    }).slice(0,12);

    const hojeStr = getHojeLocal();
    const bimLabel = filtroBimestre !== 'todos' ? BIMESTRES[filtroBimestre]?.label : '';
    const mLabel = filtroMateria !== 'todas' ? filtroMateria : '';
    const titulo = [mLabel, bimLabel].filter(Boolean).join(' • ') || 'Agenda Completa';

    const pendentes = arr.filter(t=>!t.concluida);
    const concluidas = arr.filter(t=>t.concluida);

    function buildItems(lista) {
        return lista.map(t => {
            const diff = Math.ceil((new Date(t.dataFim+'T00:00:00') - new Date(hojeStr+'T00:00:00'))/86400000);
            const cor = t.concluida ? '#00d2ff' : diff<=0 ? '#ff4444' : diff<=3 ? '#ff4444' : diff<=7 ? '#ffbb33' : '#00c851';
            const tipo = TIPOS[t.tipo]||TIPOS.tarefa;
            const bimStr = t.bimestre ? `<span style="font-size:9px;color:#333;margin-left:4px;">${t.bimestre}° BIM</span>` : '';
            const prazoStr = t.concluida
                ? `<span style="font-size:9px;color:#00d2ff;">✓ Concluída</span>`
                : `<span style="font-size:9px;color:${cor};">📅 ${formatData(t.dataFim)}</span>`;
            return `
                <div style="display:flex;align-items:flex-start;gap:8px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                    <div style="width:7px;height:7px;border-radius:50%;background:${cor};box-shadow:0 0 5px ${cor};flex-shrink:0;margin-top:5px;"></div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:700;color:${t.concluida?'#555':'white'};text-decoration:${t.concluida?'line-through':'none'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tipo.emoji} ${t.nome}</div>
                        <div style="display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap;">
                            <span style="font-size:9px;color:#8a2be2;background:rgba(138,43,226,0.1);border:1px solid rgba(138,43,226,0.15);padding:1px 7px;border-radius:20px;">${t.materia||'Geral'}</span>
                            ${bimStr}
                            ${prazoStr}
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    let html = '';
    if (pendentes.length > 0) {
        html += `<div style="font-size:9px;font-weight:800;letter-spacing:2px;color:#444;margin-bottom:6px;">PENDENTES (${pendentes.length})</div>`;
        html += buildItems(pendentes);
    }
    if (concluidas.length > 0) {
        html += `<div style="font-size:9px;font-weight:800;letter-spacing:2px;color:#444;margin:12px 0 6px;">CONCLUÍDAS (${concluidas.length})</div>`;
        html += buildItems(concluidas);
    }
    if (!html) html = '<p style="color:#333;text-align:center;padding:16px;font-size:12px;">Nenhuma atividade 🎉</p>';

    document.getElementById('share-preview').innerHTML = `
        <div style="font-size:15px;font-weight:900;color:white;margin-bottom:2px;">📚 Hub Brain</div>
        <div style="font-size:9px;color:#444;letter-spacing:2px;margin-bottom:14px;">${titulo.toUpperCase()}</div>
        ${html}
        <div style="text-align:center;margin-top:12px;font-size:9px;color:#222;letter-spacing:2px;">hubbrain.netlify.app</div>
    `;
    document.getElementById('modal-compartilhar').style.display='flex';
    if(window.lucide) lucide.createIcons();
};

window.fecharCompartilhar = function() { document.getElementById('modal-compartilhar').style.display='none'; };

window.gerarImagem = async function() {
    const el = document.getElementById('share-preview');
    try {
        const canvas = await html2canvas(el, { backgroundColor:'#0a0a0e', scale:2 });
        const a = document.createElement('a');
        a.download='agenda-hubbrain.png'; a.href=canvas.toDataURL(); a.click();
        toast('✓ Imagem salva!');
    } catch(e) { toast('Erro ao gerar imagem'); }
};

window.compartilharWpp = function() {
    const arr = getTarefasFiltradas().sort((a,b) => {
        if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
        return new Date(a.dataFim) - new Date(b.dataFim);
    });
    const hojeStr = getHojeLocal();
    const bimLabel = filtroBimestre !== 'todos' ? BIMESTRES[filtroBimestre]?.label : '';
    const mLabel = filtroMateria !== 'todas' ? filtroMateria : '';
    const titulo = [mLabel, bimLabel].filter(Boolean).join(' • ') || 'Agenda';

    let txt = `📚 *Hub Brain — ${titulo}*\n`;
    txt += `━━━━━━━━━━━━━━━\n\n`;

    const pendentes = arr.filter(t=>!t.concluida);
    const concluidas = arr.filter(t=>t.concluida);

    if (pendentes.length > 0) {
        txt += `*📌 PENDENTES (${pendentes.length})*\n`;
        pendentes.slice(0,10).forEach(t => {
            const diff = Math.ceil((new Date(t.dataFim+'T00:00:00') - new Date(hojeStr+'T00:00:00'))/86400000);
            const urgEmoji = diff<=0 ? '🔴' : diff<=3 ? '🟠' : diff<=7 ? '🟡' : '🟢';
            const tipo = TIPOS[t.tipo]||TIPOS.tarefa;
            txt += `\n${urgEmoji} ${tipo.emoji} *${t.nome}*\n`;
            txt += `   📚 ${t.materia||'Geral'}`;
            if (t.bimestre) txt += ` • ${t.bimestre}° BIM`;
            txt += `\n   📅 Prazo: ${formatData(t.dataFim)}\n`;
        });
    }

    if (concluidas.length > 0) {
        txt += `\n*✅ CONCLUÍDAS (${concluidas.length})*\n`;
        concluidas.slice(0,6).forEach(t => {
            const tipo = TIPOS[t.tipo]||TIPOS.tarefa;
            txt += `\n✓ ~${tipo.emoji} ${t.nome}~\n`;
            txt += `   📚 ${t.materia||'Geral'}`;
            if (t.bimestre) txt += ` • ${t.bimestre}° BIM`;
            txt += `\n`;
        });
    }

    txt += `\n━━━━━━━━━━━━━━━\n_Hub Brain — hubbrain.netlify.app_`;
    window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
};
