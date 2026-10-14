/* agenda-ia.js — Hub Brain · IA dentro da Agenda
   FAB 🤖 + sheet de chat com contexto completo da agenda.
   Histórico SÓ NA SESSÃO (perde ao recarregar a página).
   Botão voltar do celular fecha o modal em vez de sair. */

(function () {
  'use strict';

  var $ = (id) => document.getElementById(id);
  var ocupado = false;

  /* Histórico em memória — não vai pro localStorage.
     Zera quando você recarrega a página ou fecha o app. */
  var histSessao = [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function inline(s) {
    return s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }
  function mdToHtml(md) {
    var linhas = String(md).replace(/\r/g, '').split('\n');
    var html = '', lista = null;
    function fechar() { if (lista) { html += '</' + lista + '>'; lista = null; } }
    function abrir(t) { if (lista !== t) { fechar(); html += '<' + t + '>'; lista = t; } }
    for (var i = 0; i < linhas.length; i++) {
      var l = linhas[i].replace(/\s+$/, ''), m;
      if (!l.trim()) { fechar(); continue; }
      if ((m = l.match(/^\s{0,3}(#{1,6})\s+(.*)$/))) { fechar(); var nv = Math.min(m[1].length, 3) + 1; html += '<h' + nv + '>' + inline(esc(m[2])) + '</h' + nv + '>'; continue; }
      if ((m = l.match(/^(\s*)[-*•]\s+(.*)$/))) { abrir('ul'); html += '<li>' + inline(esc(m[2])) + '</li>'; continue; }
      if ((m = l.match(/^(\s*)\d+[.)]\s+(.*)$/))) { abrir('ol'); html += '<li>' + inline(esc(m[2])) + '</li>'; continue; }
      fechar(); html += '<p>' + inline(esc(l.trim())) + '</p>';
    }
    fechar();
    return html;
  }

  /* ─────────── Contexto (agenda inteira) ─────────── */
  function contextoUsuario() {
    try {
      var ag = window.__agenda;
      if (!ag || !ag.S || !Array.isArray(ag.S.tarefas)) return '';
      var hoje = ag.Core && ag.Core.dataLocal ? ag.Core.dataLocal() : new Date().toISOString().split('T')[0];
      var todas = ag.S.tarefas;
      if (!todas.length) return '\n\nContexto: o aluno não tem tarefas na agenda.';

      var pendentes = todas.filter(t => !t.concluida);
      var concluidas = todas.filter(t => t.concluida);
      var atrasadas = pendentes.filter(t => t.dataFim && t.dataFim < hoje);

      pendentes.sort((a, b) => (a.dataFim || '9999') < (b.dataFim || '9999') ? -1 : 1);

      var cortar = (s) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > 120 ? s.slice(0, 117) + '...' : s; };
      var fmt = (t) => '- ' + (t.nome || 'Sem título') + ' (' + (t.materia || 'Geral') + ', ' + (t.tipo || 'tarefa') + ', prazo ' + (t.dataFim || 'sem prazo') + (t.bimestre ? ' [' + t.bimestre + 'º BIM]' : '') + ')' + (t.descricao ? ' — "' + cortar(t.descricao) + '"' : '');

      var linhas = [];
      linhas.push('Agenda do aluno (hoje é ' + hoje + '):');
      linhas.push('Total: ' + todas.length + ' · Pendentes: ' + pendentes.length + ' · Concluídas: ' + concluidas.length + (atrasadas.length ? ' · Atrasadas: ' + atrasadas.length : ''));
      linhas.push('');
      if (pendentes.length) {
        linhas.push('PENDENTES (mais urgentes primeiro):');
        pendentes.slice(0, 40).forEach(t => linhas.push(fmt(t)));
        if (pendentes.length > 40) linhas.push('(+ ' + (pendentes.length - 40) + ' outras)');
        linhas.push('');
      }
      if (concluidas.length) {
        linhas.push('CONCLUÍDAS RECENTES:');
        concluidas.sort((a, b) => (b.concluidaEm || 0) - (a.concluidaEm || 0));
        concluidas.slice(0, 15).forEach(t => linhas.push('✓ ' + fmt(t)));
      }
      return '\n\n' + linhas.join('\n');
    } catch (e) { return ''; }
  }

  var SISTEMA = [
    'Você é o assistente do Hub Brain na página da Agenda.',
    'O aluno está organizando tarefas, prazos e matérias.',
    'Use o contexto da agenda que vem abaixo pra responder com precisão. Ele contém TODAS as tarefas (feitas e pendentes), com matéria, tipo, prazo, bimestre e descrição.',
    'Se o aluno perguntar sobre quantidade, matéria, atraso, progresso ou organização, use os números do contexto.',
    'Responda em português do Brasil, curto e direto (até ~120 palavras).',
    'Pode usar **negrito** e listas com "-". Não use tabelas.'
  ].join(' ');

  /* ─────────── Sheet ─────────── */
  var sheet = null;

  function montarSheet() {
    if (sheet) return sheet;
    var ov = document.createElement('div');
    ov.className = 'ag-ia-ov';
    ov.innerHTML = [
      '<div class="ag-ia-sheet" role="dialog" aria-modal="true">',
        '<div class="ag-ia-handle"></div>',
        '<div class="ag-ia-head">',
          '<div class="ag-ia-head-txt">',
            '<span class="ag-ia-titulo">🤖 Assistente</span>',
            '<span class="ag-ia-sub">Pergunte sobre suas tarefas</span>',
          '</div>',
          '<button class="ag-ia-btn-key" type="button" title="Chave da IA" aria-label="Chave da IA">🔑</button>',
          '<button class="ag-ia-btn-x" type="button" aria-label="Fechar">✕</button>',
        '</div>',
        '<div class="ag-ia-chat" id="ag-ia-chat"></div>',
        '<div class="ag-ia-sugestoes" id="ag-ia-sugestoes"></div>',
        '<div class="ag-ia-input-row">',
          '<input type="text" class="ag-ia-input" id="ag-ia-input" placeholder="Ex: o que eu faço primeiro hoje?" maxlength="300">',
          '<button class="ag-ia-btn-send" type="button" id="ag-ia-send" aria-label="Enviar">',
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
          '</button>',
        '</div>',
      '</div>'
    ].join('');
    document.body.appendChild(ov);

    sheet = { ov, chat: ov.querySelector('#ag-ia-chat'), sug: ov.querySelector('#ag-ia-sugestoes'), input: ov.querySelector('#ag-ia-input'), send: ov.querySelector('#ag-ia-send') };

    ov.addEventListener('click', e => { if (e.target === ov) fecharIA(); });
    ov.querySelector('.ag-ia-btn-x').addEventListener('click', fecharIA);
    ov.querySelector('.ag-ia-btn-key').addEventListener('click', function () {
      if (window.HBIA && window.HBIA.abrirModalChave) window.HBIA.abrirModalChave('manual');
    });
    sheet.send.addEventListener('click', function () { enviar(); });
    sheet.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ov.classList.contains('on')) fecharIA();
    });

    return sheet;
  }

  function sugerirAcoes() {
    var s = ['O que eu faço primeiro hoje?', 'Tenho algo atrasado?', 'Qual matéria tem mais pendências?', 'Me ajuda a organizar o dia'];
    sheet.sug.innerHTML = s.map(t => '<button class="ag-ia-chip" type="button" data-sug="' + esc(t) + '">' + esc(t) + '</button>').join('');
  }

  function bolha(role, texto) {
    var d = document.createElement('div');
    d.className = 'ag-ia-bolha ' + (role === 'u' ? 'user' : 'ia');
    if (role === 'u') d.textContent = texto;
    else d.innerHTML = mdToHtml(texto);
    sheet.chat.appendChild(d);
    sheet.chat.scrollTop = sheet.chat.scrollHeight;
    return d;
  }

  function carregarHistorico() {
    sheet.chat.innerHTML = '';
    if (!histSessao.length) {
      // Primeira vez nessa sessão — mostra a saudação
      bolha('ia', 'Oi! Sou o assistente da Agenda. **Como posso ajudar?**\n\nPosso te ajudar a priorizar, ver o que está atrasado, organizar o dia ou tirar dúvidas.');
    } else {
      // Mesma sessão — restaura o que já foi dito
      histSessao.forEach(m => bolha(m.r, m.t));
    }
  }

  function abrirIA() {
    if (sheet && sheet.ov.classList.contains('on')) return;
    montarSheet();
    carregarHistorico();
    sugerirAcoes();
    sheet.ov.classList.add('on');
    document.body.classList.add('ag-travado');
    // Empurra um estado no histórico pra que o botão voltar feche o modal
    try { history.pushState({ agendaIA: true }, ''); } catch (e) {}
    setTimeout(() => sheet.input.focus(), 200);
  }

  function fecharIA() {
    if (!sheet) return;
    var estava = sheet.ov.classList.contains('on');
    sheet.ov.classList.remove('on');
    document.body.classList.remove('ag-travado');
    // Se o modal estava aberto, desfaz o estado que empurramos
    if (estava && history.state && history.state.agendaIA) {
      try { history.back(); } catch (e) {}
    }
  }

  async function enviar(textoForcado) {
    if (ocupado || !window.HBIA) return;
    var texto = (typeof textoForcado === 'string' ? textoForcado : sheet.input.value).trim();
    if (!texto) return;
    ocupado = true;
    sheet.send.disabled = true;
    if (typeof textoForcado !== 'string') sheet.input.value = '';

    histSessao.push({ r: 'u', t: texto });
    bolha('u', texto);

    var dig = document.createElement('div');
    dig.className = 'ag-ia-bolha ia ag-ia-digitando';
    dig.innerHTML = '<span class="ag-ia-spin"></span> pensando…';
    sheet.chat.appendChild(dig);
    sheet.chat.scrollTop = sheet.chat.scrollHeight;

    try {
      var sistema = SISTEMA + contextoUsuario();
      // Manda as últimas 9 mensagens da SESSÃO (não do localStorage)
      var mensagens = [{ role: 'system', content: sistema }].concat(
        histSessao.slice(-9).map(m => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.t }))
      );
      var resp = await window.HBIA.chat({ messages: mensagens, temperature: 0.5, maxTokens: 1200, esforco: 'low' });
      dig.remove();
      bolha('ia', resp);
      histSessao.push({ r: 'ia', t: resp });
    } catch (e) {
      dig.remove();
      var msg = window.HBIA.erroAmigavel ? window.HBIA.erroAmigavel(e) : 'Erro ao falar com a IA.';
      bolha('ia', '⚠️ ' + msg);
      histSessao.pop();   // descarta a pergunta que falhou
    } finally {
      ocupado = false;
      sheet.send.disabled = false;
      sheet.input.focus();
    }
  }

  // Sugestões clicáveis
  document.addEventListener('click', function (e) {
    var chip = e.target.closest && e.target.closest('.ag-ia-chip');
    if (chip) enviar(chip.dataset.sug);
  });

  /* ─────────── FAB ─────────── */
  function montarFab() {
    var fab = document.createElement('button');
    fab.className = 'ag-ia-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Abrir assistente IA');
    fab.textContent = '🤖';
    fab.addEventListener('click', abrirIA);
    document.body.appendChild(fab);
  }

  /* ─────────── Botão voltar do celular ─────────── */
  // Quando o aluno aperta voltar com o modal aberto, fecha o modal
  // em vez de sair da agenda. Se o modal não tá aberto, deixa o
  // comportamento padrão do navegador acontecer.
  window.addEventListener('popstate', function () {
    if (sheet && sheet.ov.classList.contains('on')) {
      // Fecha sem mexer no histórico (o navegador já consumiu o estado)
      sheet.ov.classList.remove('on');
      document.body.classList.remove('ag-travado');
    }
  });

  /* ─────────── Init ─────────── */
  function iniciar() {
    if (!window.HBIA) {
      var s = document.createElement('script');
      s.src = 'ia-config.js';
      s.onload = function () { montarFab(); };
      document.head.appendChild(s);
    } else {
      montarFab();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  window.__agendaIA = { abrir: abrirIA, fechar: fecharIA };
})();
