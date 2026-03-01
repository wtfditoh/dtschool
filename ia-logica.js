const API_KEY = "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";

// Iniciar ícones do Lucide
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    const chatSalvo = localStorage.getItem('dt_chat_data');
    if(chatSalvo) document.getElementById('chat-box').innerHTML = chatSalvo;
});

// FUNÇÃO DAS ABAS
function alternarAba(abaNome) {
    document.querySelectorAll('.dt-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.dt-tab-button').forEach(b => b.classList.remove('active'));
    
    document.getElementById('painel-' + abaNome).classList.add('active');
    document.getElementById('tab-' + abaNome).classList.add('active');
}

// MODAL DE AVISO
function exibirAviso(texto) {
    const modal = document.getElementById('modal-aviso');
    document.getElementById('modal-texto-msg').innerText = texto;
    modal.style.display = 'flex';
}
function fecharModal() { document.getElementById('modal-aviso').style.display = 'none'; }

// LIXEIRA (LIMPAR TUDO)
function limparTudo() {
    if(confirm("Deseja apagar o histórico de questões e conversas?")) {
        localStorage.clear();
        location.reload();
    }
}

// GERAR SIMULADO
async function gerarSimulado() {
    const tema = document.getElementById('campo-tema').value;
    const nivel = document.getElementById('campo-nivel').value;
    if(!tema) return exibirAviso("Por favor, digite um assunto para o simulado.");

    const container = document.getElementById('container-questoes');
    container.innerHTML = "<div class='dt-questao-card' style='text-align:center'>⏳ O professor está preparando as questões...</div>";

    try {
        const prompt = `Gere 5 questões nível ${nivel} sobre ${tema}. Retorne APENAS o JSON puro seguindo este formato rigorosamente: [{"p":"pergunta","o":["opção1","opção2","opção3","opção4"],"c":0,"e":"EXPLICAÇÃO DIDÁTICA DA RESPOSTA"}]`;
        
        const resposta = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{role: "user", content: prompt}],
                temperature: 0.5
            })
        });

        const dados = await resposta.json();
        const textoJson = dados.choices[0].message.content.match(/\[.*\]/s)[0];
        const questoes = JSON.parse(textoJson);
        
        container.innerHTML = "";
        questoes.forEach((q, i) => {
            const card = document.createElement('div');
            card.className = "dt-questao-card";
            card.innerHTML = `<p style="margin-bottom:15px;"><strong>${i+1}.</strong> ${q.p}</p>`;
            
            q.o.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = "dt-opt-btn";
                btn.innerText = opt;
                btn.onclick = () => {
                    card.querySelectorAll('.dt-opt-btn').forEach(b => b.disabled = true);
                    if(idx === q.c) {
                        btn.style.background = "#1b4d2e !important";
                        btn.style.borderColor = "#2ecc71 !important";
                    } else {
                        btn.style.background = "#4d1b1b !important";
                        btn.style.borderColor = "#e74c3c !important";
                        card.querySelectorAll('.dt-opt-btn')[q.c].style.border = "2px solid #2ecc71";
                    }
                    
                    const aula = document.createElement('div');
                    aula.className = "dt-mini-aula";
                    aula.innerHTML = `<strong>🎓 Mini Aula:</strong><br>${q.e}`;
                    card.appendChild(aula);
                };
                card.appendChild(btn);
            });
            container.appendChild(card);
        });
    } catch(e) {
        container.innerHTML = "<div class='dt-questao-card'>Erro ao gerar. Verifique sua conexão.</div>";
    }
}

// CHAT TIRA-DÚVIDAS
async function enviarMensagem() {
    const input = document.getElementById('chat-input');
    const box = document.getElementById('chat-box');
    if(!input.value) return;

    const msgUser = input.value;
    input.value = "";
    box.innerHTML += `<div class="dt-msg user">${msgUser}</div>`;
    box.scrollTop = box.scrollHeight;

    const resposta = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
                {role: "system", content: "Você é um professor tutor da DT Educator. Responda em tópicos claros e objetivos apenas sobre temas escolares."},
                {role: "user", content: msgUser}
            ],
            temperature: 0.7
        })
    });

    const dados = await resposta.json();
    const textoIA = dados.choices[0].message.content.replace(/\n/g, '<br>');
    box.innerHTML += `<div class="dt-msg ia">${textoIA}</div>`;
    box.scrollTop = box.scrollHeight;
    localStorage.setItem('dt_chat_data', box.innerHTML);
}
