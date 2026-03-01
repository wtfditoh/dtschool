const API_KEY = "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";

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    const salvo = localStorage.getItem('dt_chat_data');
    if (salvo) document.getElementById('chat-respostas').innerHTML = salvo;
});

// Mensagem Bonita (Toast)
function mostrarAviso(msg) {
    const t = document.getElementById('custom-toast');
    t.innerText = msg;
    t.style.bottom = "30px";
    setTimeout(() => { t.style.bottom = "-100px"; }, 3000);
}

// Limpar conversa
function limparChat() {
    if(confirm("Deseja apagar todo o histórico de dúvidas?")) {
        localStorage.removeItem('dt_chat_data');
        document.getElementById('chat-respostas').innerHTML = '<div class="msg-ia">Conversa reiniciada. Como posso ajudar?</div>';
    }
}

// Chamar Groq IA
async function chamarIA(p) {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{role:"user", content:p}], temperature: 0.6 })
    });
    const d = await r.json();
    return d.choices[0].message.content;
}

// Lógica de Simulado (10 questões + Nível)
async function gerarQuestoes() {
    const assunto = document.getElementById('assunto-ia').value;
    const nivel = document.getElementById('nivel-ia').value;
    if(!assunto) return mostrarAviso("Digite o assunto primeiro!");

    const btn = document.getElementById('btn-gerar');
    btn.innerText = "Criando..."; btn.disabled = true;

    try {
        const prompt = `Gere 10 questões de ${nivel} sobre ${assunto}. Retorne apenas JSON: [{"p":"pergunta","o":["a","b","c","d"],"c":0,"e":"explicação"}]`;
        const res = await chamarIA(prompt);
        const questoes = JSON.parse(res.replace(/```json|```/g, ""));
        
        const container = document.getElementById('container-questoes');
        container.innerHTML = `<h3 style='margin:20px 0;'>Simulado: ${assunto}</h3>`;
        questoes.forEach((q, i) => {
            const d = document.createElement('div');
            d.className = "questao-card";
            d.innerHTML = `<p><b>${i+1}.</b> ${q.p}</p>` + 
                q.o.map((opt, idx) => `<button class="opcao-btn" onclick="validar(this,${idx},${q.c},'${q.e}')">${opt}</button>`).join('');
            container.appendChild(d);
        });
    } catch(e) { mostrarAviso("Erro na IA. Tente de novo."); }
    finally { btn.innerText = "Gerar 10 Questões"; btn.disabled = false; }
}

function validar(btn, sel, cor, exp) {
    const btns = btn.parentElement.querySelectorAll('.opcao-btn');
    btns.forEach(b => b.disabled = true);
    btn.style.borderColor = (sel === cor) ? "#00ff7f" : "#ff4444";
    btns[cor].style.borderColor = "#00ff7f";
    const f = document.createElement('div');
    f.style = "margin-top:10px; color:#aaa; font-size:12px;";
    f.innerHTML = `<b>Dica:</b> ${exp}`;
    btn.parentElement.appendChild(f);
}

// Tira-Dúvidas (Com Memória e Scroll para voltar)
async function perguntarIA() {
    const input = document.getElementById('pergunta-ia');
    const box = document.getElementById('chat-respostas');
    if(!input.value) return;

    const msg = input.value;
    input.value = "";
    box.innerHTML += `<div class="msg-user">${msg}</div>`;
    box.scrollTop = box.scrollHeight;

    const res = await chamarIA(`Responda de forma curta para aluno de escola: ${msg}`);
    box.innerHTML += `<div class="msg-ia">${res}</div>`;
    box.scrollTop = box.scrollHeight;
    localStorage.setItem('dt_chat_data', box.innerHTML);
}

// Troca de Aba
function trocarAba(aba) {
    const isSim = aba === 'simulado';
    document.getElementById('secao-simulado').classList.toggle('active', isSim);
    document.getElementById('secao-chat').classList.toggle('active', !isSim);
    document.getElementById('tab-simulado').classList.toggle('active', isSim);
    document.getElementById('tab-chat').classList.toggle('active', !isSim);
}
