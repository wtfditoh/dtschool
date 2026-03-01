const API_KEY = "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";

// CARREGAR HISTÓRICO AO ABRIR
window.onload = () => {
    const historico = localStorage.getItem('dt_chat_history');
    if (historico) document.getElementById('chat-respostas').innerHTML = historico;
    lucide.createIcons();
};

async function chamarIA(prompt) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.6
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
}

// SIMULADO COM 10 QUESTÕES E EXPLICAÇÃO
async function gerarQuestoes() {
    const assunto = document.getElementById('assunto-ia').value;
    const nivel = document.getElementById('nivel-ia').value;
    const container = document.getElementById('container-questoes');
    const btn = document.getElementById('btn-gerar');

    if(!assunto) return alert("Digite o assunto!");

    btn.innerText = "Criando Simulado...";
    btn.disabled = true;
    container.innerHTML = "<div class='msg-ia'>Sua prova está sendo elaborada por nossa inteligência...</div>";

    const prompt = `Aja como um professor rigoroso de ${nivel}. Gere EXATAMENTE 10 questões de múltipla escolha sobre ${assunto}. 
    Retorne APENAS um array JSON: [{"p": "pergunta", "o": ["opção0", "opção1", "opção2", "opção3"], "c": 0, "e": "Explicação curta"}]`;

    try {
        const resposta = await chamarIA(prompt);
        const questoes = JSON.parse(resposta.replace(/```json|```/g, ""));
        
        container.innerHTML = `<h3 class='titulo-ia'>Simulado: ${assunto} (${nivel})</h3>`;
        questoes.forEach((q, i) => {
            const div = document.createElement('div');
            div.className = "questao-card";
            div.innerHTML = `<p><strong>${i+1}.</strong> ${q.p}</p>` + 
                q.o.map((opt, idx) => `<button class="opcao-btn" onclick="validar(this,${idx},${q.c},'${q.e.replace(/'/g, "")}')">${opt}</button>`).join('');
            container.appendChild(div);
        });
    } catch (err) { alert("Erro ao gerar. Tente outro assunto."); }
    finally { btn.innerText = "Gerar 10 Questões"; btn.disabled = false; }
}

function validar(btn, sel, cor, exp) {
    const pai = btn.parentElement;
    const btns = pai.querySelectorAll('.opcao-btn');
    btns.forEach(b => b.disabled = true);

    if(sel === cor) {
        btn.style.borderColor = "#00ff7f";
        btn.style.background = "rgba(0,255,127,0.1)";
    } else {
        btn.style.borderColor = "#ff4444";
        btn.style.background = "rgba(255,68,68,0.1)";
        btns[cor].style.borderColor = "#00ff7f";
    }

    const feedback = document.createElement('div');
    feedback.className = "explicacao-box";
    feedback.innerHTML = `<strong>Resposta:</strong> ${exp}`;
    pai.appendChild(feedback);
}

// CHAT COM MEMÓRIA
async function perguntarIA() {
    const input = document.getElementById('pergunta-ia');
    const chat = document.getElementById('chat-respostas');
    if(!input.value) return;

    const texto = input.value;
    input.value = "";
    chat.innerHTML += `<div class="msg-user">${texto}</div>`;
    chat.scrollTop = chat.scrollHeight;

    try {
        const resposta = await chamarIA(`Responda como tutor escolar: ${texto}`);
        chat.innerHTML += `<div class="msg-ia">${resposta}</div>`;
        chat.scrollTop = chat.scrollHeight;
        localStorage.setItem('dt_chat_history', chat.innerHTML); // SALVA NA MEMÓRIA
    } catch (e) { chat.innerHTML += `<div class="msg-ia" style="color:red">Erro na conexão.</div>`; }
}
