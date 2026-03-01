const API_KEY = "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";

async function gerar() {
    const tema = document.getElementById('tema').value;
    if(!tema) return alert("Digite o assunto!");
    
    const lista = document.getElementById('questoes');
    lista.innerHTML = "<div class='dt-card'>⏳ Gerando simulado com mini aula...</div>";

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{role: "user", content: `Gere 10 questões sobre ${tema}. Retorne APENAS JSON: [{"p":"pergunta","o":["a","b","c","d"],"c":0,"e":"explicação"}]`}]
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
                    
                    // FORÇANDO A COR DIRETAMENTE NO ELEMENTO
                    if(idx === q.c) {
                        btn.style.setProperty('background-color', '#28a745', 'important');
                        btn.style.setProperty('color', 'white', 'important');
                    } else {
                        btn.style.setProperty('background-color', '#dc3545', 'important');
                        btn.style.setProperty('color', 'white', 'important');
                        // Destaca a correta
                        card.querySelectorAll('.dt-opt-btn')[q.c].style.border = "2px solid #28a745";
                    }

                    // EXIBIR MINI AULA
                    const aula = document.createElement('div');
                    aula.className = "dt-mini-aula";
                    aula.innerHTML = `<b>🎓 Mini Aula:</b><br>${q.e}`;
                    card.appendChild(aula);
                };
                card.appendChild(btn);
            });
            lista.appendChild(card);
        });
    } catch(e) { lista.innerHTML = "<div class='dt-card'>Erro ao carregar questões.</div>"; }
}

function aba(n) {
    document.querySelectorAll('.dt-painel').forEach(p => p.style.display = 'none');
    document.getElementById('painel-' + n).style.display = 'block';
    document.querySelectorAll('.dt-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + n).classList.add('active');
}
