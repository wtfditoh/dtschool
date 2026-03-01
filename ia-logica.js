// Sua Key do Groq (Lembre de dar "Allow Secret" no GitHub)
const API_KEY = "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";

// Função para trocar as abas (já que seu HTML chama essa função)
function trocarAba(aba) {
    const simulado = document.getElementById('secao-simulado');
    const chat = document.getElementById('secao-chat');
    const btnSim = document.getElementById('tab-simulado');
    const btnChat = document.getElementById('tab-chat');

    if (aba === 'simulado') {
        simulado.style.display = 'block';
        chat.style.display = 'none';
        btnSim.classList.add('active');
        btnChat.classList.remove('active');
    } else {
        simulado.style.display = 'none';
        chat.style.display = 'flex'; // Chat usa flex para o scroll funcionar
        btnSim.classList.remove('active');
        btnChat.classList.add('active');
    }
}

// Função Principal de chamada da IA
async function chamarIA(prompt) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7
        })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

// Função para GERAR QUESTÕES
async function gerarQuestoes() {
    const assunto = document.getElementById('assunto-ia').value;
    const nivel = document.getElementById('nivel-ia').value;
    const container = document.getElementById('container-questoes');
    const btn = document.getElementById('btn-gerar');

    if (!assunto) return alert("Por favor, digite um assunto!");

    btn.innerText = "Gerando questões...";
    btn.disabled = true;
    container.innerHTML = "<p style='color: #888; text-align: center;'>Criando simulado personalizado...</p>";

    const prompt = `Gere 5 questões de múltipla escolha sobre ${assunto} para o nível ${nivel}. 
    Retorne APENAS um array JSON puro, sem explicações, seguindo este modelo:
    [{"pergunta": "Qual o rio do Egito?", "opcoes": ["Nilo", "Amazonas", "Tibre", "Ganges"], "correta": 0}]`;

    try {
        const resposta = await chamarIA(prompt);
        const questoes = JSON.parse(resposta.replace(/```json|```/g, ""));
        
        container.innerHTML = ""; // Limpa o "Gerando..."
        questoes.forEach((q, i) => {
            const div = document.createElement('div');
            div.className = "materia-card";
            div.style.marginTop = "15px";
            div.innerHTML = `<p><strong>${i+1}.</strong> ${q.pergunta}</p>` + 
                q.opcoes.map((opt, idx) => `<button class="opcao-btn" style="width:100%; margin: 5px 0; padding: 10px; border-radius: 8px; border: 1px solid #333; background: #111; color: white; text-align: left;" onclick="verificarQuestao(this, ${idx}, ${q.correta})">${opt}</button>`).join('');
            container.appendChild(div);
        });
    } catch (e) {
        container.innerHTML = `<p style="color: red;">Erro: ${e.message}</p>`;
    } finally {
        btn.innerText = "Gerar 5 Questões";
        btn.disabled = false;
    }
}

// Função para o TIRA-DÚVIDAS (Chat)
async function perguntarIA() {
    const input = document.getElementById('pergunta-ia');
    const chat = document.getElementById('chat-respostas');
    const btn = document.getElementById('btn-perguntar');
    
    if (!input.value) return;

    const msg = input.value;
    input.value = "";
    btn.disabled = true;

    // Adiciona pergunta do usuário
    chat.innerHTML += `<div style="align-self: flex-end; background: #6a1b9a; padding: 10px; border-radius: 12px; margin: 5px; max-width: 80%; color: white;">${msg}</div>`;
    chat.scrollTop = chat.scrollHeight;

    try {
        const resposta = await chamarIA(`Responda de forma didática e curta: ${msg}`);
        chat.innerHTML += `<div class="msg-ia" style="background: #1a1a1a; padding: 10px; border-radius: 12px; margin: 5px; max-width: 80%; border: 1px solid #333;">${resposta}</div>`;
        chat.scrollTop = chat.scrollHeight;
    } catch (e) {
        chat.innerHTML += `<div style="color: red; margin: 5px;">Erro ao conectar. Tente novamente.</div>`;
    } finally {
        btn.disabled = false;
    }
}

// Função para validar a resposta do simulado
function verificarQuestao(btn, selecionada, correta) {
    const pai = btn.parentElement;
    const botoes = pai.querySelectorAll('button');
    botoes.forEach(b => b.disabled = true);

    if (selecionada === correta) {
        btn.style.background = "#00c853"; // Verde
        btn.style.borderColor = "#00c853";
    } else {
        btn.style.background = "#d32f2f"; // Vermelho
        botoes[correta].style.background = "#00c853";
    }
}
