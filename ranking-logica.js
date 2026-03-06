import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuração do Firebase (A mesma que você já usa)
const firebaseConfig = {
  apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
  authDomain: "dt-scho0l.firebaseapp.com",
  projectId: "dt-scho0l",
  storageBucket: "dt-scho0l.firebasestorage.app",
  messagingSenderId: "78578509391",
  appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function carregarRankingGlobal() {
    try {
        const querySnapshot = await getDocs(collection(db, "notas"));
        let rankingData = [];

        querySnapshot.forEach((doc) => {
            const dados = doc.data();
            const materias = dados.materias || [];
            
            if (materias.length > 0) {
                // Calcula a média de todas as matérias do usuário
                const somaDasMedias = materias.reduce((acc, m) => {
                    const somaNotas = (Number(m.n1)||0) + (Number(m.n2)||0) + (Number(m.n3)||0) + (Number(m.n4)||0);
                    return acc + (somaNotas / 4);
                }, 0);

                const mediaFinal = (somaDasMedias / materias.length).toFixed(1);

                rankingData.push({
                    nome: dados.nome || "Estudante",
                    media: parseFloat(mediaFinal),
                    foto: dados.fotoPerfil || null // Caso você adicione fotos depois
                });
            }
        });

        // Ordena do maior para o menor
        rankingData.sort((a, b) => b.media - a.media);

        renderizarRanking(rankingData);

    } catch (error) {
        console.error("Erro ao buscar ranking:", error);
        document.getElementById('ranking-geral').innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar dados.</p>`;
    }
}

function renderizarRanking(lista) {
    // 1. Preencher o Top 3 (Podium)
    if (lista[0]) atualizarPodio('p1', lista[0]);
    if (lista[1]) atualizarPodio('p2', lista[1]);
    if (lista[2]) atualizarPodio('p3', lista[2]);

    // 2. Preencher o restante da lista (do 4º em diante)
    const listaGeral = document.getElementById('ranking-geral');
    if (lista.length > 3) {
        listaGeral.innerHTML = lista.slice(3).map((user, index) => `
            <div class="ranking-item">
                <span class="pos">${index + 4}º</span>
                <div class="user-info">
                    <span class="user-name">${user.nome}</span>
                    <span class="user-points">Média Geral: ${user.media}</span>
                </div>
                <div class="trend-icon">
                    <i data-lucide="trending-up" style="width:14px; color:#444;"></i>
                </div>
            </div>
        `).join('');
    } else if (lista.length <= 3) {
        listaGeral.innerHTML = `<p style="text-align:center; color:#555; padding:20px;">A disputa está apenas começando!</p>`;
    }

    // Reinicia os ícones do Lucide para os novos elementos
    if (window.lucide) lucide.createIcons();
}

function atualizarPodio(idPrefix, usuario) {
    const nomeEl = document.getElementById(`${idPrefix}-name`);
    const scoreEl = document.getElementById(`${idPrefix}-score`);
    
    if (nomeEl) nomeEl.innerText = usuario.nome;
    if (scoreEl) scoreEl.innerText = usuario.media.toFixed(1);
}

// Inicia a busca assim que o script carrega
document.addEventListener('DOMContentLoaded', carregarRankingGlobal);
