/* notas-esquema.js — Hub Brain · esquema de avaliação por matéria (um por bimestre)
   Script NORMAL (não module). Carregar DEPOIS do notas-logica.js no notas.html.
   Depende da ponte window.HBNotas (adicionada no notas-logica.js).

   Modelo salvo em cada matéria — UM esquema por período (o professor pode mudar a cada bimestre):
     materia.esquemas = {
       "1": { modo: "pontos", componentes: [{ id, nome, tipo, peso, nota }], media: 8.7, atualizadoEm: 1730000000000 },
       "2": { ... }
     }
   Dois jeitos de lançar (campo "modo", escolhido por período):
     "pontos" (padrão) → o peso é quanto o componente VALE; a nota é quanto você tirou, de 0 até o peso.
                         Nota do bimestre = soma dos pontos (ajustada p/ 10 se os pesos não somarem 10).
     "media"           → a nota de cada componente vai de 0 a 10; nota do bimestre = média ponderada pelos pesos.
   O resultado de cada período é gravado em materia.n{período} — o resto do app continua lendo n1..n4.
   Formato antigo (materia.esquema + periodo) é lido e migrado sozinho no próximo salvamento. */
(function () {
  'use strict';

  /* ═══════════════ CONFIG ═══════════════ */

  var PESO_ALVO = 10;      // soma ideal dos pesos
  var TOLERANCIA = 0.001;

  var TIPOS = [
    ['prova', 'Prova'], ['teste', 'Teste'], ['caderno', 'Caderno'], ['trabalho', 'Trabalho'],
    ['atividade', 'Atividade'], ['seminario', 'Seminário'], ['redacao', 'Redação'],
    ['projeto', 'Projeto'], ['lista', 'Lista'], ['participacao', 'Participação']
  ];

  // Ajuste os pesos dos templates aqui, se a sua escola usar outros.
  var TEMPLATES = [
    { key: 'bimestral', rotulo: 'Bimestral', componentes: [
      { nome: 'Prova', tipo: 'prova', peso: 5 }, { nome: 'Teste', tipo: 'teste', peso: 2 },
      { nome: 'Trabalho', tipo: 'trabalho', peso: 2 }, { nome: 'Participação', tipo: 'participacao', peso: 1 }] },
    { key: 'trimestral', rotulo: 'Trimestral', componentes: [
      { nome: 'Prova', tipo: 'prova', peso: 6 }, { nome: 'Trabalho', tipo: 'trabalho', peso: 2 },
      { nome: 'Atividade', tipo: 'atividade', peso: 2 }] },
    { key: 'sociologia', rotulo: 'Sociologia padrão', componentes: [
      { nome: 'Caderno', tipo: 'caderno', peso: 1.5 }, { nome: 'Teste', tipo: 'teste', peso: 1.5 },
      { nome: 'Prova', tipo: 'prova', peso: 5 }, { nome: 'Trabalho', tipo: 'trabalho', peso: 2 }] },
    { key: 'prova-trabalho', rotulo: 'Prova + Trabalho', componentes: [
      { nome: 'Prova', tipo: 'prova', peso: 7 }, { nome: 'Trabalho', tipo: 'trabalho', peso: 3 }] },
    { key: 'limpar', rotulo: 'Limpar', componentes: [] }
  ];

  /* ═══════════════ CÁLCULO (puro, reutilizável pelo boletim/home) ═══════════════ */

  var round2 = function (x) { return Math.round(x * 100) / 100; };
  var round1 = function (x) { return Math.round(x * 10) / 10; };
  var fmt = function (x) { return (Math.round(x * 100) / 100).toString().replace('.', ','); };
  var vazio = function (v) { return v === null || v === undefined || v === ''; };

  /** Resultado do período (r.media) conforme o modo:
   *   'pontos' → Σ pontos obtidos, na escala de notaMax (se os pesos somam 10, é a soma pura).
   *              Parcial = acumulado até agora (o que falta avaliar ainda não entra).
   *   'media'  → Σ(nota × peso) / Σ(pesos dos componentes COM nota).
   *  r.media é null quando nenhum componente tem nota. */
  function calcular(componentes, notaMax, modo) {
    notaMax = notaMax || 10;
    modo = modo === 'media' ? 'media' : 'pontos';
    var soma = 0, pontos = 0, pesoPreenchido = 0, pesoTotal = 0, preenchidos = 0, invalidos = 0;
    (componentes || []).forEach(function (c) {
      var peso = Number(c.peso);
      var pesoOk = isFinite(peso) && peso > 0;
      if (pesoOk) pesoTotal += peso;
      var temNota = !vazio(c.nota);
      var n = temNota ? Number(c.nota) : NaN;
      var teto = modo === 'pontos' ? (pesoOk ? peso : 0) : notaMax;   // pontos: no máximo o que o componente vale
      var notaOk = temNota && isFinite(n) && n >= 0 && n <= teto + 1e-9;
      if (!pesoOk || (temNota && !notaOk)) invalidos++;   // 1 por componente
      if (!temNota || !notaOk || !pesoOk) return;
      soma += n * peso;
      pontos += n;
      pesoPreenchido += peso;
      preenchidos++;
    });
    var media = null;
    if (pesoPreenchido > 0) media = modo === 'pontos' ? pontos * notaMax / pesoTotal : soma / pesoPreenchido;
    return {
      media: media,
      modo: modo,
      pontos: pontos,                    // Σ pontos obtidos (modo pontos)
      pesoTotal: pesoTotal,
      pesoPreenchido: pesoPreenchido,
      preenchidos: preenchidos,
      total: (componentes || []).length,
      invalidos: invalidos,
      aproveitamento: modo === 'pontos' && pesoPreenchido > 0 ? pontos / pesoPreenchido : null   // 0..1 do que já foi avaliado
    };
  }

  /** Esquemas antigos não têm "modo": se alguma nota passa do peso, a pessoa usava nota 0–10; senão, pontos. */
  function inferirModo(comps) {
    return (comps || []).some(function (c) {
      var n = Number(c.nota), p = Number(c.peso);
      return !vazio(c.nota) && isFinite(n) && isFinite(p) && n > p + 1e-9;
    }) ? 'media' : 'pontos';
  }
  function modoDe(e) {
    return e && (e.modo === 'media' || e.modo === 'pontos') ? e.modo : inferirModo(e && e.componentes);
  }

  /* ═══════════════ MODELO: esquemas por período (com migração do formato antigo) ═══════════════ */

  /** { 1: {componentes, media, atualizadoEm}, 2: {...} } — só períodos com componentes. */
  function getEsquemas(materia) {
    var out = {};
    var novo = materia && materia.esquemas;
    if (novo && typeof novo === 'object') {
      Object.keys(novo).forEach(function (k) {
        var e = novo[k], p = Number(k);
        if (p >= 1 && e && Array.isArray(e.componentes) && e.componentes.length) out[p] = e;
      });
    }
    var velho = materia && materia.esquema;           // formato antigo: um esquema + "periodo"
    if (velho && Array.isArray(velho.componentes) && velho.componentes.length) {
      var pv = Number(velho.periodo) >= 1 ? Number(velho.periodo) : 1;
      if (!out[pv]) out[pv] = { componentes: velho.componentes, media: velho.media, atualizadoEm: velho.atualizadoEm };
    }
    return out;
  }
  function getEsquema(materia, periodo) { return getEsquemas(materia)[periodo] || null; }

  /* ═══════════════ HELPERS ═══════════════ */

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function rotuloTipo(t) { var x = TIPOS.filter(function (p) { return p[0] === t; })[0]; return x ? x[1] : 'Componente'; }
  function bridge() { return window.HBNotas; }
  function chaves(map) { return Object.keys(map).map(Number).sort(function (a, b) { return a - b; }); }

  function normalizarComp(c) {
    var peso = Number(c.peso);
    return {
      id: c.id || uid(),
      nome: String(c.nome == null ? '' : c.nome),
      tipo: TIPOS.some(function (t) { return t[0] === c.tipo; }) ? c.tipo : 'prova',
      peso: isFinite(peso) ? peso : 1,
      nota: vazio(c.nota) || !isFinite(Number(c.nota)) ? null : Number(c.nota)
    };
  }

  function rowInvalida(c, cfg, modo) {
    var pesoRuim = !(isFinite(c.peso) && c.peso > 0);
    var teto = modo === 'media' ? cfg.notaMax : (pesoRuim ? 0 : c.peso);   // pontos: até o peso do componente
    var notaRuim = !vazio(c.nota) && (!isFinite(c.nota) || c.nota < 0 || c.nota > teto + 1e-9);
    return { peso: pesoRuim, nota: notaRuim, algum: pesoRuim || notaRuim };
  }

  /* ═══════════════ BOTÕES / RESUMO NOS CARDS ═══════════════ */

  function decorar() {
    var lista = document.getElementById('lista-materias');
    var B = bridge();
    if (!lista || !B) return;
    var materias = B.getMaterias();
    var cfg = B.getCfg();

    lista.querySelectorAll('.materia-card').forEach(function (card) {
      if (card.querySelector('.esq-btn-cfg')) return;
      var del = card.querySelector('.btn-delete');
      var m = del && /\((-?\d+)\)/.exec(del.getAttribute('onclick') || '');
      if (!m) return;
      var id = Number(m[1]);
      var materia = materias.filter(function (x) { return x.id === id; })[0];
      var header = card.querySelector('.card-header');
      var nome = header && header.querySelector('.materia-nome');
      if (!materia || !nome) return;

      var esq = getEsquemas(materia);
      var periodos = chaves(esq).filter(function (p) { return p <= cfg.numPeriodos; });

      // [nome][⚙️ Configurar] lado a lado
      var wrap = el('div', 'esq-nome-wrap');
      nome.parentNode.insertBefore(wrap, nome);
      wrap.appendChild(nome);
      var btn = el('button', 'esq-btn-cfg' + (periodos.length ? ' ativo' : ''));
      btn.type = 'button';
      btn.dataset.id = String(id);
      btn.setAttribute('aria-label', 'Configurar esquema de avaliação de ' + materia.nome);
      btn.appendChild(el('span', 'esq-ico', '⚙️'));
      btn.appendChild(el('span', 'esq-lbl', 'Configurar'));
      wrap.appendChild(btn);

      if (!periodos.length) return;

      // resumo logo abaixo do cabeçalho: um item por período que tem esquema
      var partes = periodos.map(function (p) {
        var r = calcular(esq[p].componentes, cfg.notaMax, modoDe(esq[p]));
        return cfg.labels[p - 1] + ' ' + (r.media === null ? '—' : fmt(r.media));
      });
      var resumo = el('div', 'esq-card-resumo', '📐 ' + partes.join(' · '));
      header.parentNode.insertBefore(resumo, header.nextSibling);

      // a nota de cada período com esquema vem do esquema: trava o campo (tocar nele abre o esquema)
      var inputs = card.querySelectorAll('.nota-input');
      periodos.forEach(function (p) {
        var inp = inputs[p - 1];
        if (!inp) return;
        inp.readOnly = true;
        inp.step = 'any';
        inp.classList.add('esq-lock');
        inp.title = 'Calculada pelo esquema de avaliação. Toque para editar.';
        inp.addEventListener('click', function () { abrir(id, p); });
      });
    });
    sincronizarSalvos();
  }

  /* Uma vez por carregamento: recalcula o n{p} de cada esquema já salvo.
     (Esquemas salvos antes da versão "pontos" têm n{p} calculado com a conta antiga.) Idempotente. */
  var jaSincronizou = false;
  function sincronizarSalvos() {
    if (jaSincronizou) return;
    jaSincronizou = true;
    var B = bridge();
    if (!B) return;
    var cfg = B.getCfg(), mudou = false;
    B.getMaterias().forEach(function (m) {
      var esq = getEsquemas(m);
      chaves(esq).forEach(function (p) {
        if (p > cfg.numPeriodos) return;
        var e = esq[p], modo = modoDe(e);
        var r = calcular(e.componentes, cfg.notaMax, modo);
        if (r.media === null) return;
        var v = round2(r.media);
        if (!(Math.abs(parseFloat(m['n' + p]) - v) < 0.005)) { m['n' + p] = v; mudou = true; }
        if (e.modo !== modo || e.media !== v) { e.modo = modo; e.media = v; }
      });
    });
    if (mudou) { try { B.persistir(); } catch (err) { console.error('[esquema] sync:', err); } }
  }

  function instalarHook() {
    var f = window.atualizarLista;
    if (typeof f !== 'function') return false;
    if (f.__esq) return true;
    var wrapped = function () {
      var r = f.apply(this, arguments);
      try { decorar(); } catch (e) { console.error('[esquema] decorar:', e); }
      return r;
    };
    wrapped.__esq = true;
    window.atualizarLista = wrapped;
    try { decorar(); } catch (e) { console.error('[esquema] decorar:', e); }
    return true;
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.esq-btn-cfg');
    if (b) { ev.preventDefault(); abrir(Number(b.dataset.id)); }
  });

  /* ═══════════════ BOTTOM SHEET ═══════════════ */

  var S = null;      // { id, cfg, tab, drafts:{p:{componentes}}, snaps:{p:json} }
  var ui = null;     // referências de DOM

  function draft() { return S.drafts[S.tab]; }
  function periodosDoCfg() { var a = []; for (var p = 1; p <= S.cfg.numPeriodos; p++) a.push(p); return a; }
  function rotuloPeriodo(p) { return S.cfg.labels[p - 1] || (p + 'º'); }

  function montar() {
    if (ui) return ui;
    var ov = el('div', 'esq-overlay');
    ov.id = 'esq-overlay';
    ov.innerHTML =
      '<div class="esq-sheet" role="dialog" aria-modal="true" aria-labelledby="esq-titulo" tabindex="-1">' +
        '<div class="esq-handle"></div>' +
        '<div class="esq-head">' +
          '<div class="esq-head-txt"><h3 id="esq-titulo"></h3><p>Esquema de avaliação</p></div>' +
          '<button type="button" class="esq-x" aria-label="Fechar">✕</button>' +
        '</div>' +
        '<div class="esq-tabs" role="tablist"></div>' +
        '<div class="esq-body">' +
          '<div class="esq-sec">Como lançar as notas</div>' +
          '<div class="esq-modo" role="group">' +
            '<button type="button" class="esq-modo-bt" data-modo="pontos">Pontos</button>' +
            '<button type="button" class="esq-modo-bt" data-modo="media">Nota 0–10</button>' +
          '</div>' +
          '<p class="esq-modo-dica"></p>' +
          '<div class="esq-sec">Atalhos</div>' +
          '<div class="esq-templates"></div>' +
          '<div class="esq-sec">Componentes</div>' +
          '<div class="esq-lista"></div>' +
          '<button type="button" class="esq-add">+ Adicionar componente</button>' +
          '<div class="esq-aviso"></div>' +
        '</div>' +
        '<div class="esq-resumo">' +
          '<div class="esq-media"></div>' +
          '<div class="esq-resumo-txt"><strong class="esq-det"></strong><span class="esq-destino"></span></div>' +
        '</div>' +
        '<div class="esq-footer">' +
          '<button type="button" class="esq-bt esq-bt-sec esq-cancelar">Cancelar</button>' +
          '<button type="button" class="esq-bt esq-bt-pri esq-salvar">Salvar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    ui = {
      ov: ov,
      sheet: ov.querySelector('.esq-sheet'),
      titulo: ov.querySelector('#esq-titulo'),
      tabs: ov.querySelector('.esq-tabs'),
      body: ov.querySelector('.esq-body'),
      modo: ov.querySelector('.esq-modo'),
      dica: ov.querySelector('.esq-modo-dica'),
      templates: ov.querySelector('.esq-templates'),
      lista: ov.querySelector('.esq-lista'),
      add: ov.querySelector('.esq-add'),
      aviso: ov.querySelector('.esq-aviso'),
      media: ov.querySelector('.esq-media'),
      det: ov.querySelector('.esq-det'),
      destino: ov.querySelector('.esq-destino'),
      salvar: ov.querySelector('.esq-salvar'),
      cancelar: ov.querySelector('.esq-cancelar')
    };

    ui.tabs.addEventListener('click', function (ev) {
      var t = ev.target.closest('.esq-tab');
      if (!t) return;
      S.tab = Number(t.dataset.p);
      renderTudo();
      ui.body.scrollTop = 0;
    });
    ui.templates.addEventListener('click', function (ev) {
      var b = ev.target.closest('.esq-chip');
      if (!b) return;
      if (b.dataset.copiar) copiarDe(Number(b.dataset.copiar));
      else aplicarTemplate(b.dataset.key);
    });
    ui.modo.addEventListener('click', function (ev) {
      var b = ev.target.closest('.esq-modo-bt');
      if (b) trocarModo(b.dataset.modo);
    });
    ui.add.addEventListener('click', adicionar);
    ui.salvar.addEventListener('click', salvar);
    ui.cancelar.addEventListener('click', function () { fechar(false); });
    ov.querySelector('.esq-x').addEventListener('click', function () { fechar(false); });
    ov.addEventListener('click', function (ev) { if (ev.target === ov) fechar(false); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && S) fechar(false);
    });

    // edição inline (delegação): atualiza o rascunho e o resumo sem re-renderizar (mantém o foco)
    ui.lista.addEventListener('input', function (ev) {
      var row = ev.target.closest('.esq-comp');
      if (!row) return;
      var c = draft().componentes[Number(row.dataset.i)];
      if (!c) return;
      var t = ev.target;
      if (t.classList.contains('esq-nome')) c.nome = t.value;
      else if (t.classList.contains('esq-peso')) { c.peso = t.value === '' ? NaN : Number(t.value); ajustarCampoNota(row.querySelector('.esq-nota'), c); }
      else if (t.classList.contains('esq-nota')) c.nota = t.value === '' ? null : Number(t.value);
      atualizar();
    });
    ui.lista.addEventListener('change', function (ev) {
      if (!ev.target.classList.contains('esq-tipo')) return;
      var row = ev.target.closest('.esq-comp');
      var c = draft().componentes[Number(row.dataset.i)];
      var antigo = c.tipo;
      c.tipo = ev.target.value;
      // se o nome ainda era o automático do tipo anterior, acompanha o novo tipo
      if (!c.nome.trim() || c.nome === rotuloTipo(antigo)) {
        c.nome = rotuloTipo(c.tipo);
        row.querySelector('.esq-nome').value = c.nome;
      }
      atualizar();
    });
    ui.lista.addEventListener('click', function (ev) {
      var d = ev.target.closest('.esq-del');
      if (!d) return;
      var i = Number(d.closest('.esq-comp').dataset.i);
      draft().componentes.splice(i, 1);
      renderLista();
      atualizar();
    });
    return ui;
  }

  function renderTabs() {
    ui.tabs.innerHTML = '';
    periodosDoCfg().forEach(function (p) {
      var d = S.drafts[p];
      var t = el('button', 'esq-tab' + (p === S.tab ? ' ativa' : '') + (d.componentes.length ? ' tem' : ''));
      t.type = 'button';
      t.dataset.p = String(p);
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-selected', p === S.tab ? 'true' : 'false');
      t.appendChild(el('span', null, rotuloPeriodo(p)));
      t.appendChild(el('i', 'esq-dot'));
      ui.tabs.appendChild(t);
    });
  }

  // atalhos: templates + "copiar do outro bimestre" (só aparece se o outro tem componentes) + limpar
  function renderChips() {
    ui.templates.innerHTML = '';
    function chip(txt, cls, set) {
      var b = el('button', 'esq-chip ' + cls, txt);
      b.type = 'button';
      Object.keys(set).forEach(function (k) { b.dataset[k] = set[k]; });
      ui.templates.appendChild(b);
    }
    TEMPLATES.filter(function (t) { return t.key !== 'limpar'; }).forEach(function (t) { chip(t.rotulo, '', { key: t.key }); });
    periodosDoCfg().forEach(function (p) {
      if (p !== S.tab && S.drafts[p].componentes.length) chip('📋 Copiar do ' + rotuloPeriodo(p), 'esq-chip-copiar', { copiar: String(p) });
    });
    chip('Limpar', 'esq-chip-limpar', { key: 'limpar' });
  }

  // pontos: vai de 0 até o peso (placeholder "/5") · nota 0–10: vai de 0 até notaMax
  function ajustarCampoNota(inp, c) {
    if (draft().modo === 'pontos') {
      inp.max = isFinite(c.peso) ? String(c.peso) : '';
      inp.placeholder = isFinite(c.peso) && c.peso > 0 ? '/' + fmt(c.peso).replace(',', '.') : '—';
    } else {
      inp.max = String(S.cfg.notaMax);
      inp.placeholder = '—';
    }
  }

  function renderLista(focarUltimo) {
    var L = ui.lista;
    L.innerHTML = '';
    var comps = draft().componentes;
    renderChips();
    renderTabs();
    if (!comps.length) {
      L.appendChild(el('div', 'esq-vazio', 'Nenhum componente no ' + rotuloPeriodo(S.tab) + ' ainda. Escolha um atalho acima ou adicione manualmente.'));
      return;
    }
    comps.forEach(function (c, i) {
      var row = el('div', 'esq-comp');
      row.dataset.i = String(i);

      var topo = el('div', 'esq-comp-topo');
      var nome = el('input', 'esq-in esq-nome');
      nome.type = 'text'; nome.maxLength = 30; nome.placeholder = 'Nome (ex: Prova 1)';
      nome.value = c.nome;
      var del = el('button', 'esq-del');
      del.type = 'button';
      del.setAttribute('aria-label', 'Remover componente');
      del.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';
      topo.appendChild(nome); topo.appendChild(del);

      var grade = el('div', 'esq-comp-grade');
      function campo(rotulo, ctl) {
        var l = el('label', 'esq-campo');
        l.appendChild(el('span', null, rotulo));
        l.appendChild(ctl);
        return l;
      }
      var tipo = el('select', 'esq-in esq-tipo');
      TIPOS.forEach(function (t) {
        var o = el('option', null, t[1]); o.value = t[0]; if (t[0] === c.tipo) o.selected = true; tipo.appendChild(o);
      });
      var peso = el('input', 'esq-in esq-peso');
      peso.type = 'number'; peso.step = '0.1'; peso.min = '0'; peso.inputMode = 'decimal'; peso.placeholder = '0';
      peso.value = isFinite(c.peso) ? c.peso : '';
      var nota = el('input', 'esq-in esq-nota');
      nota.type = 'number'; nota.step = '0.1'; nota.min = '0';
      nota.inputMode = 'decimal';
      ajustarCampoNota(nota, c);
      nota.value = c.nota === null ? '' : c.nota;
      grade.appendChild(campo('Tipo', tipo));
      grade.appendChild(campo('Peso', peso));
      grade.appendChild(campo(draft().modo === 'pontos' ? 'Pontos' : 'Nota', nota));

      row.appendChild(topo); row.appendChild(grade);
      L.appendChild(row);
    });
    if (focarUltimo) {
      var ultimo = L.lastElementChild;
      var inp = ultimo && ultimo.querySelector('.esq-nome');
      if (inp) { inp.focus(); inp.select(); }
      if (ultimo && ultimo.scrollIntoView) ultimo.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  var DICAS = {
    pontos: 'Cada componente vale o peso em pontos. Digite os pontos que você tirou (ex.: a prova vale 5 e você tirou 4,5 → digite 4,5). A nota do bimestre é a soma.',
    media: 'Digite a nota de 0 a 10 de cada componente. A nota do bimestre é a média ponderada pelos pesos.'
  };
  function renderModo() {
    var m = draft().modo;
    ui.modo.querySelectorAll('.esq-modo-bt').forEach(function (b) {
      var on = b.dataset.modo === m;
      b.classList.toggle('ativo', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    ui.dica.textContent = DICAS[m];
  }

  function renderTudo() { renderModo(); renderLista(); atualizar(); }

  /** Converte as notas já digitadas ao trocar de modo (pontos ↔ nota 0–10), sem mudar o resultado. */
  function converterModo(d, para) {
    if (d.modo === para) return;
    var max = S.cfg.notaMax;
    d.componentes.forEach(function (c) {
      if (vazio(c.nota) || !isFinite(c.nota) || !(c.peso > 0)) return;
      c.nota = round2(para === 'media' ? c.nota / c.peso * max : c.nota / max * c.peso);
    });
    d.modo = para;
  }
  function trocarModo(novo) {
    var d = draft();
    if (d.modo === novo) return;
    converterModo(d, novo);
    renderTudo();
  }

  /** Períodos (≠ aba atual) cujo rascunho tem campo inválido. */
  function outrosInvalidos() {
    return periodosDoCfg().filter(function (p) {
      return p !== S.tab && S.drafts[p].componentes.some(function (c) { return rowInvalida(c, S.cfg, S.drafts[p].modo).algum; });
    });
  }

  function atualizar() {
    var d = draft(), cfg = S.cfg;
    var r = calcular(d.componentes, cfg.notaMax, d.modo);
    var pontos = d.modo === 'pontos';

    // linhas inválidas da aba atual
    var invAtual = false;
    ui.lista.querySelectorAll('.esq-comp').forEach(function (row) {
      var c = d.componentes[Number(row.dataset.i)];
      if (!c) return;
      var v = rowInvalida(c, cfg, d.modo);
      row.querySelector('.esq-peso').classList.toggle('invalido', v.peso);
      row.querySelector('.esq-nota').classList.toggle('invalido', v.nota);
      if (v.algum) invAtual = true;
    });
    var outros = outrosInvalidos();

    // marcadores nas abas (ponto roxo = tem esquema · ponto vermelho = campo inválido)
    ui.tabs.querySelectorAll('.esq-tab').forEach(function (t) {
      var p = Number(t.dataset.p);
      var dp = S.drafts[p];
      var ruim = p === S.tab ? invAtual : outros.indexOf(p) !== -1;
      t.classList.toggle('erro', ruim);
      t.classList.toggle('tem', dp.componentes.length > 0);
    });

    // aviso dos pesos
    var av = ui.aviso;
    av.className = 'esq-aviso';
    if (invAtual) {
      av.classList.add('erro');
      av.textContent = pontos
        ? '⛔ Corrija os campos em vermelho (peso maior que 0; os pontos não podem passar do peso do componente).'
        : '⛔ Corrija os campos em vermelho (peso maior que 0 e nota entre 0 e ' + cfg.notaMax + ').';
    } else if (outros.length) {
      av.classList.add('erro');
      av.textContent = '⛔ Há campos inválidos no ' + outros.map(rotuloPeriodo).join(' e no ') + '. Corrija para poder salvar.';
    } else if (!d.componentes.length) {
      av.textContent = '';
    } else if (Math.abs(r.pesoTotal - PESO_ALVO) < TOLERANCIA) {
      av.classList.add('ok');
      av.textContent = pontos ? '✓ Os pesos somam ' + PESO_ALVO + ': a nota do bimestre é a soma dos pontos.' : '✓ Os pesos somam ' + PESO_ALVO + ': a média é direta.';
    } else {
      var dif = r.pesoTotal - PESO_ALVO;
      av.classList.add('aviso');
      av.textContent = '⚠️ Os pesos somam ' + fmt(r.pesoTotal) + ' (o ideal é ' + PESO_ALVO + '; ' +
        (dif < 0 ? 'faltam ' + fmt(-dif) : 'passou ' + fmt(dif)) + '). ' +
        (pontos ? 'A nota é ajustada proporcionalmente (' + fmt(r.pesoTotal) + ' pts = ' + cfg.notaMax + ').' : 'A média é calculada proporcional aos pesos.');
    }

    // resumo em tempo real
    ui.media.textContent = r.media === null ? '—' : fmt(r.media);
    ui.media.classList.toggle('vazio', r.media === null);
    if (!d.componentes.length) {
      ui.det.textContent = 'Sem componentes no ' + rotuloPeriodo(S.tab);
      ui.destino.textContent = 'Adicione componentes para calcular a nota.';
    } else if (r.media === null) {
      ui.det.textContent = pontos ? 'Preencha os pontos que você tirou' : 'Preencha ao menos uma nota';
      ui.destino.textContent = 'A nota do ' + rotuloPeriodo(S.tab) + ' aparece aqui em tempo real.';
    } else if (pontos) {
      ui.det.textContent = fmt(r.pontos) + ' de ' + fmt(r.pesoTotal) + ' pontos · ' + r.preenchidos + '/' + r.total + ' avaliados';
      ui.destino.textContent = 'Aproveitamento ' + Math.round(r.aproveitamento * 100) + '% · vira a nota do ' + rotuloPeriodo(S.tab);
    } else {
      ui.det.textContent = 'Média de ' + r.preenchidos + ' de ' + r.total + ' componentes';
      ui.destino.textContent = 'Vira a nota do ' + rotuloPeriodo(S.tab) + ' · pesos ' + fmt(r.pesoPreenchido) + '/' + fmt(r.pesoTotal);
    }

    ui.salvar.disabled = invAtual || outros.length > 0;
  }

  function adicionar() {
    var d = draft();
    var r = calcular(d.componentes, S.cfg.notaMax, d.modo);
    var resto = PESO_ALVO - r.pesoTotal;
    d.componentes.push({
      id: uid(), nome: 'Prova', tipo: 'prova',
      peso: resto > TOLERANCIA ? round1(resto) : 1,   // já sugere o que falta pra fechar 10
      nota: null
    });
    renderLista(true);
    atualizar();
  }

  /** Troca os componentes da aba atual, mantendo notas já digitadas quando o nome se repete. */
  function substituirComponentes(novos, modoDestino) {
    var d = draft();
    var antigos = clone(d);                              // se o modo muda (copiar de outro bimestre), converte as notas digitadas antes de casar
    if (modoDestino) converterModo(antigos, modoDestino);
    var perdidas = 0;
    antigos.componentes.forEach(function (a) {
      if (vazio(a.nota)) return;
      var alvo = novos.filter(function (n) { return n.nome.toLowerCase() === String(a.nome).trim().toLowerCase() && n.nota === null; })[0];
      if (alvo) alvo.nota = a.nota; else perdidas++;
    });
    if (perdidas > 0 && !window.confirm('Isso remove ' + perdidas + (perdidas > 1 ? ' notas já preenchidas' : ' nota já preenchida') + ' deste bimestre. Continuar?')) return;
    d.componentes = novos;
    if (modoDestino) d.modo = modoDestino;
    renderTudo();
  }

  function aplicarTemplate(key) {
    var t = TEMPLATES.filter(function (x) { return x.key === key; })[0];
    if (!t) return;
    substituirComponentes(t.componentes.map(function (c) { return { id: uid(), nome: c.nome, tipo: c.tipo, peso: c.peso, nota: null }; }));
  }

  // copia a estrutura (nome, tipo, peso) de outro bimestre — as notas NÃO vêm junto
  function copiarDe(p) {
    var origem = S.drafts[p];
    if (!origem || !origem.componentes.length) return;
    substituirComponentes(origem.componentes.map(function (c) { return { id: uid(), nome: c.nome, tipo: c.tipo, peso: c.peso, nota: null }; }), origem.modo);
  }

  function periodoDirty(p) { return JSON.stringify(S.drafts[p]) !== S.snaps[p]; }
  function sujo() { return periodosDoCfg().some(periodoDirty); }

  // abre no período pedido; senão, no último período que já tem esquema (provavelmente o que está em andamento)
  function abrir(id, periodo) {
    var B = bridge();
    if (!B) { console.error('[esquema] window.HBNotas não existe: faltou a ponte no notas-logica.js'); return; }
    var materia = B.getMaterias().filter(function (m) { return m.id === id; })[0];
    if (!materia) return;
    montar();

    var cfg = B.getCfg();
    var esq = getEsquemas(materia);
    S = { id: id, cfg: cfg, tab: 1, drafts: {}, snaps: {} };
    periodosDoCfg().forEach(function (p) {
      S.drafts[p] = { modo: esq[p] ? modoDe(esq[p]) : 'pontos', componentes: esq[p] ? esq[p].componentes.map(normalizarComp) : [] };
      S.snaps[p] = JSON.stringify(S.drafts[p]);
    });
    if (periodo >= 1 && periodo <= cfg.numPeriodos) S.tab = periodo;
    else {
      var com = chaves(esq).filter(function (p) { return p <= cfg.numPeriodos; });
      S.tab = com.length ? com[com.length - 1] : 1;
    }

    ui.titulo.textContent = '⚙️ ' + materia.nome;
    renderTudo();
    ui.ov.classList.add('aberto');
    document.body.classList.add('esq-travado');
    ui.body.scrollTop = 0;
    ui.sheet.focus();
  }

  function fechar(forcar) {
    if (!S) return;
    if (!forcar && sujo() && !window.confirm('Descartar as alterações do esquema?')) return;
    ui.ov.classList.remove('aberto');
    document.body.classList.remove('esq-travado');
    S = null;
  }

  async function salvar() {
    var B = bridge();
    if (!S || !B) return;
    var materia = B.getMaterias().filter(function (m) { return m.id === S.id; })[0];
    if (!materia) { fechar(true); return; }

    var cfg = S.cfg;
    var base = clone(getEsquemas(materia));      // inclui migração do formato antigo e períodos fora do cfg atual

    periodosDoCfg().forEach(function (p) {
      if (!periodoDirty(p)) return;              // só mexe nos períodos que mudaram
      var comps = S.drafts[p].componentes.map(function (c) {
        var n = normalizarComp(c);
        if (!n.nome.trim()) n.nome = rotuloTipo(n.tipo);
        n.nome = n.nome.trim();
        return n;
      });
      var anterior = base[p] || null;

      if (!comps.length) {                       // sem componentes = volta ao modo manual (n{p} fica como está)
        delete base[p];
        return;
      }
      var modo = S.drafts[p].modo;
      var r = calcular(comps, cfg.notaMax, modo);
      var chave = 'n' + p;
      if (r.media !== null) {
        materia[chave] = round2(r.media);        // sincroniza com a aba Notas
      } else if (anterior && anterior.media != null) {
        materia[chave] = '';                     // apagou todas as notas que tinham gerado a média
      }
      base[p] = { modo: modo, componentes: comps, media: r.media === null ? null : round2(r.media), atualizadoEm: Date.now() };
    });

    Object.keys(base).forEach(function (k) { if (!base[k].modo) base[k].modo = modoDe(base[k]); });   // fixa o modo inferido dos antigos
    delete materia.esquema;                      // formato antigo já migrado
    if (Object.keys(base).length) materia.esquemas = base; else delete materia.esquemas;

    var nuvem = B.persistir();                   // salva local, redesenha e sobe pro Firebase
    fechar(true);
    B.toast('Esquema salvo!');
    try { await nuvem; } catch (e) { console.error('[esquema] nuvem:', e); }
  }

  /* ═══════════════ INICIALIZAÇÃO ═══════════════
     Este script (normal) roda ANTES do módulo notas-logica.js, mesmo estando depois no HTML.
     Por isso o gancho no atualizarLista só é instalado quando ele já existir. */
  function iniciar() {
    if (instalarHook()) return;
    var tentativas = 0;
    var t = setInterval(function () {
      if (instalarHook() || ++tentativas > 50) clearInterval(t);
    }, 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  window.HBEsquema = {
    calcular: calcular,
    modoDe: modoDe,
    getEsquemas: getEsquemas,
    getEsquema: getEsquema,
    TEMPLATES: TEMPLATES,
    TIPOS: TIPOS,
    abrir: abrir
  };
})();
