import { getFirestore, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();

export async function carregarRankingReal() {
    const listaGeral = document.getElementById('lista-ranking-geral');
    const podioContainer = document.getElementById('podio-container');

    try {
        // Puxa os 20 melhores usuários
        const q = query(collection(db, "usuarios"), orderBy("pontos", "desc"), limit(20));
        const snap = await getDocs(q);
        
        let users = [];
        snap.forEach(doc => users.push(doc.data()));

        // Limpa as listas
        podioContainer.innerHTML = "";
        listaGeral.innerHTML = "";

        users.forEach((user, index) => {
            const pos = index + 1;
            const nome = user.nome || "Anônimo";
            const pontos = user.pontos || 0;

            if (pos <= 3) {
                // Adiciona ao Pódio
                podioContainer.innerHTML += `
                    <div class="podio-item pos-${pos}">
                        <div style="font-size: 24px;">${pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉'}</div>
                        <div style="font-weight:bold; font-size:12px; margin-top:5px;">${nome.split(' ')[0]}</div>
                        <div style="color:#8a2be2; font-size:11px;">${pontos} XP</div>
                    </div>
                `;
            } else {
                // Adiciona à Lista Geral
                listaGeral.innerHTML += `
                    <div class="card-rank">
                        <span class="rank-num">${pos}</span>
                        <span class="rank-name">${nome}</span>
                        <span class="rank-score">${pontos}<span>XP</span></span>
                    </div>
                `;
            }
        });

    } catch (e) {
        console.error("Erro no ranking:", e);
    }
}
