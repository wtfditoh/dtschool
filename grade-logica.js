import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
  authDomain: "dt-scho0l.firebaseapp.com",
  projectId: "dt-scho0l",
  storageBucket: "dt-scho0l.firebasestorage.app",
  messagingSenderId: "78578509391",
  appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a",
  measurementId: "G-F7TG23TBTL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TABELA_HORARIOS = {
    matutino: [
        { ordem: "1ª Aula", inicio: "07:00" }, { ordem: "2ª Aula", inicio: "07:50" },
        { ordem: "3ª Aula", inicio: "08:40" }, { ordem: "4ª Aula", inicio: "09:50" },
        { ordem: "5ª Aula", inicio: "10:40" }, { ordem: "6ª Aula", inicio: "11:30" }
    ],
    vespertino: [
        { ordem: "1ª Aula", inicio: "13:00" }, { ordem: "2ª Aula", inicio: "13:50" },
        { ordem: "3ª Aula", inicio: "14:40" }, { ordem: "4ª Aula", inicio: "15:50" },
        { ordem: "5ª Aula", inicio: "16:40" }, { ordem: "6ª Aula", inicio: "17:30" }
    ]
};

let diaAtualGrade = 'segunda';
let gradeHoraria = { segunda: [], terca: [], quarta: [], quinta: [], sexta: [] };
const userPhone = localStorage.getItem('dt_user_phone');

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    const local = localStorage.getItem('hub_brain_grade');
    if (local) { gradeHoraria = JSON.parse(local); renderizarAulas(); }
    if (userPhone) await carregarDadosNuvem();
    
    const dMap = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
    const d = dMap[new Date().getDay()];
    selecionarDia(d === 'domingo' || d === 'sabado' ? 'segunda' : d);
});

// --- FIREBASE ---
async function carregarDadosNuvem() {
    try {
        const docSnap = await getDoc(doc(db, "grades_horarias", userPhone));
        if (docSnap.exists()) { 
            gradeHoraria = docSnap.data().grade; 
            renderizarAulas(); 
        }
    } catch (e) { console.error(e); }
}

async function sincronizar() {
    localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
    if (userPhone) {
        await setDoc(doc(db, "grades_horarias", userPhone), { grade: gradeHoraria, atualizadoEm: Date.now() });
    }
}

// --- INTERFACE ---
window.selecionarDia = (dia) => {
    diaAtualGrade = dia;
    document.querySelectorAll('.btn-dia').forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-dia') === dia));
    renderizarAulas();
};

window.renderizarAulas = () => {
    const lista = document.getElementById('lista-aulas');
    if(!lista) return;
    const aulas = gradeHoraria[diaAtualGrade] || [];
    aulas.sort((a, b) => a.hora.localeCompare(b.hora));
    lista.innerHTML = aulas.length === 0 ? '<p style="text-align:center;margin-top:50px;">Nenhuma aula.</p>' :
        aulas.map((a, i) => `<div class="card-aula"><div><b>${a.hora}</b> - ${a.materia}</div></div>`).join('');
};

window.salvarAula = async () => {
    const turno = document.getElementById('aula-turno').value;
    const nAula = document.getElementById('aula-numero').value;
    const matSelect = document.getElementById('aula-materia-select').value;
    const matCustom = document.getElementById('aula-materia-custom').value.trim();
    
    const materiaFinal = matSelect || matCustom;
    if(!materiaFinal) return;

    const infoHorario = TABELA_HORARIOS[turno][nAula];
    gradeHoraria[diaAtualGrade].push({ materia: materiaFinal, hora: infoHorario.inicio });

    // Tenta agendar
    await agendarNoServidorOneSignal(materiaFinal, infoHorario.inicio);

    renderizarAulas();
    document.getElementById('modal-aula').style.display = 'none';
    await sincronizar();
};

// --- O CORAÇÃO DO PROBLEMA (AGENDAMENTO) ---
async function agendarNoServidorOneSignal(materia, horaInicio) {
    const appId = "f73275cd-17ad-4963-a25b-321ce2def2ba";
    const restKey = "Os_v2_app_64zhltixvvewhis3gioofxxsxjhcx5vbfocu4s4wq2rrsaus7edduivp3y26x4fv2qqoncgssgmitrrakiwiqog2afgj6hsxwugaeay";

    // Força para daqui a 70 segundos para o teste ser imediato
    let dataAlerta = new Date(new Date().getTime() + 70000);

    const corpo = {
        app_id: appId,
        contents: { "pt": `Aula de ${materia} em 10 min! 🧠` },
        headings: { "pt": "Hub Brain" },
        chrome_web_icon: "https://hubbrain.netlify.app/icon-514.png",
        send_after: dataAlerta.toISOString(),
        // AQUI ESTÁ O SEGREDO: Manda para todos que aceitaram notificação no site
        included_segments: ["Total Subscriptions"] 
    };

    try {
        const res = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json; charset=utf-8", 
                "Authorization": `Basic ${restKey}` 
            },
            body: JSON.stringify(corpo)
        });
        const data = await res.json();
        
        if (data.id) {
            alert("✅ AGENDADO NO SERVIDOR! Feche o Chrome agora e espere 1 min.");
        } else {
            alert("❌ ERRO NO ONESIGNAL: " + data.errors[0]);
        }
    } catch (e) {
        alert("❌ ERRO DE CONEXÃO: Verifique sua internet.");
    }
}

window.ativarNotificacoesReal = () => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(function(OneSignal) {
        OneSignal.Notifications.requestPermission();
    });
};
