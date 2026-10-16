/* Loader com frases variadas pra usar em qualquer página de auth */
const FRASES_AUTH = [
    'Preparando seu acesso...',
    'Chamando o cérebro pra trabalhar...',
    'Garantindo mais um café antes da aula...',
    'Só um instante, tá quase...',
    'Sincronizando com o universo...',
    'Organizando a bagunça mental...',
    'Aquecendo os neurônios...',
    'Acalma o coração, já vai abrir...',
    'Puxando seus dados do além...',
    'Preparando tudo com carinho...'
];

const fraseEl = document.querySelector('#hb-loading p');
if (fraseEl) {
    fraseEl.textContent = FRASES_AUTH[Math.floor(Math.random() * FRASES_AUTH.length)];
}

window.addEventListener('load', () => {
    setTimeout(() => {
        const el = document.getElementById('hb-loading');
        if (!el) return;
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 400);
    }, 700);
});
