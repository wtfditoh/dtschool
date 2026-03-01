// A chave é colada aqui SEM ESPAÇOS antes ou depois
const CHAVE_BRUTA = "Sk-proj-NwyJEi6rROyAtsohP1OIFY49XRnwVkv5Xr3axOjbVHRpiG4_zZ0iflMqlAdnFaDUbKX3XYKGJLT3BlbkFJqycayob3FeMHVp0q5bemTb7_tPcPvLDPfVRJi6rRMF0TQfpFtKaw2fhK5Oqph4X9EvGytbU_cA";

// Limpa a chave automaticamente
const API_KEY = CHAVE_BRUTA.trim();

async function chamarIA(prompt) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{role: "user", content: prompt}],
            temperature: 0.7
        })
    });
    return await response.json();
}

async function gerarQuestoes() {
    const assunto = document.getElementById('assunto-ia').value;
    const nivel = document.getElementById('nivel-ia').value;
    const container = document.getElementById('container-questoes');
    const btn = document.getElementById('btn-gerar');

    if(!assunto) return alert("Qual o assunto?");

    btn.innerText = "Criando...";
    btn.disabled = true;
    container.innerHTML = "";

    const prompt = `Gere 3 questões de múltipla escolha sobre ${assunto} para ${nivel}. Retorne APENAS o JSON: [{"pergunta":"", "opcoes":["","","",""], "correta":0}]`;

    try {
        const data = await chamarIA(prompt);
        if(data.error) throw new Error(data.error.message);

        const questoes = JSON.parse(data.choices[0].message.content.replace(/```json|```/g, ""));
        
        questoes.forEach((q, i) => {
            const div = document.createElement('div');
            div.className = "questao-card";
            div.innerHTML = `<p><strong>${i+1}.</strong> ${q.pergunta}</p>` + 
                q.opcoes.map((opt, idx) => `<button class="opcao-btn" onclick="verificar(this,${idx},${q.correta})">${opt}</button>`).join('');
            container.appendChild(div);
        });
    } catch (e) {
        alert("Erro: " + e.message);
    } finally {
        btn.innerText = "Gerar Questões";
        btn.disabled = false;
    }
}

async function perguntarIA() {
    const input = document.getElementById('pergunta-ia');
    const chat = document.getElementById('chat-respostas');
    const btn = document.getElementById('btn-perguntar');
    
    if(!input.value) return;

    const msg = input.value;
    input.value = "";
    btn.disabled = true;
    chat.innerHTML += `<p style="color:var(--primary); margin-top:5px;"><b>Você:</b> ${msg}</p>`;

    try {
        const data = await chamarIA(`Responda de forma curta e didática: ${msg}`);
        const resposta = data.choices[0].message.content;
        chat.innerHTML += `<p style="background:rgba(255,255,255,0.05); padding:8px; border-radius:8px; margin-top:5px;"><b>IA:</b> ${resposta}</p>`;
        chat.scrollTop = chat.scrollHeight;
    } catch (e) {
        chat.innerHTML += `<p style="color:red;">Erro ao responder.</p>`;
    } finally {
        btn.disabled = false;
    }
}

function verificar(btn, escolhida, correta) {
    const botoes = btn.parentElement.querySelectorAll('.opcao-btn');
    botoes.forEach(b => b.disabled = true);
    if(escolhida === correta) {
        btn.style.background = "rgba(0, 255, 127, 0.2)";
        btn.style.borderColor = "var(--success)";
    } else {
        btn.style.background = "rgba(255, 68, 68, 0.2)";
        botoes[correta].style.background = "rgba(0, 255, 127, 0.2)";
    }
}
