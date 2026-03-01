const API_KEY = "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";

async function gerar() {
    const tema = document.getElementById('tema').value;
    if(!tema) return alert("Digite o assunto!");
    
    const lista = document.getElementById('questoes');
    lista.innerHTML = "<div class='dt-card'>⏳ O professor está preparando sua aula...</div>";

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{role: "user", content: `Gere 10 questões sobre ${tema}. Retorne APENAS JSON puro: [{"p":"pergunta","o":["a","b","c","d"],"c":0,"e":"EXPLICAÇÃO DA RESPOSTA"}]`}]
            })
        });
        
        const d = await res.json();
        const qts = JSON.parse(d.choices[0].message.content.match(/\[.*\]/s)[0]);
        lista.innerHTML = "";

        qts.forEach((q, i) => {
            const card = document.createElement('div');
            card.className = "dt-card";
            card.innerHTML = `<p style='margin-bottom:10px;'><b>${i+1}.</b> ${q.p}</p>`;
            
            q.o.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = "dt-opt-btn";
                btn.innerText = opt;
                
                btn.onclick = () => {
                    // Desativa todos os botões desta questão
                    card.querySelectorAll('.dt-opt-btn').forEach(b => b.disabled = true);
                    
                    // Pinta de verde se acertou, vermelho se errou
                    if(idx === q.c) {
                        btn.style.background = "#28a745 !important";
                        btn.style.borderColor = "#28a745 !important";
                    } else {
                        btn.style.background = "#dc3545 !important";
                        btn.style.borderColor = "#dc3545 !important";
                        // Mostra qual era a certa em verde discreto
                        card.querySelectorAll('.dt-opt-btn')[q.c].style.border = "2px solid #28a745";
                    }

                    // CRIA A MINI AULA (EXPLICAÇÃO)
                    const aulaDiv = document.createElement('div');
                    aulaDiv.className = "dt-mini-aula";
                    aulaDiv.innerHTML = `<b>🎓 Mini Aula:</b><br>${q.e}`;
                    card.appendChild(aulaDiv);
                };
                card.appendChild(btn);
            });
            lista.appendChild(card);
        });
    } catch(e) { lista.innerHTML = "<div class='dt-card'>Erro ao conectar. Tente de novo.</div>"; }
}

// Funções de troca de aba permanecem as mesmas
function aba(n) {
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    document.getElementById('painel-' + n).style.display = 'block';
    document.querySelectorAll('.dt-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + n).classList.add('active');
}
