/* ═══════════════════════════════════════════════════════════════
   HUB BRAIN — LOADER UNIVERSAL
   Uso: adiciona <script src="hb-loader.js"></script> no <head>
   Funciona em qualquer página. Injeta HTML + CSS + auto-remove.
   ═══════════════════════════════════════════════════════════════ */
(function () {
    if (window.__hbLoaderAtivo) return;
    window.__hbLoaderAtivo = true;

    const GIF_URL = 'https://media.tenor.com/GQAsycjoZG8AAAAi/scuba-scuba-cat.gif';

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

    const css = `
        #hb-loader {
            position: fixed;
            inset: 0;
            background: #0a0a0e;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 18px;
            font-family: 'Outfit', -apple-system, sans-serif;
            transition: opacity 0.4s ease;
            pointer-events: all;
        }
        #hb-loader.hb-out {
            opacity: 0;
            pointer-events: none;
        }
        #hb-loader img {
            width: 88px;
            height: 88px;
            object-fit: contain;
            mix-blend-mode: screen;
            animation: hb-pulse 2s ease-in-out infinite;
        }
        #hb-loader p {
            font-size: 13px;
            color: #9ca3af;
            font-weight: 600;
            letter-spacing: 0.3px;
            text-align: center;
            padding: 0 24px;
            max-width: 320px;
            line-height: 1.5;
        }
        @keyframes hb-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50%      { transform: scale(1.06); opacity: 0.85; }
        }
    `;

    // Injeta CSS
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Injeta HTML quando o DOM tiver pronto
    function injetarLoader() {
        if (document.getElementById('hb-loader')) return;
        const el = document.createElement('div');
        el.id = 'hb-loader';
        el.innerHTML = '<img src="' + GIF_URL + '" alt=""><p>' + frase + '</p>';
        document.body.insertBefore(el, document.body.firstChild);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injetarLoader);
    } else {
        injetarLoader();
    }

    // Remove quando a página carregar
    function removerLoader() {
        const el = document.getElementById('hb-loader');
        if (!el) return;
        el.classList.add('hb-out');
        setTimeout(() => el.remove(), 400);
    }

    if (document.readyState === 'complete') {
        setTimeout(removerLoader, 700);
    } else {
        window.addEventListener('load', () => setTimeout(removerLoader, 700));
    }

    // Fallback: se algo travar, remove em 4s
    setTimeout(removerLoader, 4000);
})();
