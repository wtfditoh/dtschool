const API_KEY = "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";

// Instrução para a IA focar apenas em educação
const TUTOR_PROMPT = `Você é um tutor acadêmico rigoroso. 
1. Responda apenas sobre matérias escolares, estudos e ciência. 
2. Se o assunto não for educacional, diga: "Meu foco é ajudar nos seus estudos. Como posso te ajudar com a matéria hoje?".
3. Use negrito para termos importantes.
4. Seja direto: evite introduções longas.`;

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    const chatSalvo = localStorage.getItem('dt_chat_history');
    if(chatSalvo) document.getElementById('chat-box').innerHTML = chatSalvo;
});

// MODAL DE AVISO PERSONALIZADO
function mostrarAviso(msg, confirmacao = false, acao = null) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-text').innerText = msg;
    modal.style.display = 'flex';
    
    const btnC = document.getElementById('btn-modal-cancel');
    const btnO = document.getElementById('btn-modal-ok');
    
    btnC.style.display = confirmacao ? 'block' : 'none';
    btnO.onclick = () => { modal.style.display = 'none'; if(acao) acao(); };
    btnC.onclick = () => { modal.style.display = 'none'; };
}

function perguntarLimpar() {
    mostrarAviso("Deseja apagar o histórico do chat?", true, () => {
        localStorage.removeItem('dt_chat_history');
        location.reload();
    });
}

function validarEGerar() {
    if(!document.getElementById('assunto').value) return mostrarAviso("⚠️ Por favor, digite um assunto!");
    gerarSimulado();
}

function showAba(n) {
    document.querySelectorAll('.aba-painel').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('aba-' + n).classList.add('active');
    document.getElementById('btn-' + (n == 'simulado' ? 'sim' : 'chat')).classList.add('active');
}

async function gerarSimulado() {
    const sub = document.getElementById('assunto').value;
    const lista = document.getElementById('questoes-lista');
    lista.innerHTML = "<div class='card-ia'>⏳ Preparando questões de " + sub + "...</div>";

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{role: "user", content: `Gere 10 questões sobre ${sub}. Retorne APENAS JSON: [{"p":"pergunta","o":["a","b","c","d"],"c":0,"e":"explicação curta"}]`}]
            })
        });
        const d = await res.json();
        const qts = JSON.parse(d.choices[0].message.content.match(/\[.*\]/s)[0]);
        
        lista.innerHTML = "";
        qts.forEach((q, i) => {
            const card = document.createElement('div');
            card.className = "card-ia";
            card.innerHTML = `<p><b>${i+1}.</b> ${q.p}</p>`;
            q.o.forEach((opt, idx) => {
                const b = document.createElement('button');
                b.className = "opt-btn"; b.innerText = opt;
                b.onclick = () => {
                    card.querySelectorAll('button').forEach(btn => btn.disabled = true);
                    b.style.background = idx === q.c ? "#28a745" : "#dc3545";
                    const aula = document.createElement('div');
                    aula.style = "margin-top:10px; padding:10px; background:rgba(255,255,255,0.05); border-left:3px solid #8a2be2; font-size:14px;";
                    aula.innerHTML = `<b>🎓 Explicação:</b> ${q.e}`;
                    card.appendChild(aula);
                };
                card.appendChild(b);
            });
            lista.appendChild(card);
        });
    } catch(e) { lista.innerHTML = "<div class='card-ia'>Erro ao gerar. Verifique o assunto.</div>"; }
}

async function enviarMsg() {
    const input = document.getElementById('chat-in');
    const box = document.getElementById('chat-box');
    if(!input.value.trim()) return;

    const texto = input.value;
    input.value = "";
    box.innerHTML += `<div class="bolha user">${texto}</div>`;
    window.scrollTo(0, document.body.scrollHeight);

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{role: "system", content: TUTOR_PROMPT}, {role: "user", content: texto}]
        })
    });
    const d = await res.json();
    let r = d.choices[0].message.content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    
    box.innerHTML += `<div class="bolha ia">${r}</div>`;
    localStorage.setItem('dt_chat_history', box.innerHTML);
    window.scrollTo(0, document.body.scrollHeight);
}
