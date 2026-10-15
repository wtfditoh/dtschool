/* boletim-core.js — regras PURAS do Boletim (sem DOM). Módulo ES, testável em Node.

   Uma regra só para tudo (a mesma da aba Notas: soma mínima = média × nº de períodos):
     APROVADO     soma já garante a média mínima
     EM CURSO     ainda dá para chegar lá (e mostra quanto precisa por período)
     RECUPERAÇÃO  não fecha a média direto, mas a média das notas está entre o piso (4) e a mínima (6)
     REPROVADO    não fecha e a média está abaixo do piso
   O selo da folha usa a MESMA regra (pior caso entre as matérias), então nada se contradiz. */

export const SERIES = {
  '6ef': '6º Ano EF', '7ef': '7º Ano EF', '8ef': '8º Ano EF', '9ef': '9º Ano EF',
  '1em': '1º Ano EM', '2em': '2º Ano EM', '3em': '3º Ano EM', 'fac': 'Faculdade'
};

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n, casas) => (n === null || n === undefined || isNaN(n) ? '—' : Number(n).toFixed(casas == null ? 1 : casas));

export function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return isFinite(n) ? n : null;
}
export function getNotas(m, np) {
  const out = [];
  for (let i = 1; i <= np; i++) out.push(num(m && m['n' + i]));
  return out;
}
export function mediaDe(notas) {
  const v = notas.filter((n) => n !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
const recMinDe = (cfg) => (cfg.recMin != null ? cfg.recMin : Math.min(4, cfg.media));

/** 'boa' (≥ média) · 'media' (entre o piso e a média) · 'baixa' · 'vazia' */
export function nivel(n, cfg) {
  if (n === null || n === undefined || isNaN(n)) return 'vazia';
  return n >= cfg.media ? 'boa' : n >= recMinDe(cfg) ? 'media' : 'baixa';
}

const unidade = (cfg) => {
  const u = String((cfg.labels && cfg.labels[0]) || '').split(' ')[1] || 'BIM';
  return ({ BIM: ['bimestre', 'bimestres'], TRI: ['trimestre', 'trimestres'], SEM: ['semestre', 'semestres'] })[u] || ['período', 'períodos'];
};

/** Situação de UMA matéria no ano (visão "média final"). */
export function situacaoMateria(notas, cfg) {
  const np = notas.length;
  const validas = notas.filter((n) => n !== null);
  const media = mediaDe(notas);
  if (!validas.length) return { cls: 'sem', txt: 'SEM NOTA', dica: '', media: null, soma: 0, faltam: np };

  const soma = validas.reduce((a, b) => a + b, 0);
  const faltam = np - validas.length;
  const somaMin = cfg.media * np;
  const base = { media, soma, faltam };

  if (soma >= somaMin - 1e-9) return { ...base, cls: 'aprovado', txt: 'APROVADO', dica: '' };

  if (faltam > 0) {
    const precisa = (somaMin - soma) / faltam;
    if (precisa <= cfg.notaMax + 1e-9) {
      const x = Math.ceil(precisa * 10 - 1e-9) / 10;
      const [un, pl] = unidade(cfg);
      const proximo = cfg.labels ? cfg.labels[np - faltam] : '';
      return { ...base, cls: 'em-curso', txt: 'EM CURSO', dica: faltam === 1 ? 'Precisa de ' + fmt(x) + (proximo ? ' no ' + proximo : '') : 'Precisa de ' + fmt(x) + ' por ' + un + ' (faltam ' + faltam + ' ' + pl + ')' };
    }
  }
  // não fecha a média direto: recuperação se a média das notas ainda está acima do piso
  if (media >= recMinDe(cfg) - 1e-9) return { ...base, cls: 'recuperacao', txt: 'RECUPERAÇÃO', dica: 'Média ' + fmt(media) + ' · abaixo de ' + fmt(cfg.media) };
  return { ...base, cls: 'reprovado', txt: 'REPROVADO', dica: 'Média ' + fmt(media) + ' · abaixo de ' + fmt(recMinDe(cfg)) };
}

/** Situação de uma NOTA de um período (visão por bimestre): ≥ média aprovado · piso–média recuperação · abaixo reprovado. */
export function situacaoNota(n, cfg) {
  if (n === null || n === undefined || isNaN(n)) return { cls: 'sem', txt: '—' };
  if (n >= cfg.media) return { cls: 'aprovado', txt: 'APROVADO' };
  if (n >= recMinDe(cfg)) return { cls: 'recuperacao', txt: 'RECUPERAÇÃO' };
  return { cls: 'reprovado', txt: 'REPROVADO' };
}

/** aba: 'final' ou número do período (1..np) */
export function montarLinhas(materias, cfg, aba) {
  const np = cfg.numPeriodos;
  return (materias || []).filter((m) => m && m.nome).map((m) => {
    const notas = getNotas(m, np);
    const media = mediaDe(notas);
    if (aba === 'final') {
      const sit = situacaoMateria(notas, cfg);
      return { nome: m.nome, notas, media, nivel: nivel(media, cfg), sit };
    }
    const n = notas[aba - 1];
    return { nome: m.nome, notas, media: n, nivel: nivel(n, cfg), sit: situacaoNota(n, cfg) };
  });
}

/** Resumo + selo da folha. Na visão "final" o selo é o pior caso entre as matérias. */
export function resumo(linhas, cfg, aba) {
  const comNota = linhas.filter((l) => l.media !== null);
  const mediaGeral = comNota.length ? comNota.reduce((a, l) => a + l.media, 0) / comNota.length : null;
  const cont = { aprovado: 0, 'em-curso': 0, recuperacao: 0, reprovado: 0, sem: 0 };
  linhas.forEach((l) => { cont[l.sit.cls] = (cont[l.sit.cls] || 0) + 1; });

  let selo = null;
  if (comNota.length) {
    if (aba === 'final') {
      if (cont.reprovado) selo = { cls: 'reprovado', txt: 'REPROVADO', sub: cont.reprovado + (cont.reprovado === 1 ? ' disciplina' : ' disciplinas') };
      else if (cont.recuperacao) selo = { cls: 'recuperacao', txt: 'RECUPERAÇÃO', sub: cont.recuperacao + (cont.recuperacao === 1 ? ' disciplina' : ' disciplinas') };
      else if (cont['em-curso']) selo = { cls: 'em-curso', txt: 'EM CURSO', sub: 'ano em andamento' };
      else selo = { cls: 'aprovado', txt: 'APROVADO', sub: 'todas as disciplinas' };
    } else {
      const s = situacaoNota(mediaGeral, cfg);
      selo = { cls: s.cls, txt: s.txt, sub: 'média do período' };
    }
  }
  return {
    mediaGeral, nivel: nivel(mediaGeral, cfg), total: linhas.length, comNota: comNota.length,
    aprovadas: cont.aprovado, emCurso: cont['em-curso'], recuperacao: cont.recuperacao, reprovadas: cont.reprovado,
    acima: linhas.filter((l) => l.media !== null && l.media >= cfg.media).length,   // ≥ média (visão por período)
    selo
  };
}

/** Média geral por período (para o gráfico de evolução). */
export function evolucao(materias, cfg) {
  const np = cfg.numPeriodos, lista = (materias || []).filter((m) => m && m.nome);
  const out = [];
  for (let p = 1; p <= np; p++) {
    const v = lista.map((m) => num(m['n' + p])).filter((n) => n !== null);
    out.push({ label: (cfg.labels && cfg.labels[p - 1]) || p + 'º', media: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, qtd: v.length });
  }
  return out;
}

/** Melhor disciplina e a que mais precisa de atenção (só se estiver abaixo da média). */
export function destaques(linhas, cfg) {
  const c = linhas.filter((l) => l.media !== null).sort((a, b) => b.media - a.media);
  if (c.length < 2) return { melhor: c[0] && c[0].media >= cfg.media ? c[0] : null, atencao: c[0] && c[0].media < cfg.media ? c[0] : null };
  const pior = c[c.length - 1];
  return { melhor: c[0], atencao: pior.media < cfg.media ? pior : null };
}

export function iniciais(nome) {
  const p = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

/** Dados do cabeçalho: edições do boletim (hb_boletim_extra) têm prioridade sobre a config do app. */
export function perfilBoletim(cfgUser, extra, nomeApp, hoje) {
  cfgUser = cfgUser || {}; extra = extra || {};
  const serieChave = extra.serie !== undefined && extra.serie !== '' ? extra.serie : cfgUser.serie;
  const serie = SERIES[serieChave] || '';
  const turma = (extra.turma || cfgUser.turma || '').trim();
  hoje = hoje || new Date();
  return {
    nome: (extra.nome || nomeApp || 'Estudante').trim(),
    escola: (extra.escola || cfgUser.escola || '').trim(),
    serie, turma,
    serieTurma: [serie, turma].filter(Boolean).join(' · '),
    ano: String(extra.ano || cfgUser.ano || hoje.getFullYear()),
    data: String(hoje.getDate()).padStart(2, '0') + '/' + String(hoje.getMonth() + 1).padStart(2, '0') + '/' + hoje.getFullYear()
  };
}
