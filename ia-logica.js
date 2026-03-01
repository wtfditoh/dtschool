// Chave sk-proj-D...2fEA aplicada
const API_KEY = "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";

// FUNÇÃO DE TROCA DE ABAS (CORRIGIDA)
function trocarAba(aba) {
    const secaoSimulado = document.getElementById('secao-simulado');
    const secaoChat = document.getElementById('secao-chat');
    const tabSimulado = document.getElementById('tab-simulado');
    const tabChat = document.getElementById('tab-chat');

    if (aba === 'simulado') {
        secaoSimulado.style.display = 'block';
        secaoChat.style.display = 'none';
        tabSimulado.classList.add('active');
        tabChat.classList.remove('active');
    } else {
        secaoSimulado.style.display = 'none';
        secaoChat.style.display = 'flex'; // Força o flex para o chat aparecer
        tabChat.classList.add('active');
        tabSimulado.classList.remove('active');
        
        // Foca no campo de pergunta automaticamente
        setTimeout(() => document.getElementById('pergunta-ia').focus(), 100);
    }
}

// FUNÇÃO PARA FALAR COM A IA
async function chamarIA(prompt) {
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${API_KEY.trim()}` 
            },
            body: JSON.stringify({ 
                model: "gpt-4o-mini", 
                messages: [{role: "user", content: prompt}], 
                temperature: 0.7 
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data;
    } catch (err) {
        throw new Error("Falha na conexão: " + err.message);
    }
}

// GERAÇÃO DE QUESTÕES
async function gerarQuestoes() {
    const assunto = document.getElementById('assunto-ia').value;
    const nivel = document.getElementById('nivel-ia').value;
    const container = document.getElementById('container-questoes');
    const btn = document.getElementById('btn-gerar');

    if(!assunto) return alert("Escreva um assunto!");

    btn.innerText = "IA Criando...";
    btn.disabled = true;
    container.innerHTML = "";

    const prompt = `Gere 5 questões objetivas sobre ${assunto} para ${nivel}. Retorne APENAS o JSON: [{"pergunta":"", "opcoes":["","","",""], "correta":0}]`;

    try {
        const data = await chamarIA(prompt);
        const conteudo = data.choices[0].message.content.replace(/```json|```/g, "").trim();
        const questoes = JSON.parse(conteudo);
        
        questoes.forEach((q, i) => {
            const div = document.createElement('div');
            div.className = "questao-card";
            div.innerHTML = `
                <p style="margin-bottom:12px"><b>${i+1}.</b> ${q.pergunta}</p>
                <div style="display:flex
                
