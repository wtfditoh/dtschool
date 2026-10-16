const FRASES = [
    'Preparando seu acesso...',
    'Chamando o cérebro pra trabalhar...',
    'Garantindo mais um café antes da aula...',
    'Só um instante, tá quase...',
    'Sincronizando com o universo...',
    'Aquecendo os neurônios...',
    'Acalma o coração, já vai abrir...',
    'Puxando seus dados do além...'
];

const el = document.querySelector('#hb-loading p');
if (el) el.textContent = FRASES[Math.floor(Math.random() * FRASES.length)];

window.addEventListener('load', () => {
    setTimeout(() => {
        const l = document.getElementById('hb-loading');
        if (!l) return;
        l.style.opacity = '0';
        setTimeout(() => l.remove(), 400);
    }, 700);
});
