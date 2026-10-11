/* ia-config.js — Hub Brain · cliente da IA (Groq)
   Script NORMAL (não module). Carregar ANTES do ia-logica.js.
   Expõe window.HBIA.

   Como a chamada é feita:
   - Se o aluno colou a PRÓPRIA chave (localStorage.hb_groq_key) → chama a Groq direto do navegador.
   - Se não tem chave própria → chama a Netlify Function /.netlify/functions/groq,
     que usa a chave do servidor (GROQ_API_KEY) e exige usuário logado.
   - Se nenhuma das duas funcionar → abre o modal pedindo a chave e tenta de novo sozinho. */
(function () {
  'use strict';

  var PROXY_URL = '/.netlify/functions/groq';
  var GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  var GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models';
  var KEY_STORAGE = 'hb_groq_key';

  // Ordem de preferência. Se o 1º for descontinuado, tenta o seguinte automaticamente.
  // (llama-3.3-70b-versatile foi descontinuado pela Groq em 16/08/2026.)
  // Se mudar aqui, mude também MODELOS_PERMITIDOS em netlify/functions/groq.js.
  var MODELOS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

  var FIREBASE_CONFIG = {
    apiKey: 'AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc',
    authDomain: 'dt-scho0l.firebaseapp.com',
    projectId: 'dt-scho0l',
    storageBucket: 'dt-scho0l.firebasestorage.app',
    messagingSenderId: '78578509391',
    appId: '1:78578509391:web:7f5ede4f967ca8ce292c3a'
  };
  var FIREBASE_BASE = 'https://www.gstatic.com/firebasejs/10.7.1/';

  /* ───────── Erro padronizado ───────── */
  function HBIAError(code, message, status) {
    this.name = 'HBIAError';
    this.code = code;
    this.message = message;
    this.status = status || 0;
    this.stack = (new Error(message)).stack;
  }
  HBIAError.prototype = Object.create(Error.prototype);
  HBIAError.prototype.constructor = HBIAError;

  /* ───────── Chave do usuário ───────── */
  function getKey() {
    try { return (localStorage.getItem(KEY_STORAGE) || '').trim(); } catch (e) { return ''; }
  }
  function setKey(k) {
    try { localStorage.setItem(KEY_STORAGE, String(k).trim()); } catch (e) {}
  }
  function clearKey() {
    try { localStorage.removeItem(KEY_STORAGE); } catch (e) {}
  }
  function mascarar(k) {
    return k.length > 10 ? k.slice(0, 4) + '…' + k.slice(-4) : '••••';
  }

  /* ───────── Firebase (carregado só quando precisa) ───────── */
  var fbPromise = null;
  function carregarFirebase() {
    if (fbPromise) return fbPromise;
    fbPromise = (async function () {
      var mods = await Promise.all([
        import(FIREBASE_BASE + 'firebase-app.js'),
        import(FIREBASE_BASE + 'firebase-auth.js'),
        import(FIREBASE_BASE + 'firebase-firestore.js')
      ]);
      var appMod = mods[0], authMod = mods[1], fsMod = mods[2];
      var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FIREBASE_CONFIG);
      return {
        app: app,
        auth: authMod.getAuth(app),
        authMod: authMod,
        db: fsMod.getFirestore(app),
        fsMod: fsMod
      };
    })();
    fbPromise.catch(function () { fbPromise = null; });
    return fbPromise;
  }

  async function obterIdToken() {
    if (localStorage.getItem('dt_user_type') === 'local') return null; // visitante
    try {
      var fb = await carregarFirebase();
      var user = fb.auth.currentUser;
      if (!user) {
        user = await new Promise(function (resolve) {
          var off = fb.authMod.onAuthStateChanged(fb.auth, function (u) { off(); resolve(u); });
        });
      }
      return user ? await user.getIdToken() : null;
    } catch (e) {
      console.warn('[HBIA] não consegui obter o token do Firebase:', e);
      return null;
    }
  }

  /* ───────── Chamada à API ───────── */
  function erroDaResposta(status, data, propria) {
    var err = (data && data.error) || {};
    var code = String(err.code || '');
    var msg = String(err.message || '');

    if (code === 'model_decommissioned' || code === 'model_not_found' ||
        /decommission/i.test(msg) || (status === 404 && /model/i.test(msg))) {
      return new HBIAError('modelo', 'Modelo de IA indisponível.', status);
    }
    if (!propria && status === 404 && !code) {
      return new HBIAError('sem_funcao', 'O servidor de IA do Hub Brain não respondeu.', status);
    }
    if (status === 401 || status === 403) {
      if (propria) return new HBIAError('chave_invalida', 'A Groq recusou a chave.', status);
      if (code === 'auth_required' || code === 'invalid_token') {
        return new HBIAError('sem_chave', 'Entre novamente na sua conta ou use sua própria chave.', status);
      }
      return new HBIAError('erro', msg || 'Acesso negado.', status);
    }
    if (status === 503 && code === 'no_server_key') {
      return new HBIAError('sem_chave', 'A chave compartilhada do Hub Brain não está configurada.', status);
    }
    if (status === 429) {
      return new HBIAError('limite', 'Limite de uso da IA atingido. Espere um minuto e tente de novo (ou use sua própria chave grátis).', status);
    }
    if (status === 408 || status === 502 || status === 504) {
      return new HBIAError('timeout', 'A IA demorou demais. Tente com menos questões ou um texto menor.', status);
    }
    if (status === 413) {
      return new HBIAError('grande', 'O texto é grande demais para a IA.', status);
    }
    return new HBIAError('erro', msg || ('Erro da IA (' + status + ').'), status);
  }

  async function chamar(payload, chave) {
    var res;
    try {
      if (chave) {
        res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + chave, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        var token = await obterIdToken();
        if (!token) throw new HBIAError('sem_chave', 'Entre na sua conta ou use sua própria chave da Groq.');
        res = await fetch(PROXY_URL, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } catch (e) {
      if (e instanceof HBIAError) throw e;
      throw new HBIAError('rede', 'Sem conexão com a IA. Verifique sua internet.');
    }

    var data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw erroDaResposta(res.status, data, !!chave);

    var choice = data && data.choices && data.choices[0];
    var texto = choice && choice.message && choice.message.content;
    if (!texto || !String(texto).trim()) {
      if (choice && choice.finish_reason === 'length') {
        throw new HBIAError('cortado', 'A resposta foi cortada por ser longa demais. Tente pedir menos coisa por vez.');
      }
      throw new HBIAError('vazio', 'A IA devolveu uma resposta vazia. Tente de novo.');
    }
    return String(texto);
  }

  /**
   * chat({ messages, json, temperature, maxTokens, esforco }) → Promise<string>
   *  - json: true  → response_format json_object
   *  - esforco: 'low' | 'medium' | 'high' (raciocínio dos modelos gpt-oss)
   */
  async function chat(opts, jaPediuChave) {
    var payloadBase = {
      messages: opts.messages,
      temperature: opts.temperature == null ? 0.6 : opts.temperature,
      max_completion_tokens: opts.maxTokens || 1500,
      reasoning_effort: opts.esforco || 'low',
      include_reasoning: false
    };
    if (opts.json) payloadBase.response_format = { type: 'json_object' };

    var chave = getKey();
    var ultimoErro = null;

    for (var i = 0; i < MODELOS.length; i++) {
      try {
        var payload = Object.assign({}, payloadBase, { model: MODELOS[i] });
        return await chamar(payload, chave);
      } catch (e) {
        ultimoErro = e;
        if (e instanceof HBIAError && e.code === 'modelo') continue; // tenta o próximo modelo

        var precisaChave = e instanceof HBIAError &&
          (e.code === 'sem_chave' || e.code === 'chave_invalida' || e.code === 'sem_funcao');
        if (precisaChave && !jaPediuChave) {
          var salvou = await abrirModalChave(e.code);
          if (salvou) return chat(opts, true);
        }
        throw e;
      }
    }
    throw ultimoErro || new HBIAError('erro', 'Falha ao falar com a IA.');
  }

  function erroAmigavel(e) {
    if (e instanceof HBIAError) return e.message;
    return 'Algo deu errado ao falar com a IA. Tente de novo.';
  }

  /* ───────── Parser de JSON robusto ─────────
     Tira <think>, code fences, e como último recurso recorta do primeiro [ ao último ]
     (ou do primeiro { ao último }). Também conserta vírgula sobrando. */
  function parseJSONRobusto(texto) {
    if (texto == null) throw new Error('Resposta vazia');
    var t = String(texto).replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    var fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1].trim();
    else t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

    var tentativas = [t];
    var a = t.indexOf('['), b = t.lastIndexOf(']');
    if (a !== -1 && b > a) tentativas.push(t.slice(a, b + 1));
    var c = t.indexOf('{'), d = t.lastIndexOf('}');
    if (c !== -1 && d > c) tentativas.push(t.slice(c, d + 1));

    for (var i = 0; i < tentativas.length; i++) {
      var x = tentativas[i];
      try { return JSON.parse(x); } catch (e) {}
      try { return JSON.parse(x.replace(/,\s*([\]}])/g, '$1')); } catch (e) {}
    }
    throw new Error('JSON inválido');
  }

  /* ───────── Modal da chave ───────── */
  var modalEl = null;
  var promessaModal = null;
  var resolverModal = null;

  var MOTIVOS = {
    manual: 'Use sua própria chave da Groq. Ela fica salva só neste aparelho.',
    sem_chave: 'Para usar a IA, cole sua chave da Groq. É grátis e leva 1 minuto.',
    sem_funcao: 'O servidor do Hub Brain não respondeu. Você pode usar sua própria chave da Groq.',
    chave_invalida: 'A chave salva foi recusada pela Groq. Cole uma nova.'
  };

  function montarModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'hbia-overlay';
    modalEl.id = 'hbia-modal-chave';
    modalEl.innerHTML =
      '<div class="hbia-modal-box" role="dialog" aria-modal="true" aria-labelledby="hbia-modal-titulo">' +
        '<h3 id="hbia-modal-titulo">🔑 Chave da Groq</h3>' +
        '<p id="hbia-modal-motivo" class="hbia-modal-txt"></p>' +
        '<p id="hbia-modal-atual" class="hbia-modal-atual"></p>' +
        '<input type="password" id="hbia-input-chave" class="hbia-input-chave" placeholder="gsk_..." autocomplete="off" autocapitalize="off" spellcheck="false">' +
        '<a class="hbia-link" href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">Pegar chave grátis em console.groq.com/keys →</a>' +
        '<p id="hbia-modal-status" class="hbia-modal-status"></p>' +
        '<div class="hbia-modal-acoes">' +
          '<button type="button" id="hbia-btn-cancelar" class="hbia-btn-sec">Cancelar</button>' +
          '<button type="button" id="hbia-btn-salvar" class="hbia-btn-pri">Salvar</button>' +
        '</div>' +
        '<button type="button" id="hbia-btn-remover" class="hbia-btn-remover">Remover chave salva</button>' +
      '</div>';
    document.body.appendChild(modalEl);

    modalEl.addEventListener('click', function (ev) { if (ev.target === modalEl) fecharModal(false); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && modalEl.classList.contains('aberto')) fecharModal(false);
    });
    modalEl.querySelector('#hbia-btn-cancelar').addEventListener('click', function () { fecharModal(false); });
    modalEl.querySelector('#hbia-btn-salvar').addEventListener('click', salvarDoModal);
    modalEl.querySelector('#hbia-input-chave').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') salvarDoModal();
    });
    modalEl.querySelector('#hbia-btn-remover').addEventListener('click', function () {
      clearKey();
      fecharModal(false);
    });
    return modalEl;
  }

  function statusModal(txt, tipo) {
    var el = modalEl.querySelector('#hbia-modal-status');
    el.textContent = txt || '';
    el.className = 'hbia-modal-status' + (tipo ? ' ' + tipo : '');
  }

  function fecharModal(salvou) {
    if (!modalEl) return;
    modalEl.classList.remove('aberto');
    var r = resolverModal;
    resolverModal = null;
    promessaModal = null;
    if (r) r(!!salvou);
  }

  async function testarChave(k) {
    try {
      var r = await fetch(GROQ_MODELS_URL, { headers: { 'Authorization': 'Bearer ' + k } });
      if (r.status === 401 || r.status === 403) return 'invalida';
      return r.ok ? 'ok' : 'desconhecido';
    } catch (e) {
      return 'desconhecido'; // sem rede / bloqueio: salva mesmo assim
    }
  }

  async function salvarDoModal() {
    var input = modalEl.querySelector('#hbia-input-chave');
    var btn = modalEl.querySelector('#hbia-btn-salvar');
    var v = input.value.trim();
    if (!v) return statusModal('Cole a chave primeiro.', 'erro');
    if (v.indexOf('gsk_') !== 0 || v.length < 20) {
      return statusModal('Essa chave não parece da Groq (ela começa com gsk_).', 'erro');
    }
    btn.disabled = true;
    statusModal('Verificando…');
    var r = await testarChave(v);
    btn.disabled = false;
    if (r === 'invalida') return statusModal('A Groq recusou essa chave. Confira se copiou inteira.', 'erro');
    setKey(v);
    input.value = '';
    fecharModal(true);
  }

  /** Abre o modal. Retorna Promise<boolean>: true se o aluno salvou uma chave. */
  function abrirModalChave(motivo) {
    if (promessaModal) return promessaModal;
    montarModal();
    var atual = getKey();
    modalEl.querySelector('#hbia-modal-motivo').textContent = MOTIVOS[motivo] || MOTIVOS.manual;
    modalEl.querySelector('#hbia-modal-atual').textContent = atual ? 'Chave salva: ' + mascarar(atual) : '';
    modalEl.querySelector('#hbia-btn-remover').style.display = atual ? 'block' : 'none';
    modalEl.querySelector('#hbia-input-chave').value = '';
    statusModal('');
    modalEl.classList.add('aberto');
    setTimeout(function () { modalEl.querySelector('#hbia-input-chave').focus(); }, 50);
    promessaModal = new Promise(function (resolve) { resolverModal = resolve; });
    return promessaModal;
  }

  window.HBIA = {
    MODELOS: MODELOS,
    Erro: HBIAError,
    getKey: getKey,
    setKey: setKey,
    clearKey: clearKey,
    temChave: function () { return !!getKey(); },
    chat: chat,
    erroAmigavel: erroAmigavel,
    parseJSONRobusto: parseJSONRobusto,
    abrirModalChave: abrirModalChave,
    firebase: carregarFirebase
  };
})();
