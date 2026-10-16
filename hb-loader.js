(function () {
    if (window.__hbLoaderAtivo || window.hbLoaderSkip) return;
    window.__hbLoaderAtivo = true;

    const GIF_URL = 'https://media.tenor.com/GQAsycjoZG8AAAAi/scuba-scuba-cat.gif';
    const MIN_TEMPO = 0;
    const MAX_TEMPO = 4000;
    const inicio = Date.now();
    let removido = false;

    const FRASES = [
        'Chamando o cérebro pra trabalhar...',
        'Garantindo mais um café antes da aula...',
        'Só um instante, tá quase...',
        'Concentração em 3... 2... 1...',
        'Puxando seus dados do além...',
        'Acalma o coração, já vai abrir...',
        'Organizando a bagunça mental...',
        'Aquecendo os neurônios...',
        'Recarregando a paciência...',
        'Ajustando o foco...',
        'Sincronizando com o universo...',
        'Preparando tudo com carinho...'
    ];

    const frase = FRASES[Math.floor(Math.random() * FRASES.length)];

    // ═══ CSS INLINE (injeta IMEDIATAMENTE, sem esperar nada) ═══
    const css = `
        html { background: #0a0a0e; }
        #hb-loader {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: #0a0a0e !important;
            z-index: 2147483647 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 18px !important;
            font-family: 'Outfit', -apple-system, sans-serif !important;
            transition: opacity 0.4s ease !important;
            margin: 0 !important;
            padding: 0 !important;
            top: 0 !important;
            left: 0 !important;
        }
        #hb-loader.hb-out {
            opacity: 0 !important;
            pointer-events: none !important;
        }
        #hb-loader img {
            width: 88px !important;
            height: 88px !important;
            max-width: 88px !important;
            max-height: 88px !important;
            object-fit: contain !important;
            mix-blend-mode: screen !important;
            animation: hb-pulse 2s ease-in-out infinite !important;
            display: block !important;
        }
        #hb-loader p {
            font-size: 13px !important;
            color: #9ca3af !important;
            font-weight: 600 !important;
            letter-spacing: 0.3px !important;
            text-align: center !important;
            padding: 0 24px !important;
            max-width: 320px !important;
            line-height: 1.5 !important;
            margin: 0 !important;
        }
        @keyframes hb-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50%      { transform: scale(1.06); opacity: 0.85; }
        }
    `;

    const style = document.createElement('style');
    style.id = 'hb-loader-style';
    style.textContent = css;
    // documentElement SEMPRE existe (é o <html>), mesmo no <head>
    document.documentElement.appendChild(style);

    // ═══ HTML DO LOADER ═══
    // Injeta direto no <html>. Navegador aceita e renderiza por cima de tudo.
    const loaderEl = document.createElement('div');
    loaderEl.id = 'hb-loader';
    loaderEl.innerHTML = '<img src="' + GIF_URL + '" alt=""><p>' + frase + '</p>';
    document.documentElement.appendChild(loaderEl);

    // ═══ REMOÇÃO ═══
    function remover() {
        if (removido) return;
        removido = true;

        const decorrido = Date.now() - inicio;
        const espera = Math.max(0, MIN_TEMPO - decorrido);

        setTimeout(() => {
            const el = document.getElementById('hb-loader');
            if (!el) return;
            el.classList.add('hb-out');
            setTimeout(() => {
                el.remove();
                const st = document.getElementById('hb-loader-style');
                if (st) st.remove();
            }, 400);
        }, espera);
    }

    if (document.readyState === 'complete') {
        remover();
    } else {
        window.addEventListener('load', remover);
    }

    setTimeout(remover, MAX_TEMPO);

    window.hbLoader = { remover };
})();
