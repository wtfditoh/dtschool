const API_KEY = "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";

async function gerar() {
    const tema = document.getElementById('tema').value;
    if(!tema) return alert("Digite o assunto!");
    
    const lista = document.getElementById('questoes');
    lista.innerHTML = "<div class='dt-card'>⏳ Preparando sua Mini Aula e Questões...</div>";

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{role: "user", content: `Gere 10 questões sobre ${tema}. Retorne APENAS o array JSON puro, sem texto antes ou depois: [{"p":"pergunta","o":["A","B","C","D"],"c":0,"e":"Aqui vai a mini aula explicando o porquê desta resposta"}]`}]
            })
        });
        
        const d = await res.json();
        const textoLimpo = d.choices[0].message.content.match(/\[.*\]/s)[0];
        const qts = JSON.parse(textoLimpo);
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
                    // Trava os botões
                    card.querySelectorAll('.dt-opt-btn').forEach(b => b.disabled = true);
                    
                    // Lógica de Cores após o clique
                    if(idx === q.c) {
                        btn.style.setProperty('background-color', '#28a745', 'important');
                    } else {
                        btn.style.setProperty('background-color', '#dc3545', 'important');
                        // Mostra a correta
                        card.querySelectorAll('.dt-opt-btn')[q.c].style.border = "2px solid #28a745";
                    }

                    // APARECER A MINI AULA
                    const aulaDiv = document.createElement('div');
                    aulaDiv.className = "dt-mini-aula";
                    aulaDiv.innerHTML = `<strong>🎓 Mini Aula:</strong><br>${q.e}`;
                    card.appendChild(aulaDiv);
                };
                card.appendChild(btn);
            });
            lista.appendChild(card);
        });
    } catch(e) { 
        console.error(e);
        lista.innerHTML = "<div class='dt-card'>Erro ao gerar. Tente um tema mais específico.</div>"; 
    }
}

// Mantenha as funções de enviar() e aba() que já funcionam.
