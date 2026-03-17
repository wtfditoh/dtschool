// conquistas.js — Sistema central de conquistas do Hub Brain
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// ============================================
// DEFINIÇÃO DE TODAS AS CONQUISTAS
// ============================================
export const CONQUISTAS = [
    // 🔥 SEQUÊNCIA DE FOCO
    { id: 'primeiro_passo',  emoji: '👟', nome: 'Primeiro Passo',  desc: '1ª sessão de foco completa',       categoria: 'foco'    },
    { id: 'aquecendo',       emoji: '🌡️', nome: 'Aquecendo',       desc: '3 dias seguidos de foco',          categoria: 'foco'    },
    { id: 'em_chamas',       emoji: '🔥', nome: 'Em Chamas',       desc: '7 dias seguidos de foco',          categoria: 'foco'    },
    { id: 'dedicado',        emoji: '💪', nome: 'Dedicado',        desc: '14 dias seguidos de foco',         categoria: 'foco'    },
    { id: 'imparavel',       emoji: '⚡', nome: 'Imparável',       desc: '30 dias seguidos de foco',         categoria: 'foco'    },
    { id: 'lendario_streak', emoji: '👑', nome: 'Lendário',        desc: '100 dias seguidos de foco',        categoria: 'foco'    },

    // ⏱️ HORAS ESTUDADAS
    { id: 'iniciante',       emoji: '🌱', nome: 'Iniciante',       desc: '5h acumuladas de estudo',          categoria: 'horas'   },
    { id: 'aplicado',        emoji: '📖', nome: 'Aplicado',        desc: '10h acumuladas de estudo',         categoria: 'horas'   },
    { id: 'estudioso',       emoji: '🎓', nome: 'Estudioso',       desc: '25h acumuladas de estudo',         categoria: 'horas'   },
    { id: 'veterano_horas',  emoji: '🏅', nome: 'Veterano',        desc: '50h acumuladas de estudo',         categoria: 'horas'   },
    { id: 'elite',           emoji: '💎', nome: 'Elite',           desc: '100h acumuladas de estudo',        categoria: 'horas'   },
    { id: 'mestre',          emoji: '🔮', nome: 'Mestre',          desc: '200h acumuladas de estudo',        categoria: 'horas'   },
    { id: 'lenda_horas',     emoji: '🌟', nome: 'Lenda',           desc: '500h acumuladas de estudo',        categoria: 'horas'   },

    // 🎯 METAS
    { id: 'focado',          emoji: '🎯', nome: 'Focado',          desc: 'Bateu a meta do dia pela 1ª vez',  categoria: 'metas'   },
    { id: 'consistente',     emoji: '📅', nome: 'Consistente',     desc: 'Bateu a meta 7 dias seguidos',     categoria: 'metas'   },
    { id: 'imbativel',       emoji: '🛡️', nome: 'Imbatível',       desc: 'Bateu a meta 30 dias seguidos',    categoria: 'metas'   },

    // 📋 TAREFAS
    { id: 'organizado',      emoji: '📋', nome: 'Organizado',      desc: 'Concluiu 5 tarefas',               categoria: 'tarefas' },
    { id: 'produtivo',       emoji: '⚙️', nome: 'Produtivo',       desc: 'Concluiu 20 tarefas',              categoria: 'tarefas' },
    { id: 'maquina',         emoji: '🤖', nome: 'Máquina',         desc: 'Concluiu 50 tarefas',              categoria: 'tarefas' },
    { id: 'implacavel',      emoji: '💣', nome: 'Implacável',      desc: 'Concluiu 100 tarefas',             categoria: 'tarefas' },

    // 📚 NOTAS
    { id: 'primeiro_lancamento', emoji: '✏️', nome: 'Primeiro Lançamento', desc: 'Cadastrou a 1ª nota',      categoria: 'notas'   },
    { id: 'aprovado',        emoji: '✅', nome: 'Aprovado',        desc: 'Passou em 1 matéria',              categoria: 'notas'   },
    { id: 'aluno_10',        emoji: '🏆', nome: 'Aluno 10',        desc: 'Passou em todas as matérias',      categoria: 'notas'   },
    { id: 'nota_maxima',     emoji: '💯', nome: 'Nota Máxima',     desc: 'Tirou 10 em alguma prova',         categoria: 'notas'   },

    // 🏆 RANKING
    { id: 'competidor',      emoji: '🥉', nome: 'Competidor',      desc: 'Entrou no top 50',                 categoria: 'ranking' },
    { id: 'destaque',        emoji: '🥈', nome: 'Destaque',        desc: 'Entrou no top 10',                 categoria: 'ranking' },
    { id: 'podio',           emoji: '🥇', nome: 'Pódio',           desc: 'Entrou no top 3',                  categoria: 'ranking' },
    { id: 'campeao',         emoji: '👑', nome: 'Campeão',         desc: 'Ficou em 1º lugar',                categoria: 'ranking' },

    // 🧠 ESPECIAIS
    { id: 'madrugador',      emoji: '🌅', nome: 'Madrugador',      desc: 'Fez sessão de foco antes das 6h',  categoria: 'especial' },
    { id: 'notivago',        emoji: '🌙', nome: 'Notívago',        desc: 'Fez sessão após meia-noite',       categoria: 'especial' },
    { id: 'perfeccionista',  emoji: '⭐', nome: 'Perfeccionista',  desc: 'Concluiu todas as tarefas do dia', categoria: 'especial' },
    { id: 'polvo',           emoji: '🐙', nome: 'Polvo',           desc: 'Usou todas as abas no mesmo dia',  categoria: 'especial' },
];

// ============================================
// VERIFICAR E DESBLOQUEAR CONQUISTAS
// ============================================
export async function verificarConquistas(email, dados) {
    if (!email || !dados) return [];

    const conquistasAtuais = dados.conquistas || [];
    const novas = [];

    const historico     = dados.historico_foco   || [];
    const tarefas       = dados.tarefas_concluidas || 0;
    const materias      = dados.materias          || [];
    const metaStreak    = dados.meta_streak       || 0;
    const rankPos       = dados.rank_posicao      || 999;
    const abusUsadas    = dados.abas_usadas       || [];

    // Total de horas
    const totalMin  = historico.reduce((a, s) => a + s.minutos, 0);
    const totalHoras = totalMin / 60;

    // Streak de foco
    const diasUnicos = [...new Set(historico.map(s => s.data))].sort().reverse();
    let streak = 0;
    let dCheck = new Date();
    for (const dia of diasUnicos) {
        const dStr = dCheck.toISOString().split('T')[0];
        if (dia === dStr) { streak++; dCheck.setDate(dCheck.getDate() - 1); }
        else break;
    }

    const ja = (id) => conquistasAtuais.includes(id);
    const add = (id) => { if (!ja(id)) novas.push(id); };

    // 🔥 SEQUÊNCIA
    if (historico.length >= 1)   add('primeiro_passo');
    if (streak >= 3)             add('aquecendo');
    if (streak >= 7)             add('em_chamas');
    if (streak >= 14)            add('dedicado');
    if (streak >= 30)            add('imparavel');
    if (streak >= 100)           add('lendario_streak');

    // ⏱️ HORAS
    if (totalHoras >= 5)         add('iniciante');
    if (totalHoras >= 10)        add('aplicado');
    if (totalHoras >= 25)        add('estudioso');
    if (totalHoras >= 50)        add('veterano_horas');
    if (totalHoras >= 100)       add('elite');
    if (totalHoras >= 200)       add('mestre');
    if (totalHoras >= 500)       add('lenda_horas');

    // 🎯 METAS
    if (metaStreak >= 1)         add('focado');
    if (metaStreak >= 7)         add('consistente');
    if (metaStreak >= 30)        add('imbativel');

    // 📋 TAREFAS
    if (tarefas >= 5)            add('organizado');
    if (tarefas >= 20)           add('produtivo');
    if (tarefas >= 50)           add('maquina');
    if (tarefas >= 100)          add('implacavel');

    // 📚 NOTAS
    if (materias.length >= 1)    add('primeiro_lancamento');
    const aprovadas = materias.filter(m => (Number(m.n1)||0)+(Number(m.n2)||0)+(Number(m.n3)||0)+(Number(m.n4)||0) >= 24);
    if (aprovadas.length >= 1)   add('aprovado');
    if (aprovadas.length === materias.length && materias.length > 0) add('aluno_10');
    const temNota10 = materias.some(m => [m.n1,m.n2,m.n3,m.n4].some(n => Number(n) === 10));
    if (temNota10)               add('nota_maxima');

    // 🏆 RANKING
    if (rankPos <= 50)           add('competidor');
    if (rankPos <= 10)           add('destaque');
    if (rankPos <= 3)            add('podio');
    if (rankPos === 1)           add('campeao');

    // 🧠 ESPECIAIS
    const horaAtual = new Date().getHours();
    if (dados._sessaoAgora) {
        if (horaAtual < 6)      add('madrugador');
        if (horaAtual >= 0 && horaAtual < 4) add('notivago');
    }
    if (abusUsadas.length >= 6)  add('polvo');

    // Salva novas conquistas no Firebase
    if (novas.length > 0) {
        try {
            await updateDoc(doc(db, "notas", email), {
                conquistas: arrayUnion(...novas)
            });
        } catch(e) { console.error("Erro ao salvar conquistas:", e); }
    }

    return novas;
}

// ============================================
// MOSTRAR POPUP DE CONQUISTA DESBLOQUEADA
// ============================================
export function mostrarPopupConquista(ids) {
    if (!ids || ids.length === 0) return;

    ids.forEach((id, i) => {
        const conquista = CONQUISTAS.find(c => c.id === id);
        if (!conquista) return;

        setTimeout(() => {
            // Remove popup anterior se existir
            const existente = document.getElementById('popup-conquista');
            if (existente) existente.remove();

            const popup = document.createElement('div');
            popup.id = 'popup-conquista';
            popup.style.cssText = `
                position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(100px);
                background: #111116; border: 1px solid rgba(138,43,226,0.4);
                border-radius: 20px; padding: 16px 24px; z-index: 99999;
                display: flex; align-items: center; gap: 14px;
                box-shadow: 0 10px 40px rgba(138,43,226,0.3);
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                min-width: 280px; max-width: 340px;
            `;

            popup.innerHTML = `
                <div style="font-size:36px; line-height:1;">${conquista.emoji}</div>
                <div style="flex:1;">
                    <div style="font-size:9px; font-weight:800; letter-spacing:2px; color:#8a2be2; margin-bottom:3px;">CONQUISTA DESBLOQUEADA!</div>
                    <div style="font-size:15px; font-weight:900; color:white;">${conquista.nome}</div>
                    <div style="font-size:11px; color:#555; margin-top:2px;">${conquista.desc}</div>
                </div>
            `;

            document.body.appendChild(popup);

            // Animação de entrada
            setTimeout(() => {
                popup.style.transform = 'translateX(-50%) translateY(0)';
            }, 50);

            // Animação de saída
            setTimeout(() => {
                popup.style.transform = 'translateX(-50%) translateY(100px)';
                popup.style.opacity = '0';
                setTimeout(() => popup.remove(), 400);
            }, 3500);

        }, i * 1000);
    });
}
  
