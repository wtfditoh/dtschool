/* admin-logica.js — Hub Brain · Painel do Mestre v2
   - Último acesso real + acessos hoje/total
   - Online agora (< 5min)
   - Filtros de ordenação (XP, nome, acesso, online)
   - Correções de bugs anteriores */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, updateDoc, setDoc, deleteDoc, onSnapshot, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const emailMestre = "ditoh2008@gmail.com";
if ((localStorage.getItem('dt_user_email') || "").toLowerCase() !== emailMestre) {
    window.location.replace('index.html');
}

/* ─────────── ESTADO ─────────── */
let todosUsuarios = [];
const mapaUsuarios = {};
let ordemAtual = 'xp';       // xp | nome | acesso | online | acessos
let buscaAtual = '';

/* ─────────── PATENTES ─────────── */
function getPatenteInfo(xp) {
    if (xp <= 500)  return { nome: "Novato",       emoji: "🟢", cor: "#2ecc71" };
    if (xp <= 1500) return { nome: "Estudioso",    emoji: "🔵", cor: "#3498db" };
    if (xp <= 4000) return { nome: "Veterano",     emoji: "🟣", cor: "#9b59b6" };
    if (xp <= 8000) return { nome: "Elite",        emoji: "⚡", cor: "#f1c40f" };
    return              { nome: "Lenda do Hub", emoji: "👑", cor: "#e74c3c" };
}

/* ─────────── TEMPO RELATIVO ─────────── */
function tempoRelativo(ms) {
    if (!ms) return 'nunca';
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 60) return 'agora';
    if (s < 3600) return Math.floor(s / 60) + 'min';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    if (s < 604800) return Math.floor(s / 86400) + 'd';
    const d = new Date(ms);
    return d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0');
}

function estaOnline(u) {
    if (!u.ultimoAcesso) return false;
    return (Date.now() - u.ultimoAcesso) < 5 * 60 * 1000;   // 5 minutos
}

/* ─────────── RELÓGIO ─────────── */
function iniciarRelogio() {
    const el = document.getElementById('admin-clock');
    const atualizar = () => { if (el) el.innerText = new Date().toLocaleTimeString('pt-BR'); };
    atualizar();
    setInterval(atualizar, 1000);
}

/* ─────────── MODAL PADRÃO ─────────── */
window.abrirModalAdmin = (titulo, desc, placeholder = "", callback, comInput = false) => {
    const m = document.getElementById('modal-admin');
    const input = document.getElementById('modal-input');
    document.getElementById('modal-title').innerHTML = titulo;
    document.getElementById('modal-desc').innerHTML = desc;
    input.style.display = comInput ? 'block' : 'none';
    input.value = placeholder;
    m.style.display = 'flex';
    document.getElementById('modal-confirm-btn').onclick = async () => {
        await callback(input.value);
        window.fecharModalAdmin();
    };
};
window.fecharModalAdmin = () => { document.getElementById('modal-admin').style.display = 'none'; };

/* ─────────── MODAL DETALHES ─────────── */
window.abrirDetalhesUsuario = (id) => {
    const u = mapaUsuarios[id];
    if (!u) return;

    const modal = document.getElementById('modal-usuario');
    const corpo = document.getElementById('detalhe-corpo');
    document.getElementById('detalhe-nome').innerText = u.nome || 'Sem nome';

    const patente = getPatenteInfo(u.xp || 0);
    const historico = u.historico_foco || [];
    const totalMin = historico.reduce((a, s) => a + (Number(s.minutos) || 0), 0);
    const totalHoras = Math.floor(totalMin / 60);
    const materias = u.materias || [];
    const aprovadas = materias.filter(m => (Number(m.n1) || 0) + (Number(m.n2) || 0) + (Number(m.n3) || 0) + (Number(m.n4) || 0) >= 24).length;
    const conquistasCount = (u.conquistas || []).length;

    const avatarHtml = u.fotoPerfil
        ? `<img src="${u.fotoPerfil}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid #8a2be2;">`
        : `<div style="width:64px;height:64px;border-radius:50%;background:rgba(138,43,226,0.15);border:2px solid rgba(138,43,226,0.4);display:flex;align-items:center;justify-content:center;color:#8a2be2;font-size:24px;font-weight:900;">${(u.nome || '?').charAt(0).toUpperCase()}</div>`;

    corpo.innerHTML = `
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:18px; padding:14px; background:#08080a; border-radius:16px; border:1px solid #1a1a1c;">
            ${avatarHtml}
            <div style="min-width:0; flex:1;">
                <div style="font-weight:800; font-size:14px; color:#eee; word-break:break-word;">${u.nome || 'Sem nome'}</div>
                <div style="font-size:11px; color:#555; word-break:break-all;">${u.email || u.id}</div>
                ${estaOnline(u) ? '<div style="font-size:10px; color:#00c851; font-weight:800; margin-top:4px;">● ONLINE AGORA</div>' : '<div style="font-size:10px; color:#555; font-weight:700; margin-top:4px;">visto ' + tempoRelativo(u.ultimoAcesso) + ' atrás</div>'}
            </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
            <div class="detalhe-stat"><span style="color:${patente.cor};">${patente.emoji} ${patente.nome}</span><label>PATENTE</label></div>
            <div class="detalhe-stat"><span style="color:#f1c40f;">${u.xp || 0}</span><label>XP TOTAL</label></div>
            <div class="detalhe-stat"><span style="color:#8a2be2;">${totalHoras}h ${totalMin % 60}min</span><label>HORAS FOCO</label></div>
            <div class="detalhe-stat"><span style="color:#00c851;">${aprovadas}/${materias.length}</span><label>APROVAÇÕES</label></div>
            <div class="detalhe-stat"><span style="color:#c084fc;">${conquistasCount}</span><label>CONQUISTAS</label></div>
            <div class="detalhe-stat"><span style="color:#ff9500;">${(u.meta_minutos || 0) > 0 ? Math.floor((u.meta_minutos || 0) / 60) + 'h' + ((u.meta_minutos % 60) > 0 ? (u.meta_minutos % 60) + 'min' : '') : 'N/D'}</span><label>META DIÁRIA</label></div>
            <div class="detalhe-stat"><span style="color:#00d2ff;">${u.acessosHoje || 0}</span><label>ACESSOS HOJE</label></div>
            <div class="detalhe-stat"><span style="color:#00d2ff;">${u.acessosTotal || 0}</span><label>ACESSOS TOTAL</label></div>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
            <button onclick="window.editarNome('${id}')" class="btn-acao-detalhe">✏️ Editar nome</button>
            <button onclick="window.editarXP('${id}')" class="btn-acao-detalhe">⚡ Ajustar XP</button>
            <button onclick="window.darConquista('${id}')" class="btn-acao-detalhe">🎖️ Dar conquista</button>
            <button onclick="window.enviarResetSenha('${u.email || ''}')" class="btn-acao-detalhe" style="color:#ffcc00;">🔑 Reset de senha</button>
            <button onclick="window.verMaterias('${id}')" class="btn-acao-detalhe">📚 Ver matérias</button>
            <button onclick="window.gerenciarMateriasUser('${id}')" class="btn-acao-detalhe" style="color:#ff9500;">🔄 Resetar matérias</button>
            <button onclick="window.banirUsuario('${id}')" class="btn-acao-detalhe" style="color:#ff4444;">🗑️ Banir usuário</button>
        </div>
    `;
    modal.style.display = 'flex';
};
window.fecharModalUsuario = () => { document.getElementById('modal-usuario').style.display = 'none'; };

/* ─────────── AÇÕES ─────────── */
window.enviarResetSenha = (email) => {
    window.fecharModalUsuario();
    if (!email) { window.abrirModalAdmin("ERRO", "Aluno sem e-mail cadastrado.", "", () => {}, false); return; }
    window.abrirModalAdmin("RECUPERAR CONTA", `Enviar link para:<br><b style="color:#8a2be2">${email}</b>?`, "", async () => {
        try {
            await sendPasswordResetEmail(auth, email);
            setTimeout(() => window.abrirModalAdmin("SUCESSO", "E-mail enviado!", "", () => {}, false), 400);
        } catch (e) {
            setTimeout(() => window.abrirModalAdmin("ERRO", e.message, "", () => {}, false), 400);
        }
    });
};

window.toggleManutencao = () => {
    window.abrirModalAdmin("MANUTENÇÃO", "Digite <b>LOCK</b> ou <b>OPEN</b>:", "", async (val) => {
        const cmd = val.toUpperCase();
        if (cmd === 'LOCK' || cmd === 'OPEN') {
            await setDoc(doc(db, "config", "status_sistema"), { emManutencao: (cmd === 'LOCK') });
        }
    }, true);
};

window.forçarUpdateGeral = () => {
    window.abrirModalAdmin("FORCE UPDATE", "Digite <b>SIM</b> para atualizar todos:", "", async (val) => {
        if (val.toUpperCase() === 'SIM') await setDoc(doc(db, "config", "versao_sistema"), { v: Date.now() });
    }, true);
};

window.editarNome = (id) => {
    const u = mapaUsuarios[id];
    if (!u) return;
    window.fecharModalUsuario();
    window.abrirModalAdmin("EDITAR NOME", "Novo nome:", u.nome || "", async (novo) => {
        if (novo) await updateDoc(doc(db, "notas", id), { nome: novo });
    }, true);
};

window.editarXP = (id) => {
    const u = mapaUsuarios[id];
    if (!u) return;
    window.fecharModalUsuario();
    window.abrirModalAdmin("AJUSTAR XP", "Novo valor de XP:", u.xp || 0, async (novoXP) => {
        if (novoXP !== '') await updateDoc(doc(db, "notas", id), { xp: Number(novoXP) });
    }, true);
};

window.darConquista = (id) => {
    window.fecharModalUsuario();
    window.abrirModalAdmin("DAR CONQUISTA", "ID da conquista (ex: em_chamas):", "", async (conquista) => {
        if (conquista) await updateDoc(doc(db, "notas", id), { conquistas: arrayUnion(conquista) });
    }, true);
};

window.verMaterias = (id) => {
    window.fecharModalUsuario();
    const usuario = mapaUsuarios[id];
    if (!usuario) return;
    const materias = usuario.materias || [];
    const lista = materias.length === 0 ? 'Nenhuma matéria cadastrada.' :
        materias.map(m => {
            const soma = (Number(m.n1) || 0) + (Number(m.n2) || 0) + (Number(m.n3) || 0) + (Number(m.n4) || 0);
            const status = soma >= 24 ? '✅' : '❌';
            return `${status} <b>${m.nome}</b> — ${soma.toFixed(1)}/24`;
        }).join('<br>');
    window.abrirModalAdmin("MATÉRIAS", lista, "", () => {}, false);
};

window.gerenciarMateriasUser = (id) => {
    window.fecharModalUsuario();
    window.abrirModalAdmin("LIMPAR DADOS", "Digite <b>RESETAR</b>:", "", async (val) => {
        if (val === 'RESETAR') await updateDoc(doc(db, "notas", id), { materias: [], xp: 0 });
    }, true);
};

window.banirUsuario = (id) => {
    window.fecharModalUsuario();
    window.abrirModalAdmin("BANIR", `Apagar <b>${id}</b>? Essa ação é irreversível.`, "", async () => {
        await deleteDoc(doc(db, "notas", id));
    });
};

/* ─────────── PUSH ─────────── */
window.enviarPushGlobal = async () => {
    const titulo = document.getElementById('push-titulo').value.trim();
    const mensagem = document.getElementById('push-mensagem').value.trim();
    if (!titulo || !mensagem) {
        window.abrirModalAdmin("AVISO", "Preencha título e mensagem!", "", () => {}, false);
        return;
    }
    window.abrirModalAdmin("CONFIRMAR PUSH", `Enviar "<b>${titulo}</b>" para todos os alunos?`, "", async () => {
        try {
            const response = await fetch("/.netlify/functions/push-global", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer hubbrain-admin-2024" },
                body: JSON.stringify({ titulo, mensagem })
            });
            const data = await response.json();
            if (data.id) {
                document.getElementById('push-titulo').value = '';
                document.getElementById('push-mensagem').value = '';
                setTimeout(() => window.abrirModalAdmin("SUCESSO", `Push enviado para ${data.recipients || 'todos'} alunos!`, "", () => {}, false), 400);
            } else {
                setTimeout(() => window.abrirModalAdmin("ERRO", JSON.stringify(data.errors || data), "", () => {}, false), 400);
            }
        } catch (e) {
            setTimeout(() => window.abrirModalAdmin("ERRO", e.message, "", () => {}, false), 400);
        }
    });
};

/* ─────────── MURAL ─────────── */
window.postarAviso = async () => {
    const t = document.getElementById('aviso-texto');
    const radios = document.getElementsByName('cor-aviso');
    let corSelecionada = "purple";
    for (const r of radios) { if (r.checked) { corSelecionada = r.value; break; } }
    if (!t || !t.value.trim()) {
        window.abrirModalAdmin("AVISO", "Escreva uma mensagem.", "", () => {}, false);
        return;
    }
    try {
        await setDoc(doc(db, "config", "mural"), {
            texto: t.value.trim(), autor: "Ditoh", cor: corSelecionada,
            data: new Date().toLocaleDateString('pt-BR'), ativo: true
        });
        t.value = "";
        window.abrirModalAdmin("SUCESSO", "Mural atualizado!", "", () => {}, false);
    } catch (e) {
        window.abrirModalAdmin("ERRO", "Falha ao atualizar.", "", () => {}, false);
    }
};

window.removerAviso = async () => {
    try {
        await setDoc(doc(db, "config", "mural"), {
            texto: "Nenhum aviso no momento.", autor: "Sistema", cor: "purple", ativo: false
        });
        window.abrirModalAdmin("SISTEMA", "Mural limpo!", "", () => {}, false);
    } catch (e) { console.error(e); }
};

/* ─────────── FILTRO / ORDENAÇÃO ─────────── */
window.setOrdem = (ordem) => {
    ordemAtual = ordem;
    document.querySelectorAll('.ordem-btn').forEach(b => {
        b.classList.toggle('on', b.dataset.ordem === ordem);
    });
    aplicarFiltros();
};

window.filtrarUsuarios = () => {
    buscaAtual = (document.getElementById('busca-usuario').value || '').toLowerCase();
    aplicarFiltros();
};

function aplicarFiltros() {
    let lista = todosUsuarios.slice();

    if (buscaAtual) {
        lista = lista.filter(u =>
            (u.nome || '').toLowerCase().includes(buscaAtual) ||
            (u.email || '').toLowerCase().includes(buscaAtual) ||
            (u.id || '').toLowerCase().includes(buscaAtual)
        );
    }

    if (ordemAtual === 'xp') lista.sort((a, b) => (b.xp || 0) - (a.xp || 0));
    else if (ordemAtual === 'nome') lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    else if (ordemAtual === 'acesso') lista.sort((a, b) => (b.ultimoAcesso || 0) - (a.ultimoAcesso || 0));
    else if (ordemAtual === 'online') lista.sort((a, b) => (estaOnline(b) ? 1 : 0) - (estaOnline(a) ? 1 : 0) || (b.ultimoAcesso || 0) - (a.ultimoAcesso || 0));
    else if (ordemAtual === 'acessos') lista.sort((a, b) => (b.acessosTotal || 0) - (a.acessosTotal || 0));

    renderizarLista(lista);
}

/* ─────────── RENDERIZAR ─────────── */
function renderizarLista(usuarios) {
    const lista = document.getElementById('lista-usuarios-admin');
    const contador = document.getElementById('contador-usuarios');
    if (contador) contador.innerText = `${usuarios.length} aluno(s)`;

    if (usuarios.length === 0) {
        lista.innerHTML = `<div style="text-align:center; color:#444; padding:40px; font-size:12px;">Nenhum aluno encontrado</div>`;
        return;
    }

    lista.innerHTML = usuarios.map((u, idx) => {
        const patente = getPatenteInfo(u.xp || 0);
        const historico = u.historico_foco || [];
        const totalMin = historico.reduce((a, s) => a + (Number(s.minutos) || 0), 0);
        const conquistasCount = (u.conquistas || []).length;
        const online = estaOnline(u);

        const avatarHtml = u.fotoPerfil
            ? `<img src="${u.fotoPerfil}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid ${online ? '#00c851' : 'rgba(138,43,226,0.4)'};flex-shrink:0;">`
            : `<div style="width:40px;height:40px;border-radius:50%;background:rgba(138,43,226,0.15);border:2px solid ${online ? '#00c851' : 'rgba(138,43,226,0.4)'};display:flex;align-items:center;justify-content:center;color:#8a2be2;font-size:16px;font-weight:900;flex-shrink:0;">${(u.nome || '?').charAt(0).toUpperCase()}</div>`;

        const onlineDot = online ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#00c851;box-shadow:0 0 8px #00c851;margin-left:6px;vertical-align:middle;"></span>' : '';

        return `
        <div class="user-row" onclick="window.abrirDetalhesUsuario('${u.id}')">
            <div class="u-avatar-rank">#${idx + 1}</div>
            ${avatarHtml}
            <div class="u-meta">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span class="u-name">${u.nome || 'Sem nome'}${onlineDot}</span>
                    <span style="font-size:10px; color:${patente.cor};">${patente.emoji} ${patente.nome}</span>
                </div>
                <span class="u-email">${u.email || u.id}</span>
                <div style="display:flex; gap:6px; margin-top:4px; flex-wrap:wrap;">
                    <div class="u-xp-box">${u.xp || 0} XP</div>
                    <div class="u-tag">${Math.floor(totalMin / 60)}h foco</div>
                    <div class="u-tag">${(u.materias || []).length} matérias</div>
                    <div class="u-tag">👁 ${u.acessosTotal || 0}</div>
                    <div class="u-tag" style="color:${online ? '#00c851' : '#666'};">${tempoRelativo(u.ultimoAcesso)}</div>
                </div>
            </div>
            <i data-lucide="chevron-right" style="color:#333; width:16px; flex-shrink:0;"></i>
        </div>`;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

/* ─────────── PAINEL ─────────── */
function iniciarPainel() {
    const ref = collection(db, "notas");

    onSnapshot(ref, (snap) => {
        todosUsuarios = [];
        snap.forEach(d => {
            const data = d.data();
            const u = { id: d.id, email: data.email || d.id, ...data };
            todosUsuarios.push(u);
            mapaUsuarios[d.id] = u;
        });

        /* Stats */
        const totalUsers = todosUsuarios.length;
        const onlineAgora = todosUsuarios.filter(estaOnline).length;
        const totalXP = todosUsuarios.reduce((a, u) => a + (u.xp || 0), 0);
        const totalMat = todosUsuarios.reduce((a, u) => a + (u.materias || []).length, 0);
        const totalMin = todosUsuarios.reduce((a, u) => a + (u.historico_foco || []).reduce((b, s) => b + (Number(s.minutos) || 0), 0), 0);
        const totalConquistas = todosUsuarios.reduce((a, u) => a + (u.conquistas || []).length, 0);

        document.getElementById('total-users').innerText = totalUsers;
        document.getElementById('avg-xp').innerText = totalUsers ? Math.round(totalXP / totalUsers) : 0;
        document.getElementById('total-materias').innerText = totalMat;
        document.getElementById('total-horas').innerText = Math.floor(totalMin / 60) + 'h';
        const elOn = document.getElementById('total-online');
        if (elOn) elOn.innerText = onlineAgora;
        document.getElementById('total-conquistas').innerText = totalConquistas;

        aplicarFiltros();

        /* Logs — ordenados por último acesso real */
        const logsContainer = document.getElementById('logs-container');
        if (logsContainer) {
            const ordenado = [...todosUsuarios].filter(u => u.ultimoAcesso).sort((a, b) => (b.ultimoAcesso || 0) - (a.ultimoAcesso || 0));
            logsContainer.innerHTML = ordenado.slice(0, 15).map(u => {
                const online = estaOnline(u);
                const patente = getPatenteInfo(u.xp || 0);
                return `<div class="log-entry">
                    <span style="color:${online ? '#00c851' : '#444'};">●</span>
                    ${patente.emoji} <b>${u.nome || '?'}</b>
                    <span style="color:#333;">— ${tempoRelativo(u.ultimoAcesso)} atrás · ${u.acessosHoje || 0} hoje</span>
                </div>`;
            }).join('');
            if (ordenado.length === 0) {
                logsContainer.innerHTML = '<div style="color:#333; text-align:center; padding:20px; font-size:11px;">Nenhum acesso registrado ainda</div>';
            }
        }
    }, (err) => {
        console.error('[admin]', err);
        const lista = document.getElementById('lista-usuarios-admin');
        if (lista) lista.innerHTML = `<div style="text-align:center; color:#ff4444; padding:40px; font-size:12px;">Erro: ${err.message}</div>`;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    iniciarPainel();
    iniciarRelogio();
    if (window.lucide) lucide.createIcons();
});
