/* notas-esquema.js — Hub Brain · esquema de avaliação por matéria
   Script NORMAL (não module). Carregar DEPOIS do notas-logica.js no notas.html.
   Depende da ponte window.HBNotas (3 linhas adicionadas no notas-logica.js).

   Modelo salvo em cada matéria:
     materia.esquema = {
       componentes: [{ id, nome, tipo, peso, nota }],   // nota: número ou null
       periodo: 1,        // qual nota (n1..n4) recebe a média calculada
       media: 7.05,       // última média calculada (ou null)
       atualizadoEm: 1730000000000
     }
   A média ponderada é gravada em materia.n{periodo} — o resto do app continua lendo n1..n4. */
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

  /** média = Σ(nota × peso) / Σ(pesos dos componentes COM nota). Retorna null se nenhuma nota. */
  function calcular(componentes, notaMax) {
    notaMax = notaMax || 10;
    var soma = 0, pesoPreenchido = 0, pesoTotal = 0, preenchidos = 0, invalidos = 0;
    (componentes || []).forEach(function (c) {
      var peso = Number(c.peso);
      var pesoOk = isFinite(peso) && peso > 0;
      if (pesoOk) pesoTotal += peso;
      var temNota = !vazio(c.nota);
      var n = temNota ? Number(c.nota) : NaN;
      var notaOk = temNota && isFinite(n) && n >= 0 && n <= notaMax;
      if (!pesoOk || (temNota && !notaOk)) invalidos++;   // 1 por componente
      if (!temNota || !notaOk || !pesoOk) return;
      soma += n * peso;
      pesoPreenchido += peso;
      preenchidos++;
    });
    return {
      media: pesoPreenchido > 0 ? soma / pesoPreenchido : null,
      pesoTotal: pesoTotal,
      pesoPreenchido: pesoPreenchido,
      preenchidos: preenchidos,
      total: (componentes || []).length,
      invalidos: invalidos
    };
  }

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

  /* ═══════════════ BOTÕES NOS CARDS ═══════════════ */

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

      var temEsq = !!(materia.esquema && materia.esquema.componentes && materia.esquema.componentes.length);

      // [nome][⚙️ Configurar] lado a lado
      var wrap = el('div', 'esq-nome-wrap');
      nome.parentNode.insertBefore(wrap, nome);
      wrap.appendChild(nome);
      var btn = el('button', 'esq-btn-cfg' + (temEsq ? ' ativo' : ''));
      btn.type = 'button';
      btn.dataset.id = String(id);
      btn.setAttribute('aria-label', 'Configurar esquema de avaliação de ' + materia.nome);
      btn.appendChild(el('span', 'esq-ico', '⚙️'));
      btn.appendChild(el('span', 'esq-lbl', 'Configurar'));
      wrap.appendChild(btn);

      if (!temEsq) return;
      var esq = materia.esquema;
      var periodo = esq.periodo >= 1 && esq.periodo <= cfg.numPeriodos ? esq.periodo : 1;

      // resumo logo abaixo do cabeçalho
      var r = calcular(esq.componentes, cfg.notaMax);
      var txt = '📐 Esquema ' + r.preenchidos + '/' + r.total;
      txt += r.media !== null ? ' · média ' + fmt(r.media) + ' → ' + cfg.labels[periodo - 1] : ' · sem notas ainda';
      var resumo = el('div', 'esq-card-resumo', txt);
      header.parentNode.insertBefore(resumo, header.nextSibling);

      // a nota do período vem do esquema: trava o campo (tocar nele abre o esquema)
      var inputs = card.querySelectorAll('.nota-input');
      var inp = inputs[periodo - 1];
      if (inp) {
        inp.readOnly = true;
        inp.step = 'any';
        inp.classList.add('esq-lock');
        inp.title = 'Calculada pelo esquema de avaliação. Toque para editar.';
        inp.addEventListener('click', function () { abrir(id); });
      }
    });
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

  var S = null;      // estado do sheet aberto: { id, materia, cfg, draft, snapshot }
  var ui = null;     // referências de DOM

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
        '<div class="esq-body">' +
          '<div class="esq-sec">Templates</div>' +
          '<div class="esq-templates"></div>' +
          '<div class="esq-sec">Componentes</div>' +
          '<div class="esq-lista"></div>' +
          '<button type="button" class="esq-add">+ Adicionar componente</button>' +
          '<div class="esq-periodo"><span>Vale como nota do</span><select class="esq-in esq-sel-periodo"></select></div>' +
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
      templates: ov.querySelector('.esq-templates'),
      lista: ov.querySelector('.esq-lista'),
      add: ov.querySelector('.esq-add'),
      selPeriodo: ov.querySelector('.esq-sel-periodo'),
      aviso: ov.querySelector('.esq-aviso'),
      media: ov.querySelector('.esq-media'),
      det: ov.querySelector('.esq-det'),
      destino: ov.querySelector('.esq-destino'),
      salvar: ov.querySelector('.esq-salvar'),
      cancelar: ov.querySelector('.esq-cancelar')
    };

    TEMPLATES.forEach(function (t) {
      var b = el('button', 'esq-chip' + (t.key === 'limpar' ? ' esq-chip-limpar' : ''), t.rotulo);
      b.type = 'button';
      b.dataset.key = t.key;
      ui.templates.appendChild(b);
    });

    ui.templates.addEventListener('click', function (ev) {
      var b = ev.target.closest('.esq-chip');
      if (b) aplicarTemplate(b.dataset.key);
    });
    ui.add.addEventListener('click', adicionar);
    ui.selPeriodo.addEventListener('change', function () { S.draft.periodo = Number(ui.selPeriodo.value); atualizar(); });
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
      var c = S.draft.componentes[Number(row.dataset.i)];
      if (!c) return;
      var t = ev.target;
      if (t.classList.contains('esq-nome')) c.nome = t.value;
      else if (t.classList.contains('esq-peso')) c.peso = t.value === '' ? NaN : Number(t.value);
      else if (t.classList.contains('esq-nota')) c.nota = t.value === '' ? null : Number(t.value);
      atualizar();
    });
    ui.lista.addEventListener('change', function (ev) {
      if (!ev.target.classList.contains('esq-tipo')) return;
      var row = ev.target.closest('.esq-comp');
      var c = S.draft.componentes[Number(row.dataset.i)];
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
      S.draft.componentes.splice(i, 1);
      renderLista();
      atualizar();
    });
    return ui;
  }

  function renderLista(focarUltimo) {
    var L = ui.lista;
    L.innerHTML = '';
    var comps = S.draft.componentes;
    if (!comps.length) {
      L.appendChild(el('div', 'esq-vazio', 'Nenhum componente ainda. Escolha um template acima ou adicione manualmente.'));
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
      nota.type = 'number'; nota.step = '0.1'; nota.min = '0'; nota.max = String(S.cfg.notaMax);
      nota.inputMode = 'decimal'; nota.placeholder = '—';
      nota.value = c.nota === null ? '' : c.nota;
      grade.appendChild(campo('Tipo', tipo));
      grade.appendChild(campo('Peso', peso));
      grade.appendChild(campo('Nota', nota));

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

  function atualizar() {
    var d = S.draft, cfg = S.cfg;
    var r = calcular(d.componentes, cfg.notaMax);

    // linhas inválidas
    var invalido = false;
    ui.lista.querySelectorAll('.esq-comp').forEach(function (row) {
      var c = d.componentes[Number(row.dataset.i)];
      if (!c) return;
      var pesoRuim = !(isFinite(c.peso) && c.peso > 0);
      var notaRuim = !vazio(c.nota) && (!isFinite(c.nota) || c.nota < 0 || c.nota > cfg.notaMax);
      row.querySelector('.esq-peso').classList.toggle('invalido', pesoRuim);
      row.querySelector('.esq-nota').classList.toggle('invalido', notaRuim);
      if (pesoRuim || notaRuim) invalido = true;
    });

    // aviso dos pesos
    var av = ui.aviso;
    av.className = 'esq-aviso';
    if (!d.componentes.length) {
      av.textContent = '';
    } else if (invalido) {
      av.classList.add('erro');
      av.textContent = '⛔ Corrija os campos em vermelho (peso maior que 0 e nota entre 0 e ' + cfg.notaMax + ').';
    } else if (Math.abs(r.pesoTotal - PESO_ALVO) < TOLERANCIA) {
      av.classList.add('ok');
      av.textContent = '✓ Os pesos somam ' + PESO_ALVO + ': a média é direta.';
    } else {
      var dif = r.pesoTotal - PESO_ALVO;
      av.classList.add('aviso');
      av.textContent = '⚠️ Os pesos somam ' + fmt(r.pesoTotal) + ' (o ideal é ' + PESO_ALVO + '; ' +
        (dif < 0 ? 'faltam ' + fmt(-dif) : 'passou ' + fmt(dif)) + '). A média é calculada proporcional aos pesos.';
    }

    // resumo em tempo real
    ui.media.textContent = r.media === null ? '—' : fmt(r.media);
    ui.media.classList.toggle('vazio', r.media === null);
    if (!d.componentes.length) {
      ui.det.textContent = 'Sem componentes';
      ui.destino.textContent = 'Adicione componentes para calcular a média.';
    } else if (r.media === null) {
      ui.det.textContent = 'Preencha ao menos uma nota';
      ui.destino.textContent = 'A média aparece aqui em tempo real.';
    } else {
      ui.det.textContent = 'Média de ' + r.preenchidos + ' de ' + r.total + ' componentes';
      ui.destino.textContent = 'Pesos preenchidos: ' + fmt(r.pesoPreenchido) + ' de ' + fmt(r.pesoTotal);
    }

    ui.salvar.disabled = invalido;
  }

  function adicionar() {
    var r = calcular(S.draft.componentes, S.cfg.notaMax);
    var resto = PESO_ALVO - r.pesoTotal;
    S.draft.componentes.push({
      id: uid(), nome: 'Prova', tipo: 'prova',
      peso: resto > TOLERANCIA ? round1(resto) : 1,   // já sugere o que falta pra fechar 10
      nota: null
    });
    renderLista(true);
    atualizar();
  }

  function aplicarTemplate(key) {
    var t = TEMPLATES.filter(function (x) { return x.key === key; })[0];
    if (!t) return;
    var antigos = S.draft.componentes;
    var novos = t.componentes.map(function (c) { return { id: uid(), nome: c.nome, tipo: c.tipo, peso: c.peso, nota: null }; });

    // mantém notas já digitadas quando o nome do componente se repete no template
    var perdidas = 0;
    antigos.forEach(function (a) {
      if (vazio(a.nota)) return;
      var alvo = novos.filter(function (n) { return n.nome.toLowerCase() === String(a.nome).trim().toLowerCase() && n.nota === null; })[0];
      if (alvo) alvo.nota = a.nota; else perdidas++;
    });
    if (perdidas > 0 && !window.confirm('Esse template remove ' + perdidas + (perdidas > 1 ? ' notas já preenchidas' : ' nota já preenchida') + '. Continuar?')) return;

    S.draft.componentes = novos;
    renderLista();
    atualizar();
  }

  function sujo() {
    return JSON.stringify(S.draft) !== S.snapshot;
  }

  function abrir(id) {
    var B = bridge();
    if (!B) { console.error('[esquema] window.HBNotas não existe: faltou a ponte no notas-logica.js'); return; }
    var materia = B.getMaterias().filter(function (m) { return m.id === id; })[0];
    if (!materia) return;
    montar();

    var cfg = B.getCfg();
    var base = materia.esquema && Array.isArray(materia.esquema.componentes) ? materia.esquema : null;
    var periodo = base && base.periodo >= 1 && base.periodo <= cfg.numPeriodos ? base.periodo : 1;
    S = {
      id: id, cfg: cfg,
      draft: { componentes: base ? base.componentes.map(normalizarComp) : [], periodo: periodo }
    };
    S.snapshot = JSON.stringify(S.draft);

    ui.titulo.textContent = '⚙️ ' + materia.nome;
    ui.selPeriodo.innerHTML = '';
    cfg.labels.forEach(function (lbl, i) {
      var o = el('option', null, lbl); o.value = String(i + 1); if (i + 1 === periodo) o.selected = true; ui.selPeriodo.appendChild(o);
    });

    renderLista();
    atualizar();
    ui.ov.classList.add('aberto');
    document.body.classList.add('esq-travado');
    ui.sheet.scrollTop = 0;
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
    var comps = S.draft.componentes.map(function (c) {
      var n = normalizarComp(c);
      if (!n.nome.trim()) n.nome = rotuloTipo(n.tipo);
      n.nome = n.nome.trim();
      return n;
    });
    var periodo = S.draft.periodo;
    var anterior = materia.esquema || null;

    if (!comps.length) {
      delete materia.esquema;                 // sem componentes = volta ao modo manual (n1..n4 ficam como estão)
    } else {
      var r = calcular(comps, cfg.notaMax);
      var chave = 'n' + periodo;
      if (r.media !== null) {
        materia[chave] = round2(r.media);     // sincroniza com a aba Notas
      } else if (anterior && anterior.media != null && anterior.periodo === periodo) {
        materia[chave] = '';                  // apagou todas as notas que tinham gerado a média
      }
      materia.esquema = { componentes: comps, periodo: periodo, media: r.media === null ? null : round2(r.media), atualizadoEm: Date.now() };
    }

    var nuvem = B.persistir();                // salva local, redesenha e sobe pro Firebase
    fechar(true);
    B.toast(comps.length ? 'Esquema salvo!' : 'Esquema removido');
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
    TEMPLATES: TEMPLATES,
    TIPOS: TIPOS,
    abrir: abrir
  };
})();
