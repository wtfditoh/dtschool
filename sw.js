/* Hub Brain - Service Worker Imortal 🧠 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

// --- NOVIDADE: O RELÓGIO AGORA MORA AQUI DENTRO ---
// Isso faz o Service Worker checar as aulas sozinho, sem depender do app aberto.
setInterval(() => {
    // Busca a grade salva no celular
    const local = localStorage.getItem('hub_brain_grade');
    if (!local) return;

    const grade = JSON.parse(local);
    const dMap = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
    const diaHoje = dMap[new Date().getDay()];
    const aulas = grade[diaHoje] || [];
    
    const agora = new Date();
    const minAgora = (agora.getHours() * 60) + agora.getMinutes();

    aulas.forEach(aula => {
        const [h, m] = aula.hora.split(':').map(Number);
        const minAula = (h * 60) + m;
        const diff = minAula - minAgora;

        // Se faltar exatamente 30 ou 5 minutos, ele dispara a notificação sozinho!
        if (diff === 30 || diff === 5) {
            enviarNotificacao(aula.materia, aula.hora, diff);
        }
    });
}, 60000); // Checa a cada 1 minuto

// Função para disparar a mensagem na barra de notificações
function enviarNotificacao(materia, hora, tempo) {
    let titulo = tempo === 30 ? "⏳ Aula em 30 min!" : "🚀 Falta pouco!";
    let frases = tempo === 30 ? [
        `Sua aula de ${materia} começa às ${hora}. Dá tempo de um café! ☕`,
        `Faltam 30 min para ${materia}. Já separou o material? 📓`
    ] : [
        `Bora! ${materia} começa em 5 min (${hora}). Já pro lugar! 🏃‍♂️`,
        `Não se atrasa! ${materia} começa agorinha, às ${hora}. ✍️`
    ];

    const msgSorteada = frases[Math.floor(Math.random() * frases.length)];

    const options = {
        body: msgSorteada,
        icon: './icon-512.png',
        badge: './icon-512.png',
        vibrate: [200, 100, 200],
        tag: `aula-${materia}-${tempo}`,
        renotify: true,
        requireInteraction: true,
        data: { url: './horario.html' }
    };

    self.registration.showNotification(titulo, options);
}

// Mantém o suporte para quando o app estiver aberto e mandar mensagem manual
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NOTIFICAR_AULA') {
        enviarNotificacao(event.data.materia, event.data.hora, event.data.tempoRestante);
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cl) => {
            for (const c of cl) { if (c.url.includes('horario.html')) return c.focus(); }
            if (clients.openWindow) return clients.openWindow('./horario.html');
        })
    );
});
