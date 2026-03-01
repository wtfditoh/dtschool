let imagemBase64 = "";

// Pede permissão para notificações ao abrir
if (Notification.permission !== "granted") {
    Notification.requestPermission();
}

function previewImg(input) {
    const reader = new FileReader();
    reader.onload = function(e) {
        imagemBase64 = e.target.result;
        document.getElementById('preview-container').innerHTML = `<img src="${imagemBase64}" style="width:100%; border-radius:10px; margin-top:10px;">`;
    };
    reader.readAsDataURL(input.files[0]);
}

function adicionarTarefa() {
    const nome = document.getElementById('tarefa-nome').value;
    const data = document.getElementById('tarefa-data').value;
    const materia = document.getElementById('tarefa-materia').value;

    if (!nome || !data) return alert("Preencha o título e a data!");

    const tarefa = {
        id: Date.now(),
        nome,
        data,
        materia,
        imagem: imagemBase64,
        concluida: false
    };

    let agenda = JSON.parse(localStorage.getItem('dt_agenda') || '[]');
    agenda.push(tarefa);
    localStorage.setItem('dt_agenda', JSON.stringify(agenda));

    // Limpar campos
    document.getElementById('tarefa-nome').value = "";
    imagemBase64 = "";
    document.getElementById('preview-container').innerHTML = "";
    
    carregarTarefas();
    agendarNotificacao(tarefa);
}

function agendarNotificacao(tarefa) {
    const dataTarefa = new Date(tarefa.data + "T08:00:00"); // Notifica às 8 da manhã
    const hoje = new Date();

    if (dataTarefa > hoje && Notification.permission === "granted") {
        const tempoRestante = dataTarefa.getTime() - hoje.getTime();
        setTimeout(() => {
            new Notification("Lembrete DT School", {
                body: `Hoje é o dia: ${tarefa.nome} (${tarefa.materia})`,
                icon: "logo.png"
            });
        }, tempoRestante);
    }
}

function carregarTarefas(filtro = 'Tudo') {
    const lista = document.getElementById('lista-agenda');
    let agenda = JSON.parse(localStorage.getItem('dt_agenda') || '[]');

    if(filtro !== 'Tudo') {
        agenda = agenda.filter(t => t.materia === filtro);
    }

    lista.innerHTML = agenda.map(t => `
        <div class="tarefa-item" style="flex-direction: column; align-items: flex-start; gap: 10px;">
            <div style="display: flex; justify-content: space-between; width: 100%;">
                <div class="tarefa-info">
                    <span style="color:var(--primary); font-size:10px; text-transform:uppercase;">${t.materia}</span>
                    <b>${t.nome}</b>
                    <span><i data-lucide="calendar"></i> ${t.data}</span>
                </div>
                <button class="btn-delete" onclick="removerTarefa(${t.id})"><i data-lucide="trash-2"></i></button>
            </div>
            ${t.imagem ? `<img src="${t.imagem}" style="width:100%; border-radius:8px; border:1px solid #333;">` : ''}
        </div>
    `).join('');
    lucide.createIcons();
}

function removerTarefa(id) {
    let agenda = JSON.parse(localStorage.getItem('dt_agenda') || '[]');
    agenda = agenda.filter(t => t.id !== id);
    localStorage.setItem('dt_agenda', JSON.stringify(agenda));
    carregarTarefas();
}
