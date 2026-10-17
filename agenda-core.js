/* agenda-core.js — Hub Brain · Lógica pura da Agenda
   Sem DOM, sem Firestore. Todas as funções que o agenda-logica.js importa. */

/* ═══════════════ CONSTANTES ═══════════════ */

export const TIPOS = {
    tarefa:   { label: 'Tarefa',   emoji: '📝', xp: 15, minutos: 25 },
    prova:    { label: 'Prova',    emoji: '🎯', xp: 40, minutos: 50 },
    trabalho: { label: 'Trabalho', emoji: '📋', xp: 30, minutos: 40 },
    revisao:  { label: 'Revisão',  emoji: '🔄', xp: 20, minutos: 30 },
    projeto:  { label: 'Projeto',  emoji: '💡', xp: 35, minutos: 45 }
};

export const NOMES_DIA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const BIMESTRES = {
    '1': { label: '1º Bimestre' },
    '2': { label: '2º Bimestre' },
    '3': { label: '3º Bimestre' },
    '4': { label: '4º Bimestre' }
};

const PALETA = ['#8a2be2', '#00d2ff', '#00e5a0', '#ff8c32', '#ff4455',
                '#c084fc', '#ffbb33', '#3b82f6', '#ec4899', '#10b981'];

export function corMateria(nome) {
    if (!nome || nome === 'Geral') return '#8a2be2';
    let hash = 0;
    for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) | 0;
    return PALETA[Math.abs(hash) % PALETA.length];
}

/* ═══════════════ DATAS ═══════════════ */

export function dataLocal(d) {
    const dt = d instanceof Date ? d : new Date();
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const dia = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
}

export function diaDaSemana(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
}

export function formatCurto(iso) {
    if (!iso) return '';
    const p = iso.split('-');
    return p[2] + '/' + p[1];
}

export function somarDias(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + n);
    return dataLocal(dt);
}

export function diffDias(a, b) {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    const ta = new Date(ay, am - 1, ad).getTime();
    const tb = new Date(by, bm - 1, bd).getTime();
    return Math.round((ta - tb) / 86400000);
}

export function diasDaSemana(ref) {
    const domingo = somarDias(ref, -diaDaSemana(ref));
    return Array.from({ length: 7 }, (_, i) => somarDias(domingo, i));
}

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const MESES_CURTO = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

export function rotuloDiaLongo(iso) {
    const p = iso.split('-').map(Number);
    const nomes = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
    return `${nomes[diaDaSemana(iso)]}, ${p[2]} de ${MESES[p[1] - 1]}`;
}

export function rotuloSemana(ref) {
    const dias = diasDaSemana(ref);
    const a = dias[0].split('-').map(Number);
    const b = dias[6].split('-').map(Number);
    if (a[1] === b[1]) return `${a[2]} – ${b[2]} de ${MESES_CURTO[a[1] - 1]}`;
    return `${a[2]} ${MESES_CURTO[a[1] - 1]} – ${b[2]} ${MESES_CURTO[b[1] - 1]}`;
}

/* ═══════════════ URGÊNCIA ═══════════════ */

export function urgencia(t, hoje) {
    if (t.concluida) return { nivel: 'feita', emoji: '✓', rotulo: 'Concluída', diff: 999 };
    const d = diffDias(t.dataFim, hoje);
    if (d < 0) {
        const n = -d;
        return { nivel: 'critica', emoji: '🔴', rotulo: n === 1 ? 'Atrasada 1 dia' : `Atrasada ${n} dias`, diff: d };
    }
    if (d === 0) return { nivel: 'critica', emoji: '🔴', rotulo: 'Hoje', diff: 0 };
    if (d === 1) return { nivel: 'alta', emoji: '🟠', rotulo: 'Amanhã', diff: 1 };
    if (d <= 3) return { nivel: 'alta', emoji: '🟠', rotulo: `Em ${d} dias`, diff: d };
    if (d <= 7) return { nivel: 'media', emoji: '🟡', rotulo: `Em ${d} dias`, diff: d };
    return { nivel: 'baixa', emoji: '🟢', rotulo: `Em ${d} dias`, diff: d };
}

/* ═══════════════ TAREFA ═══════════════ */

export function minutosFoco(t) {
    return (TIPOS[t.tipo] || TIPOS.tarefa).minutos;
}

export function moverDias(t, n) {
    return {
        dataInicio: somarDias(t.dataInicio, n),
        dataFim: somarDias(t.dataFim, n)
    };
}

export function reagendarPara(t, novoFim) {
    if (t.dataInicio === t.dataFim) return { dataInicio: novoFim, dataFim: novoFim };
    const dur = diffDias(t.dataFim, t.dataInicio);
    return { dataInicio: somarDias(novoFim, -dur), dataFim: novoFim };
}

export function concluidaNoDia(t, dia) {
    if (!t.concluida || !t.concluidaEm) return false;
    return dataLocal(new Date(t.concluidaEm)) === dia;
}

/* ═══════════════ FILTROS ═══════════════ */

export function tarefasDoDia(tarefas, dia) {
    return tarefas.filter(t => {
        if (t.concluida && concluidaNoDia(t, dia)) return true;
        if (t.dataInicio <= dia && t.dataFim >= dia) return true;
        return false;
    }).sort((a, b) => {
        if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
        if (a.dataFim !== b.dataFim) return a.dataFim < b.dataFim ? -1 : 1;
        return (TIPOS[b.tipo]?.xp || 0) - (TIPOS[a.tipo]?.xp || 0);
    });
}

export function filtrarTudo(tarefas, filtro, hoje) {
    let arr = tarefas.slice();
    const st = filtro.status || 'todas';
    if (st === 'pendentes') arr = arr.filter(t => !t.concluida);
    else if (st === 'atrasadas') arr = arr.filter(t => !t.concluida && t.dataFim < hoje);
    else if (st === 'concluidas') arr = arr.filter(t => t.concluida);

    if (filtro.materia && filtro.materia !== 'todas') {
        arr = arr.filter(t => (t.materia || 'Geral') === filtro.materia);
    }
    if (filtro.bim && filtro.bim !== 'todos') {
        arr = arr.filter(t => String(t.bimestre || '') === String(filtro.bim));
    }
    return arr;
}

export function agruparPorMateria(lista) {
    const mapa = new Map();
    lista.forEach(t => {
        const m = t.materia || 'Geral';
        if (!mapa.has(m)) mapa.set(m, []);
        mapa.get(m).push(t);
    });
    const grupos = [...mapa.entries()].map(([nome, tarefas]) => {
        tarefas.sort((a, b) => {
            if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
            if (a.dataFim !== b.dataFim) return a.dataFim < b.dataFim ? -1 : 1;
            return 0;
        });
        return {
            nome,
            tarefas,
            pendentes: tarefas.filter(t => !t.concluida).length,
            total: tarefas.length
        };
    });
    grupos.sort((a, b) => b.pendentes - a.pendentes || a.nome.localeCompare(b.nome));
    return grupos;
}

export function vencidasOuHoje(tarefas, hoje) {
    return tarefas.filter(t => !t.concluida && t.dataFim <= hoje);
}

/* ═══════════════ RESUMO DO DIA ═══════════════ */

export function resumoDoDia(tarefas, hoje) {
    const doDia = tarefas.filter(t => {
        if (t.concluida && concluidaNoDia(t, hoje)) return true;
        if (t.dataInicio <= hoje && t.dataFim >= hoje) return true;
        return false;
    });
    const feitas = doDia.filter(t => t.concluida).length;
    const pendentes = doDia.length - feitas;
    const atrasadas = tarefas.filter(t => !t.concluida && t.dataFim < hoje);
    const pct = doDia.length ? Math.round(feitas / doDia.length * 100) : 0;
    return { total: doDia.length, feitas, pendentes, pct, atrasadas, doDia };
}

/* ═══════════════ PRIORIDADE INTELIGENTE ═══════════════ */

export function escolherPrioridade(tarefas, hoje) {
    const pend = tarefas.filter(t => !t.concluida);
    if (!pend.length) return null;

    const score = (t) => {
        const d = diffDias(t.dataFim, hoje);
        let s = 0;
        if (d < 0) s += 1000 + (-d) * 50;
        else if (d === 0) s += 800;
        else if (d === 1) s += 500;
        else if (d <= 3) s += 300;
        else if (d <= 7) s += 150;
        else s += Math.max(0, 100 - d);
        s += (TIPOS[t.tipo]?.xp || 15) * 2;
        return s;
    };

    const t = pend.slice().sort((a, b) => score(b) - score(a))[0];
    const u = urgencia(t, hoje);

    let motivo;
    if (u.diff < 0) motivo = `Atrasada ${-u.diff} dia${-u.diff === 1 ? '' : 's'}. Melhor resolver agora.`;
    else if (u.diff === 0) motivo = t.tipo === 'prova' ? 'É hoje. Foco total.' : 'Vence hoje. Um passo de cada vez.';
    else if (u.diff === 1) motivo = t.tipo === 'prova' ? 'Prova amanhã — uma revisão hoje ajuda demais.' : 'Vence amanhã. Adianta agora.';
    else if (u.diff <= 3) motivo = `Prazo em ${u.diff} dias. Melhor não deixar pra depois.`;
    else motivo = 'A pendência mais próxima. Dá pra começar sem pressa.';

    return { t, motivo, diff: u.diff };
}

/* ═══════════════ PRÓXIMAS ═══════════════ */

export function proximas(tarefas, hoje, excluirId, n, idDe) {
    const pend = tarefas
        .filter(t => !t.concluida)
        .filter(t => !excluirId || idDe(t) !== excluirId)
        .sort((a, b) => {
            const da = diffDias(a.dataFim, hoje);
            const db = diffDias(b.dataFim, hoje);
            if (da !== db) return da - db;
            return (TIPOS[b.tipo]?.xp || 15) - (TIPOS[a.tipo]?.xp || 15);
        });
    return pend.slice(0, n).map(t => ({ t }));
}

/* ═══════════════ STREAK ═══════════════ */

export function calcularStreak(tarefas, hoje) {
    const set = new Set();
    tarefas.forEach(t => {
        if (t.concluida && t.concluidaEm) set.add(dataLocal(new Date(t.concluidaEm)));
    });
    let streak = 0;
    let d = hoje;
    if (!set.has(d)) d = somarDias(d, -1);
    while (set.has(d)) {
        streak++;
        d = somarDias(d, -1);
    }
    return streak;
}

/* ═══════════════ SUGESTÕES ═══════════════ */

export function gerarSugestoes({ todas, hoje, streak, concluidasHoje }) {
    const sugestoes = [];
    const pend = todas.filter(t => !t.concluida);

    // 1) matéria com mais pendências
    const cont = {};
    pend.forEach(t => { const m = t.materia || 'Geral'; cont[m] = (cont[m] || 0) + 1; });
    const top = Object.entries(cont).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 3) {
        sugestoes.push({
            emoji: '📚',
            titulo: `${top[0]} pede atenção`,
            texto: `${top[1]} pendências nessa matéria. Que tal encarar uma agora?`,
            acao: { tipo: 'focar', materia: top[0], minutos: 25, rotulo: '▶ Focar' }
        });
    }

    // 2) prova próxima
    const prova = pend.find(t => t.tipo === 'prova' && diffDias(t.dataFim, hoje) >= 0 && diffDias(t.dataFim, hoje) <= 7);
    if (prova) {
        const d = diffDias(prova.dataFim, hoje);
        sugestoes.push({
            emoji: '🎯',
            titulo: `Prova de ${prova.materia || 'Geral'}`,
            texto: d === 0 ? 'É hoje! Vai com fé.' : `Em ${d} dia${d === 1 ? '' : 's'}. Revisão ativa rende mais que releitura.`,
            acao: { tipo: 'focar', materia: prova.materia || 'Geral', minutos: 50, rotulo: '▶ Estudar' }
        });
    }

    // 3) atrasadas antigas (sem ação — usuário usa o card de atrasadas)
    const antigas = pend.filter(t => diffDias(t.dataFim, hoje) <= -3);
    if (antigas.length) {
        sugestoes.push({
            emoji: '⚠️',
            titulo: 'Prazos vencidos',
            texto: `${antigas.length} tarefa${antigas.length === 1 ? '' : 's'} atrasada${antigas.length === 1 ? '' : 's'} há mais de 3 dias. Reagende ou conclua.`
        });
    }

    // 4) streak parado
    if (streak === 0 && !concluidasHoje && pend.length) {
        sugestoes.push({
            emoji: '🔥',
            titulo: 'Comece a sequência',
            texto: 'Você ainda não concluiu nada hoje. Uma tarefa pequena já reativa o streak.',
            acao: { tipo: 'rapido', rotulo: 'Abrir' }
        });
    }

    return sugestoes.slice(0, 3);
}

/* ═══════════════ "+ RÁPIDO" — INTERPRETAÇÃO ═══════════════ */

const DIAS_TXT = {
    'dom': 0, 'domingo': 0,
    'seg': 1, 'segunda': 1,
    'ter': 2, 'terca': 2,
    'qua': 3, 'quarta': 3,
    'qui': 4, 'quinta': 4,
    'sex': 5, 'sexta': 5,
    'sab': 6, 'sabado': 6
};

const TIPO_KW = [
    { palavras: ['prova', 'teste', 'exame', 'avaliacao'], tipo: 'prova' },
    { palavras: ['trabalho', 'trab'], tipo: 'trabalho' },
    { palavras: ['revisao', 'revisar', 'estudar', 'estudo'], tipo: 'revisao' },
    { palavras: ['projeto', 'proj'], tipo: 'projeto' },
    { palavras: ['tarefa', 'dever', 'exercicio', 'licao', 'atividade'], tipo: 'tarefa' }
];

function normalizar(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function interpretarRapido(texto, ctx) {
    const hoje = ctx.hoje;
    const materias = ctx.materias || [];
    const orig = String(texto || '').trim();
    if (!orig) return { nome: '', data: null, tipo: null, materia: null, descricao: null };

    const norm = normalizar(orig);
    const remover = new Set();

    let data = null, tipo = null, materia = null;

    // ─── data dd/mm ───
    const mDM = norm.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (mDM) {
        const d = parseInt(mDM[1]), mo = parseInt(mDM[2]);
        const anoAtual = parseInt(hoje.slice(0, 4));
        let ano = mDM[3] ? parseInt(mDM[3]) : anoAtual;
        if (ano < 100) ano += 2000;
        if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
            data = `${ano}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            remover.add(mDM[0]);
        }
    }

    // ─── hoje / amanhã / depois de amanhã / em X dias / dia da semana ───
    if (!data) {
        if (/\bhoje\b/.test(norm)) { data = hoje; remover.add('hoje'); }
        else if (/\bdepois de amanha\b/.test(norm)) {
            data = somarDias(hoje, 2);
            remover.add('depois'); remover.add('de'); remover.add('amanha');
        }
        else if (/\bamanha\b/.test(norm)) { data = somarDias(hoje, 1); remover.add('amanha'); }
        else {
            const mE = norm.match(/\bem (\d{1,3}) dias?\b/);
            if (mE) {
                data = somarDias(hoje, parseInt(mE[1]));
                mE[0].split(/\s+/).forEach(w => remover.add(w));
            } else {
                const dowHoje = diaDaSemana(hoje);
                for (const k of Object.keys(DIAS_TXT)) {
                    if (new RegExp('\\b' + k + '\\b').test(norm)) {
                        let delta = DIAS_TXT[k] - dowHoje;
                        if (delta <= 0) delta += 7;
                        data = somarDias(hoje, delta);
                        remover.add(k);
                        break;
                    }
                }
            }
        }
    }

    // ─── tipo ───
    for (const { palavras: ps, tipo: t } of TIPO_KW) {
        let ok = false;
        for (const p of ps) {
            if (new RegExp('\\b' + normalizar(p) + '\\b').test(norm)) {
                tipo = t;
                remover.add(normalizar(p));
                ok = true;
                break;
            }
        }
        if (ok) break;
    }

    // ─── matéria (match exato ou prefixo 3+) ───
    const palavrasNorm = [...new Set(norm.split(/\s+/).filter(Boolean))];
    for (const p of palavrasNorm) {
        if (p.length < 3 || remover.has(p)) continue;
        for (const m of materias) {
            const nm = normalizar(m).replace(/\s+/g, '');
            const np = p.replace(/\s+/g, '');
            if (nm === np || (np.length >= 3 && nm.startsWith(np))) {
                materia = m;
                remover.add(p);
                break;
            }
        }
        if (materia) break;
    }

    // ─── nome & descricao: heurística local ───
    let nomeFinal = orig
        .split(/\s+/)
        .filter(p => p && !remover.has(normalizar(p)))
        .join(' ')
        .trim();

    let descricao = '';
    // Se sobrou muita coisa e tem vírgula, separa o título do detalhe
    if (nomeFinal.includes(',')) {
        const partes = nomeFinal.split(',');
        nomeFinal = partes[0].trim();
        descricao = partes.slice(1).join(',').trim();
    }

    let nome;
    if (!nomeFinal) {
        const tipoLabel = (TIPOS[tipo || 'tarefa'] || TIPOS.tarefa).label;
        nome = tipoLabel + ' de ' + (materia || 'Geral');
    } else {
        nome = nomeFinal.charAt(0).toUpperCase() + nomeFinal.slice(1);
    }

    return { nome, data, tipo, materia, descricao: descricao || null };
}

/* ═══════════════ LEMBRETE DAS 21h ═══════════════ */

export function jaPassouDas21(dt) {
    return (dt || new Date()).getHours() >= 21;
}

export function resumoParaTags(tarefas, hoje) {
    const pend = tarefas.filter(t => !t.concluida && t.dataFim <= hoje);
    const n = pend.length;
    return {
        dia: hoje,
        pendentes: n,
        tagN: String(Math.min(n, 20))
    };
}

/* ═══════════════ FUNÇÕES PARA O "ADICIONAR RÁPIDO" ═══════════════ */

export function capitalizar(texto) {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function promptRapidoIA(texto, ctx) {
    return [
        'Você organiza tarefas de um aluno brasileiro.',
        'Hoje é ' + ctx.hoje + '.',
        (ctx.materias && ctx.materias.length) ? 'Matérias disponíveis: ' + ctx.materias.join(', ') + '.' : '',
        'Analise a frase abaixo e extraia os campos.',
        'Responda SOMENTE com JSON válido no formato:',
        '{"nome":"título curto","descricao":"detalhes ou vazio","data":"AAAA-MM-DD","tipo":"tarefa|prova|trabalho|revisao|projeto","materia":"nome ou Geral"}',
        'Regras:',
        '- nome: frase CURTA (máx 5 palavras) apenas com o título principal. Ex: "Prova de Matemática".',
        '- descricao: se a frase tiver detalhes extras (o que estudar, páginas, capítulos, instruções), coloque AQUI. Se não tiver, deixe vazio "".',
        '- data no formato AAAA-MM-DD. Se não mencionar, use null.',
        '- tipo: use "tarefa" se não mencionar nenhum.',
        '- materia: use o nome exato da lista acima. Se não souber, use "Geral".',
        '',
        'FRASE: "' + texto + '"'
    ].filter(Boolean).join('\n');
}

const TIPOS_VALIDOS = ['tarefa', 'prova', 'trabalho', 'revisao', 'projeto'];

export function normalizarRespostaIA(dado, ctx) {
    if (!dado || typeof dado !== 'object') return null;
    const out = {};
    if (typeof dado.nome === 'string' && dado.nome.trim()) out.nome = dado.nome.trim();
    if (typeof dado.descricao === 'string' && dado.descricao.trim()) out.descricao = dado.descricao.trim();
    if (typeof dado.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dado.data)) out.data = dado.data;
    if (typeof dado.tipo === 'string' && TIPOS_VALIDOS.indexOf(dado.tipo) !== -1) out.tipo = dado.tipo;
    if (typeof dado.materia === 'string' && dado.materia.trim()) {
        if (dado.materia === 'Geral') out.materia = 'Geral';
        else if (ctx.materias && ctx.materias.indexOf(dado.materia) !== -1) out.materia = dado.materia;
    }
    return Object.keys(out).length ? out : null;
}

export function mesclarInterpretacao(local, ia) {
    if (!ia) return local;
    return {
        nome: ia.nome || local.nome,
        descricao: ia.descricao || local.descricao,
        data: ia.data || local.data,
        tipo: ia.tipo || local.tipo,
        materia: ia.materia || local.materia
    };
}
