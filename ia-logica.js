const API_KEY = "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";

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    const h = localStorage.getItem('dt_chat');
    if(h) document.getElementById('chat-box').innerHTML = h;
});

function customAviso(msg, confirm = false, acao = null) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-text').innerText = msg;
    modal.style.display = 'flex';
    const btnC = document.getElementById('btn-modal-cancel');
    const btnO = document.getElementById('btn-modal-ok');
    
    btnC.style.display = confirm ? 'block' : 'none';
    btnO.onclick = () => { modal.style.display = 'none'; if(acao) acao(); };
    btnC.onclick = () => { modal.style.display = 'none'; };
}

function perguntarLimpar() {
    customAviso("Limpar todo o histórico?", true, () => {
        localStorage.clear();
        location.reload();
    });
}

function validarEGerar() {
    if(!document.getElementById('assunto').value) return customAviso("⚠️ Digite o assunto!");
    gerarSimulado();
}

function showAba(n) {
    document.querySelectorAll('.aba-painel').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('aba-'+n).classList.add('active');
    document.getElementById('btn-'+(n=='simulado'?'sim':'chat')).classList.add('active');
}

async function gerarSimulado() {
    const sub = document.getElementById('assunto').value;
    const lista = document.getElementById('questoes-lista');
    lista.innerHTML = "<div class='card-ia'>⏳ Gerando questões...</div>";

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{role: "user", content: `Gere 10 questões de múltipla escolha sobre ${sub}. Retorne apenas o JSON puro, sem textos extras: [{"p":"pergunta","o":["a","b","c","d"],"c":0,"e":"explicacao"}]`}]
            })
        });
        const data = await response.json();
        const jsonString = data.choices[0].message.content.match(/\[.*\]/s)[0];
        const questoes = JSON.parse(jsonString);
        
        lista.innerHTML = "";
        questoes.forEach((q, i) => {
            const div = document.createElement('div');
            div.className = "card-ia";
            div.innerHTML = `<p><b>${i+1}.</b> ${q.p}</p>`;
            q.o.forEach((opt, idx) => {
                const b = document.createElement('button');
                b.className = "opt-btn"; b.innerText = opt;
                b.onclick = () => {
                    div.querySelectorAll('button').forEach(btn => btn.disabled = true);
                    b.style.background = idx === q.c ? "#28a745" : "#dc3545";
                    const aula = document.createElement('div');
                    aula.style = "margin-top:10px; padding:10px; background:rgba(255,255,255,0.05); border-left:3px solid #8a2be2; font-size:13px;";
                    aula.innerHTML = `<b>🎓 Aula:</b> ${q.e}`;
                    div.appendChild(aula);
                };
                div.appendChild(b);
            });
            lista.appendChild(div);
        });
    } catch(e) { lista.innerHTML = "<div class='card-ia'>Erro na conexão. Tente de novo.</div>"; }
}

async function enviarMsg() {
    const i = document.getElementById('chat-in');
    const b = document.getElementById('chat-box');
    if(!i.value) return;
    const v = i.value; i.value = "";
    b.innerHTML += `<div class="bolha user">${v}</div>`;
    
    try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{role:"user", content:v}] })
        });
        const d = await r.json();
        b.innerHTML += `<div class="bolha ia">${d.choices[0].message.content}</div>`;
        localStorage.setItem('dt_chat', b.innerHTML);
    } catch(e) { b.innerHTML += `<div class="bolha ia">Erro ao responder.</div>`; }
}
