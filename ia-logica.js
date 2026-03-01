const API_KEY = "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";

// Inicia na aba de simulado ao carregar
document.addEventListener('DOMContentLoaded', () => {
    aba('simulado');
});

function aba(n) {
    // Esconde fisicamente os painéis
    const pSimulado = document.getElementById('painel-simulado');
    const pChat = document.getElementById('painel-chat');
    const tSimulado = document.getElementById('tab-simulado');
    const tChat = document.getElementById('tab-chat');

    if (n === 'simulado') {
        pSimulado.style.display = 'block';
        pChat.style.display = 'none';
        tSimulado.classList.add('active');
        tChat.classList.remove('active');
    } else {
        pSimulado.style.display = 'none';
        pChat.style.display = 'block';
        tChat.classList.add('active');
        tSimulado.classList.remove('active');
    }
}

// O MODAL SÓ APARECE AQUI
function aviso(msg) {
    const m = document.getElementById('custom-modal');
    document.getElementById('modal-text').innerText = msg;
    m.style.setProperty('display', 'flex', 'important');
}

async function gerar() {
    const tema = document.getElementById('tema').value;
    if(!tema) return aviso("⚠️ Digite um assunto primeiro!");
    
    const lista = document.getElementById('questoes');
    lista.innerHTML = "<div class='dt-card'>⏳ Preparando aula e questões...</div>";

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{role: "user", content: `Gere 10 questões sobre ${tema}. Retorne APENAS JSON: [{"p":"pergunta","o":["a","b","c","d"],"c":0,"e":"mini aula"}]`}]
            })
        });
        
        const d = await res.json();
        const qts = JSON.parse(d.choices[0].message.content.match(/\[.*\]/s)[0]);
        lista.innerHTML = "";

        qts.forEach((q, i) => {
            const card = document.createElement('div');
            card.className = "dt-card";
            card.innerHTML = `<p><b>${i+1}.</b> ${q.p}</p>`;
            
            q.o.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = "dt-opt-btn";
                btn.innerText = opt;
                btn.onclick = () => {
                    card.querySelectorAll('.dt-opt-btn').forEach(b => b.disabled = true);
                    if(idx === q.c) {
                        btn.style.setProperty('background-color', '#28a745', 'important');
                    } else {
                        btn.style.setProperty('background-color', '#dc3545', 'important');
                        card.querySelectorAll('.dt-opt-btn')[q.c].style.border = "2px solid #28a745";
                    }
                    const aula = document.createElement('div');
                    aula.style = "margin-top:15px; padding:12px; border-left:4px solid #8a2be2; background:rgba(255,255,255,0.05); font-size:14px; color:#ccc;";
                    aula.innerHTML = `<b>🎓 Mini Aula:</b><br>${q.e}`;
                    card.appendChild(aula);
                };
                card.appendChild(btn);
            });
            lista.appendChild(card);
        });
    } catch(e) { lista.innerHTML = "<div class='dt-card'>Erro. Tente novamente.</div>"; }
}
