// Use a chave exatamente como você me mandou
const API_KEY = "Sk-proj-NwyJEi6rROyAtsohP1OIFY49XRnwVkv5Xr3axOjbVHRpiG4_zZ0iflMqlAdnFaDUbKX3XYKGJLT3BlbkFJqycayob3FeMHVp0q5bemTb7_tPcPvLDPfVRJi6rRMF0TQfpFtKaw2fhK5Oqph4X9EvGytbU_cA"; 

async function gerarQuestoes() {
    const assunto = document.getElementById('assunto-ia').value;
    const nivel = document.getElementById('nivel-ia').value;
    const container = document.getElementById('container-questoes');
    const btn = document.getElementById('btn-gerar');

    if(!assunto) return alert("Digita um assunto primeiro!");

    btn.innerText = "IA pensando...";
    btn.disabled = true;
    container.innerHTML = "";

    // Prompt melhorado para evitar que a IA mande lixo
    const prompt = `Gere 5 questões de múltipla escolha sobre ${assunto} para o nível ${nivel}. 
    Retorne APENAS um JSON puro, sem textos antes ou depois, neste formato: 
    [{"pergunta": "...", "opcoes": ["A", "B", "C", "D"], "correta": 0}]`;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY.trim()}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // Mudamos para o modelo mais estável e barato
                messages: [{role: "user", content: prompt}],
                temperature: 0.7
            })
        });

        const data = await response.json();

        // Se a OpenAI retornar erro, ele avisa aqui o motivo real
        if (data.error) {
            console.error(data.error);
            return alert("Erro da IA: " + data.error.message);
        }

        const conteudo = data.choices[0].message.content;
        // Limpa possíveis marcações de código que a IA coloca (```json)
        const jsonLimpo = conteudo.replace(/```json|```/g, "").trim();
        const questoes = JSON.parse(jsonLimpo);
        
        questoes.forEach((q, i) => {
            const card = document.createElement('div');
            card.className = "questao-card";
            card.innerHTML = `
                <p style="margin-bottom:15px; font-weight: bold; color: #fff;">${i+1}. ${q.pergunta}</p>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${q.opcoes.map((opt, idx) => `
                        <button class="opcao-btn" onclick="verificar(this, ${idx}, ${q.correta})">${opt}</button>
                    `).join('')}
                </div>
            `;
            container.appendChild(card);
        });

    } catch (e) {
        console.error(e);
        alert("Erro de conexão ou no formato das questões. Tente novamente.");
    } finally {
        btn.innerText = "Gerar 5 Questões";
        btn.disabled = false;
    }
}

function verificar(btn, escolhida, correta) {
    const pai = btn.parentElement;
    const botoes = pai.querySelectorAll('.opcao-btn');
    
    // Trava os botões para não clicar duas vezes
    botoes.forEach(b => b.disabled = true);
    
    if(escolhida === correta) {
        btn.classList.add('correta');
        btn.style.background = "rgba(0, 255, 127, 0.3)";
    } else {
        btn.classList.add('errada');
        btn.style.background = "rgba(255, 68, 68, 0.3)";
        botoes[correta].classList.add('correta');
        botoes[correta].style.background = "rgba(0, 255, 127, 0.3)";
    }
}
