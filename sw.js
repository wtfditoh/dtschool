self.addEventListener('message', (event) => {
    if (event.data.type === 'NOTIFICAR_AULA') {
        self.registration.showNotification("🔔 Próxima Aula!", {
            body: `${event.data.materia} começa em 5 minutos (${event.data.hora})`,
            icon: 'icon.png',
            vibrate: [200, 100, 200]
        });
    }
});
