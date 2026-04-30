// tema.js — aplica tema e fonte em todas as páginas
// Adiciona <script src="tema.js"></script> em todas as páginas ANTES do menu.js

(function() {
    try {
        const cfg = JSON.parse(localStorage.getItem('dt_config') || '{}');

        // TEMA
        if (cfg.tema === 'light') {
            document.documentElement.classList.add('light-mode');
            document.body?.classList.add('light-mode');
        }

        // FONTE
        if (cfg.fonte === 'small') document.documentElement.classList.add('font-small');
        else if (cfg.fonte === 'large') document.documentElement.classList.add('font-large');

    } catch(e) {}
})();

// Reaplica quando o body carregar (garante em qualquer ordem)
document.addEventListener('DOMContentLoaded', function() {
    try {
        const cfg = JSON.parse(localStorage.getItem('dt_config') || '{}');
        if (cfg.tema === 'light') document.body.classList.add('light-mode');
        if (cfg.fonte === 'small') document.body.classList.add('font-small');
        else if (cfg.fonte === 'large') document.body.classList.add('font-large');
    } catch(e) {}
});
