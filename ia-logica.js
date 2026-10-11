/* ia-logica.js — Hub Brain · Estudos & IA
   Script NORMAL (não module). Requer ia-config.js carregado antes (window.HBIA).
   Modos: Simulado · Tira-Dúvidas (chat) · Explicador · Resumidor */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var STORAGE_CHAT = 'hb_chat_hist_v2';
  var LIMITE_TEXTO = 10000; // caracteres enviados ao Explicador/Resumidor
  var ABAS = ['simulado', 'chat', 'explicador', 'resumidor'];

  var estado = { qtd: 10, nivel: 'medio', formato: 'bullets' };
  var ocupado = {};
  var simuladoAtual = { total: 0, nivel: 'medio' };
  var acertos = 0;
  var respondidas = 0;

  /* ═══════════════ UTILITÁRIOS ═══════════════ */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Markdown mínimo e SEGURO: escapa tudo primeiro, depois aplica só as tags que nós geramos.
  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  }

  function mdToHtml(md) {
    var linhas = String(md).replace(/\r/g, '').split('\n');
    var html = '';
    var lista = null; // 'ul' | 'ol'
    function fechar() { if (lista) { html += '</' + lista + '>'; lista = null; } }
    function abrir(tipo) {
      if (lista !== tipo) { fechar(); html += '<' + tipo + '>'; lista = tipo; }
    }

    for (var i = 0; i < linhas.length; i++) {
      var l = linhas[i].replace(/\s+$/, '');
      var m;
      if (!l.trim()) { fechar(); continue; }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { fechar(); html += '<hr>'; continue; }
      if ((m = l.match(/^\s{0,3}(#{1,6})\s+(.*)$/))) {
        fechar();
        var nivel = Math.min(m[1].length, 3) + 1; // # → h2, ## → h3, ### → h4
        html += '<h' + nivel + '>' + inline(esc(m[2])) + '</h' + nivel + '>';
        continue;
      }
      if ((m = l.match(/^(\s*)[-*•]\s+(.*)$/))) {
        abrir('ul');
        html += '<li' + (m[1].length >= 2 ? ' class="sub"' : '') + '>' + inline(esc(m[2])) + '</li>';
        continue;
      }
      if ((m = l.match(/^(\s*)\d+[.)]\s+(.*)$/))) {
        abrir('ol');
        html += '<li' + (m[1].length >= 2 ? ' class="sub"' : '') + '>' + inline(esc(m[2])) + '</li>';
        continue;
      }
      fechar();
      html += '<p>' + inline(esc(l.trim())) + '</p>';
    }
    fechar();
    return html;
  }

  function setBusy(btnId, busy, rotuloOcupado) {
    var b = $(btnId);
    if (!b) return;
    if (!b.dataset.rotulo) b.dataset.rotulo = b.textContent;
    b.disabled = busy;
    b.textContent = busy ? rotuloOcupado : b.dataset.rotulo;
  }

  function cardLoading(txt) {
    var d = document.createElement('div');
    d.className = 'dt-questao-card hbia-loading';
    var s = document.createElement('span');
    s.className = 'hbia-spinner';
    d.appendChild(s);
    d.appendChild(document.createTextNode(txt));
    return d;
  }

  function cardErro(e) {
    var d = document.createElement('div');
    d.className = 'dt-questao-card hbia-erro';
    d.textContent = '⚠️ ' + window.HBIA.erroAmigavel(e);
    return d;
  }

  async function copiar(texto, btn) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch (e) {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
    }
    var antes = btn.textContent;
    btn.textContent = '✓ Copiado';
    setTimeout(function () { btn.textContent = antes; }, 1600);
  }

  function renderResultado(out, md, aviso) {
    out.innerHTML = '';
    var card = document.createElement('div');
    card.className = 'dt-questao-card hbia-resultado';
    if (aviso) {
      var av = document.createElement('div');
      av.className = 'hbia-aviso';
      av.textContent = aviso;
      card.appendChild(av);
    }
    var corpo = document.createElement('div');
    corpo.className = 'hbia-md';
    corpo.innerHTML = mdToHtml(md);
    card.appendChild(corpo);

    var acoes = document.createElement('div');
    acoes.className = 'hbia-acoes';
    var bc = document.createElement('button');
    bc.type = 'button';
    bc.className = 'hbia-btn-mini';
    bc.textContent = '📋 Copiar';
    bc.addEventListener('click', function () { copiar(md, bc); });
    acoes.appendChild(bc);
    card.appendChild(acoes);
    out.appendChild(card);
    if (card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ═══════════════ MENU / ABAS / AVISOS ═══════════════ */

  window.abrirSeuMenuLateral = function () {
    var menu = document.querySelector('.dt-sidebar') || document.querySelector('nav');
    if (menu) menu.classList.toggle('open');
  };

  function trocarAba(aba) {
    ABAS.forEach(function (a) {
      var p = $('painel-' + a), t = $('tab-' + a);
      if (p) p.classList.toggle('active', a === aba);
      if (t) t.classList.toggle('active', a === aba);
    });
  }
  window.trocarAba = trocarAba;

  window.mostrarAviso = function (txt) {
    var aviso = $('modal-aviso'), t = $('txt-aviso');
    if (aviso && t) { t.textContent = txt; aviso.style.display = 'flex'; }
  };

  window.confirmarLimpeza = function () {
    try {
      localStorage.removeItem(STORAGE_CHAT);
      localStorage.removeItem('dt_chat_hist'); // formato antigo (HTML cru)
    } catch (e) {}
    ['container-questoes', 'resultado-explicador', 'resultado-resumidor'].forEach(function (id) {
      var el = $(id); if (el) el.innerHTML = '';
    });
    var box = $('chat-box');
    if (box) { box.innerHTML = ''; addBolha('ia', 'Histórico limpo! Manda sua dúvida.'); }
    var m = $('modal-lixeira');
    if (m) m.style.display = 'none';
  };

  /* ═══════════════ CHIPS (qtd / nível / formato) ═══════════════ */

  document.addEventListener('click', function (ev) {
    var chip = ev.target.closest && ev.target.closest('.hbia-chip');
    if (!chip) return;
    var grupo = chip.parentElement.dataset.grupo;
    if (!grupo) return;
    chip.parentElement.querySelectorAll('.hbia-chip').forEach(function (c) { c.classList.remove('active'); });
    chip.classList.add('active');
    estado[grupo] = grupo === 'qtd' ? Number(chip.dataset.valor) : chip.dataset.valor;
  });

  /* ═══════════════ SIMULADO ═══════════════ */

  var NIVEIS = {
    facil: 'Nível FÁCIL: conceitos básicos e definições diretas, enunciados curtos, alternativas erradas claramente erradas.',
    medio: 'Nível MÉDIO, no padrão ENEM/vestibular: exige compreensão e aplicação dos conceitos, com alternativas erradas plausíveis.',
    dificil: 'Nível DIFÍCIL: exige interpretação, raciocínio em várias etapas ou relacionar conceitos, com alternativas erradas muito plausíveis.'
  };

  function promptSimulado(tema, n, nivel) {
    return [
      'Você é um professor brasileiro elaborando um simulado de múltipla escolha.',
      'Tema: "' + tema + '"',
      'Quantidade: exatamente ' + n + ' questões.',
      NIVEIS[nivel] || NIVEIS.medio,
      'Regras:',
      '- Cada questão tem exatamente 4 alternativas e só UMA está correta.',
      '- Varie a posição da alternativa correta.',
      '- Não escreva letras (A, B, C, D) nem "alternativa X" dentro das alternativas ou da explicação.',
      '- A explicação ("e") tem no máximo 2 frases e diz por que a correta está certa.',
      '- Escreva tudo em português do Brasil, sem Markdown.',
      'Responda SOMENTE com um objeto JSON válido, sem nenhum texto antes ou depois, neste formato:',
      '{"questoes":[{"p":"enunciado","o":["alternativa 1","alternativa 2","alternativa 3","alternativa 4"],"c":0,"e":"explicação"}]}',
      '"c" é o índice (0 a 3) da alternativa correta dentro de "o".'
    ].join('\n');
  }

  function embaralhar(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // Aceita array puro ou objeto ({questoes:[...]}), normaliza e descarta questões inválidas.
  function extrairQuestoes(dado) {
    var lista = dado;
    if (!Array.isArray(lista) && lista && typeof lista === 'object') {
      lista = lista.questoes || lista.questions || lista.perguntas || lista.quiz;
      if (!Array.isArray(lista)) {
        var vals = Object.keys(dado).map(function (k) { return dado[k]; });
        lista = vals.filter(Array.isArray)[0];
      }
    }
    if (!Array.isArray(lista)) return [];

    var saida = [];
    lista.forEach(function (q) {
      if (!q || typeof q !== 'object') return;
      var p = String(q.p != null ? q.p : (q.pergunta != null ? q.pergunta : (q.question || ''))).trim();
      var o = q.o != null ? q.o : (q.opcoes || q.alternativas || q.options);
      if (o && !Array.isArray(o) && typeof o === 'object') o = Object.keys(o).map(function (k) { return o[k]; });
      o = Array.isArray(o)
        ? o.map(function (x) { return String(x).replace(/^\s*[A-Da-d][).\-:]\s+/, '').trim(); }).filter(Boolean)
        : [];

      var c = q.c != null ? q.c : (q.correta != null ? q.correta : (q.resposta != null ? q.resposta : q.answer));
      if (typeof c === 'string') {
        var s = c.trim();
        if (/^[A-Da-d]$/.test(s)) c = s.toUpperCase().charCodeAt(0) - 65;
        else if (/^\d+$/.test(s)) c = Number(s);
        else c = o.findIndex(function (x) { return x.toLowerCase() === s.toLowerCase(); });
      }
      c = Number(c);
      var e = String(q.e != null ? q.e : (q.explicacao != null ? q.explicacao : (q.explanation || ''))).trim();

      if (!p || o.length < 2 || !Number.isInteger(c) || c < 0 || c >= o.length) return;

      // embaralha as alternativas (a IA tende a viciar a posição da correta)
      var idx = embaralhar(o.map(function (_, i) { return i; }));
      saida.push({
        p: p,
        o: idx.map(function (i) { return o[i]; }),
        c: idx.indexOf(c),
        e: e
      });
    });
    return saida;
  }

  function renderQuestao(q, i) {
    var div = document.createElement('div');
    div.className = 'dt-questao-card';
    var p = document.createElement('p');
    p.style.marginBottom = '15px';
    var b = document.createElement('b');
    b.textContent = (i + 1) + '. ';
    p.appendChild(b);
    p.appendChild(document.createTextNode(q.p));
    div.appendChild(p);

    q.o.forEach(function (opt, idx) {
      var btn = document.createElement('button');
      btn.className = 'dt-opt-btn';
      btn.textContent = 'ABCDEF'.charAt(idx) + ') ' + opt;
      btn.addEventListener('click', function () { responder(div, q, idx); });
      div.appendChild(btn);
    });
    return div;
  }

  function responder(div, q, idx) {
    var btns = div.querySelectorAll('.dt-opt-btn');
    btns.forEach(function (b) { b.disabled = true; });
    respondidas++;

    if (idx === q.c) {
      acertos++;
      btns[idx].classList.add('hbia-certa');
    } else {
      btns[idx].classList.add('hbia-errada');
      btns[q.c].classList.add('hbia-gabarito');
    }

    if (q.e) {
      var aula = document.createElement('div');
      aula.className = 'dt-mini-aula';
      var b = document.createElement('b');
      b.textContent = '🎓 Mini Aula:';
      aula.appendChild(b);
      aula.appendChild(document.createElement('br'));
      aula.appendChild(document.createTextNode(q.e));
      div.appendChild(aula);
    }

    if (respondidas === simuladoAtual.total) finalizarSimulado();
  }

  // Tabela de XP por aproveitamento (mesma regra de antes, agora proporcional à quantidade).
  //   100% → +150 · ≥70% → +60 · ≥50% → +20 · ≥30% → −30 · abaixo → −80   (base de 10 questões)
  // Ganhos são multiplicados pelo nível (fácil ×0.5 · médio ×1 · difícil ×1.5).
  function calcularXP(pct, total, nivel) {
    var base;
    if (pct >= 1) base = 150;
    else if (pct >= 0.7) base = 60;
    else if (pct >= 0.5) base = 20;
    else if (pct >= 0.3) base = -30;
    else base = -80;
    var xp = base * (total / 10);
    if (xp > 0) xp *= ({ facil: 0.5, medio: 1, dificil: 1.5 }[nivel] || 1);
    return Math.round(xp);
  }

  async function aplicarXP(xp) {
    var email = (localStorage.getItem('dt_user_email') || '').toLowerCase();
    if (!email || email === 'null' || xp === 0) return false;
    try {
      var fb = await window.HBIA.firebase();
      var fs = fb.fsMod;
      var ref = fs.doc(fb.db, 'notas', email);
      // transação: XP negativo nunca deixa o total abaixo de zero
      await fs.runTransaction(fb.db, async function (tx) {
        var snap = await tx.get(ref);
        var atual = snap.exists() ? Number(snap.data().xp) || 0 : 0;
        tx.update(ref, { xp: Math.max(0, atual + xp) });
      });
      return true;
    } catch (e) {
      console.error('Erro ao aplicar XP:', e);
      return false;
    }
  }

  async function finalizarSimulado() {
    var total = simuladoAtual.total;
    var pct = acertos / total;
    var xp = calcularXP(pct, total, simuladoAtual.nivel);
    var logado = !!(localStorage.getItem('dt_user_email') || '').replace('null', '');
    var gravou = logado ? await aplicarXP(xp) : false;

    var card = document.createElement('div');
    card.className = 'dt-questao-card hbia-final';
    var score = document.createElement('div');
    score.className = 'hbia-score';
    score.textContent = acertos + '/' + total;
    var linha = document.createElement('div');
    linha.className = 'hbia-final-linha';
    var txt = 'Aproveitamento: ' + Math.round(pct * 100) + '%';
    if (gravou) txt += ' · ' + (xp > 0 ? '+' : '') + xp + ' XP no ranking';
    else if (!logado) txt += ' · entre na sua conta para ganhar XP';
    linha.textContent = txt;
    var novo = document.createElement('button');
    novo.type = 'button';
    novo.className = 'dt-btn-gerar';
    novo.style.marginTop = '14px';
    novo.textContent = 'NOVO SIMULADO';
    novo.addEventListener('click', function () {
      $('container-questoes').innerHTML = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      var campo = $('campo-tema'); if (campo) campo.focus();
    });
    card.appendChild(score);
    card.appendChild(linha);
    card.appendChild(novo);
    $('container-questoes').appendChild(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function gerarSimulado() {
    var campo = $('campo-tema');
    var tema = (campo.value || '').trim().slice(0, 200);
    if (!tema) return window.mostrarAviso('⚠️ Digite um tema primeiro!');
    if (ocupado.simulado) return;
    ocupado.simulado = true;
    setBusy('btn-gerar', true, 'GERANDO…');

    acertos = 0;
    respondidas = 0;
    var n = estado.qtd, nivel = estado.nivel;
    var container = $('container-questoes');
    container.innerHTML = '';
    container.appendChild(cardLoading('Preparando seu simulado de ' + n + ' questões…'));

    try {
      var texto = await window.HBIA.chat({
        messages: [{ role: 'user', content: promptSimulado(tema, n, nivel) }],
        json: true,
        temperature: 0.7,
        maxTokens: n * 260 + 1200, // inclui os tokens de raciocínio do modelo
        esforco: 'low'
      });

      var questoes = [];
      try { questoes = extrairQuestoes(window.HBIA.parseJSONRobusto(texto)); } catch (e) { questoes = []; }
      if (!questoes.length) {
        throw new window.HBIA.Erro('formato', 'A IA respondeu num formato inesperado. Toque em GERAR de novo.');
      }

      simuladoAtual = { total: questoes.length, nivel: nivel };
      container.innerHTML = '';
      questoes.forEach(function (q, i) { container.appendChild(renderQuestao(q, i)); });
    } catch (e) {
      console.error('[simulado]', e);
      container.innerHTML = '';
      container.appendChild(cardErro(e));
    } finally {
      ocupado.simulado = false;
      setBusy('btn-gerar', false);
    }
  }
  window.gerarSimulado = gerarSimulado;

  /* ═══════════════ CHAT (TIRA-DÚVIDAS) ═══════════════ */

  var SISTEMA_CHAT =
    'Você é o tutor do Hub Brain, um app para estudantes brasileiros do ensino médio. ' +
    'Responda em português do Brasil, de forma curta, clara e acadêmica (até ~150 palavras). ' +
    'Pode usar **negrito** e listas com "-". Não use tabelas.';

  function lerHist() {
    try {
      var a = JSON.parse(localStorage.getItem(STORAGE_CHAT) || '[]');
      return Array.isArray(a)
        ? a.filter(function (m) { return m && (m.r === 'u' || m.r === 'ia') && typeof m.t === 'string'; })
        : [];
    } catch (e) { return []; }
  }
  function salvarHist(h) {
    try { localStorage.setItem(STORAGE_CHAT, JSON.stringify(h.slice(-40))); } catch (e) {}
  }

  function addBolha(role, texto) {
    var box = $('chat-box');
    var d = document.createElement('div');
    d.className = 'dt-bolha ' + (role === 'u' ? 'user' : 'ia');
    if (role === 'u') d.textContent = texto;
    else d.innerHTML = mdToHtml(texto);
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
    return d;
  }

  async function enviarMensagem() {
    var input = $('chat-input');
    var texto = (input.value || '').trim();
    if (!texto || ocupado.chat) return;
    ocupado.chat = true;
    input.value = '';

    var hist = lerHist();
    hist.push({ r: 'u', t: texto });
    addBolha('u', texto);

    var digitando = document.createElement('div');
    digitando.className = 'dt-bolha ia';
    var sp = document.createElement('span');
    sp.className = 'hbia-spinner';
    digitando.appendChild(sp);
    digitando.appendChild(document.createTextNode('pensando…'));
    $('chat-box').appendChild(digitando);
    $('chat-box').scrollTop = $('chat-box').scrollHeight;

    var mensagens = [{ role: 'system', content: SISTEMA_CHAT }].concat(
      hist.slice(-11).map(function (m) { return { role: m.r === 'u' ? 'user' : 'assistant', content: m.t }; })
    );

    try {
      var resp = await window.HBIA.chat({ messages: mensagens, temperature: 0.5, maxTokens: 1500, esforco: 'low' });
      digitando.remove();
      addBolha('ia', resp);
      hist.push({ r: 'ia', t: resp });
      salvarHist(hist);
    } catch (e) {
      console.error('[chat]', e);
      digitando.remove();
      addBolha('ia', '⚠️ ' + window.HBIA.erroAmigavel(e));
      hist.pop(); // não guarda a pergunta que falhou
      salvarHist(hist);
    } finally {
      ocupado.chat = false;
    }
  }
  window.enviarMensagem = enviarMensagem;

  /* ═══════════════ EXPLICADOR e RESUMIDOR ═══════════════ */

  function promptExplicador(texto) {
    return [
      'Você é um professor paciente explicando para um estudante do ensino médio brasileiro.',
      'Explique o conteúdo abaixo (pode ser um texto, um exercício ou uma dúvida).',
      'Responda em português do Brasil, em Markdown, com EXATAMENTE estas 4 seções, nesta ordem:',
      '## 📌 Resumo',
      '(2 a 3 frases)',
      '## 🧩 Explicação passo a passo',
      '(passos numerados, em linguagem simples)',
      '## 💡 Exemplo prático',
      '(um exemplo concreto do dia a dia ou um exercício resolvido)',
      '## ⚠️ Pegadinhas',
      '(3 a 5 erros comuns ou confusões frequentes, em tópicos)',
      'Se for um exercício, resolva mostrando cada passo e confira o resultado no final.',
      'Se faltar informação, diga o que você assumiu. Não use tabelas.',
      '',
      'CONTEÚDO:',
      '"""',
      texto,
      '"""'
    ].join('\n');
  }

  var FORMATOS_RESUMO = {
    bullets:
      'Resuma em tópicos curtos, agrupados por subtítulos "## ". Cada tópico começa com "- " e tem no máximo 20 palavras. ' +
      'Termine com a seção "## ✅ Para lembrar" com os 3 pontos mais importantes.',
    mapa:
      'Monte um MAPA MENTAL em texto: a primeira linha é "# 🧠 " seguida do tema central; depois os ramos principais como "## " com um emoji; ' +
      'sob cada ramo, tópicos curtos com "- " e, se precisar, sub-tópicos com dois espaços antes do "- " (no máximo 2 níveis). Frases bem curtas.',
    paragrafo:
      'Resuma em um ÚNICO parágrafo de texto corrido (até ~120 palavras), sem listas, sem títulos e sem negrito.'
  };

  function promptResumidor(texto, formato) {
    return [
      'Você é um assistente de estudos que resume textos para estudantes brasileiros.',
      FORMATOS_RESUMO[formato] || FORMATOS_RESUMO.bullets,
      'Seja fiel ao texto: não invente informações. Responda em português do Brasil. Não use tabelas.',
      '',
      'TEXTO:',
      '"""',
      texto,
      '"""'
    ].join('\n');
  }

  async function executarModo(cfg) {
    var area = $(cfg.areaId);
    var texto = (area.value || '').trim();
    if (!texto) return window.mostrarAviso(cfg.vazio);
    if (ocupado[cfg.nome]) return;

    var aviso = '';
    if (texto.length > LIMITE_TEXTO) {
      texto = texto.slice(0, LIMITE_TEXTO);
      aviso = 'O texto era grande demais: usei só os primeiros ' + LIMITE_TEXTO.toLocaleString('pt-BR') + ' caracteres.';
    }

    ocupado[cfg.nome] = true;
    setBusy(cfg.btnId, true, cfg.rotuloOcupado);
    var out = $(cfg.resultadoId);
    out.innerHTML = '';
    out.appendChild(cardLoading(cfg.carregando));

    try {
      var resp = await window.HBIA.chat({
        messages: [{ role: 'user', content: cfg.prompt(texto) }],
        temperature: cfg.temperatura,
        maxTokens: cfg.maxTokens,
        esforco: cfg.esforco
      });
      renderResultado(out, resp, aviso);
    } catch (e) {
      console.error('[' + cfg.nome + ']', e);
      out.innerHTML = '';
      out.appendChild(cardErro(e));
    } finally {
      ocupado[cfg.nome] = false;
      setBusy(cfg.btnId, false);
    }
  }

  function explicar() {
    return executarModo({
      nome: 'explicador', areaId: 'explicador-texto', btnId: 'btn-explicar', resultadoId: 'resultado-explicador',
      vazio: '⚠️ Cole um texto, exercício ou dúvida primeiro!',
      rotuloOcupado: 'EXPLICANDO…', carregando: 'Preparando a explicação…',
      prompt: promptExplicador, temperatura: 0.4, maxTokens: 3500, esforco: 'medium'
    });
  }
  function resumir() {
    return executarModo({
      nome: 'resumidor', areaId: 'resumidor-texto', btnId: 'btn-resumir', resultadoId: 'resultado-resumidor',
      vazio: '⚠️ Cole um texto para resumir!',
      rotuloOcupado: 'RESUMINDO…', carregando: 'Resumindo…',
      prompt: function (t) { return promptResumidor(t, estado.formato); },
      temperatura: 0.3, maxTokens: 3000, esforco: 'low'
    });
  }
  window.explicar = explicar;
  window.resumir = resumir;

  /* ═══════════════ PRÉ-PREENCHIMENTO (usado pelo botão "🤖 Explicar" da Agenda) ═══════════════
     Outra página grava:  localStorage.hb_ia_prefill = JSON.stringify({ modo, texto, auto })
       modo: 'explicador' | 'resumidor' | 'chat' | 'simulado'    auto: true → já dispara */
  function aplicarPrefill() {
    var bruto;
    try { bruto = localStorage.getItem('hb_ia_prefill'); localStorage.removeItem('hb_ia_prefill'); } catch (e) { return; }
    if (!bruto) return;
    var p;
    try { p = JSON.parse(bruto); } catch (e) { return; }
    if (!p || typeof p.texto !== 'string' || ABAS.indexOf(p.modo) === -1) return;

    trocarAba(p.modo);
    var alvo = { explicador: 'explicador-texto', resumidor: 'resumidor-texto', chat: 'chat-input', simulado: 'campo-tema' }[p.modo];
    var el = $(alvo);
    if (el) { el.value = p.texto; el.dispatchEvent(new Event('input')); }
    if (p.auto) {
      if (p.modo === 'explicador') explicar();
      else if (p.modo === 'resumidor') resumir();
      else if (p.modo === 'chat') enviarMensagem();
      else if (p.modo === 'simulado') gerarSimulado();
    }
  }

  /* ═══════════════ INICIALIZAÇÃO ═══════════════ */

  function init() {
    // contadores de caracteres dos textareas
    document.querySelectorAll('textarea[data-contador]').forEach(function (ta) {
      var alvo = $(ta.dataset.contador);
      var atualizar = function () {
        if (!alvo) return;
        alvo.textContent = ta.value.length.toLocaleString('pt-BR') + ' / ' + LIMITE_TEXTO.toLocaleString('pt-BR');
        alvo.classList.toggle('estourou', ta.value.length > LIMITE_TEXTO);
      };
      ta.addEventListener('input', atualizar);
      atualizar();
    });

    // Enter envia no chat
    var ci = $('chat-input');
    if (ci) ci.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); enviarMensagem(); }
    });

    // histórico antigo era HTML cru no localStorage (risco de XSS): descartado
    try { localStorage.removeItem('dt_chat_hist'); } catch (e) {}

    var box = $('chat-box');
    if (box) {
      var hist = lerHist();
      if (!hist.length) addBolha('ia', 'Oi! Manda sua dúvida que eu explico. 🧠');
      hist.forEach(function (m) { addBolha(m.r, m.t); });
    }

    if (window.lucide) window.lucide.createIcons();
    aplicarPrefill();
  }

  // utilitários expostos para outras páginas (ex.: Agenda) e para testes
  window.HBIA.util = { esc: esc, mdToHtml: mdToHtml, extrairQuestoes: extrairQuestoes, calcularXP: calcularXP };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
