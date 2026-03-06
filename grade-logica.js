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

window.mostrarAvisoCustom = (msg) => {
    const toast = document.getElementById('custom-toast');
    if(toast) {
        document.getElementById('toast-message').innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const local = localStorage.getItem('hub_brain_grade');
    if (local) { gradeHoraria = JSON.parse(local); renderizarAulas(); }
    
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(function(OneSignal) {
        OneSignal.init({ appId: "f73275cd-17ad-4963-a25b-321ce2def2ba" });
    });
    
    selecionarDia('segunda');
});

window.selecionarDia = (dia) => {
    diaAtualGrade = dia;
    document.querySelectorAll('.btn-dia').forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-dia') === dia));
    renderizarAulas();
};

window.renderizarAulas = () => {
    const lista = document.getElementById('lista-aulas');
    if(!lista) return;
    const aulas = gradeHoraria[diaAtualGrade] || [];
    lista.innerHTML = aulas.map(a => `
        <div class="card-aula">
            <div class="aula-tempo"><b>${a.hora}</b></div>
            <div class="aula-info"><b>${a.materia}</b></div>
        </div>
    `).join('');
};

window.abrirModalAula = () => { document.getElementById('modal-aula').style.display = 'flex'; };
window.fecharModalAula = () => { document.getElementById('modal-aula').style.display = 'none'; };

window.salvarAula = async () => {
    const turno = document.getElementById('aula-turno').value;
    const nAula = document.getElementById('aula-numero').value;
    const matSelect = document.getElementById('aula-materia-select').value;
    const matCustom = document.getElementById('aula-materia-custom').value.trim();
    const materiaFinal = matSelect || matCustom;

    if(!materiaFinal) return alert("Escolha a matéria");

    const info = TABELA_HORARIOS[turno][nAula];
    if(!gradeHoraria[diaAtualGrade]) gradeHoraria[diaAtualGrade] = [];
    gradeHoraria[diaAtualGrade].push({ materia: materiaFinal, hora: info.inicio });

    // EXECUÇÃO DO SINAL
    enviarEmergencia(materiaFinal);

    renderizarAulas();
    fecharModalAula();
    
    if(userPhone) {
        localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
        await setDoc(doc(db, "grades_horarias", userPhone), { grade: gradeHoraria });
    }
    window.mostrarAvisoCustom("🚀 Aula Guardada! Verifique as Notificações.");
};

async function enviarEmergencia(materia) {
    const appId = "f73275cd-17ad-4963-a25b-321ce2def2ba";
    const restKey = "Os_v2_app_64zhltixvvewhis3gioofxxsxjhcx5vbfocu4s4wq2rrsaus7edduivp3y26x4fv2qqoncgssgmitrrakiwiqog2afgj6hsxwugaeay";

    try {
        await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json; charset=utf-8", 
                "Authorization": `Basic ${restKey}` 
            },
            body: JSON.stringify({
                app_id: appId,
                contents: { "pt": `🚀 Sua aula de ${materia} foi salva!` },
                headings: { "pt": "Hub Brain" },
                included_segments: ["Total Subscriptions"]
            })
        });
    } catch (e) { console.log("Erro de disparo."); }
}

window.ativarNotificacoesReal = () => {
    OneSignalDeferred.push(function(OneSignal) {
        OneSignal.Notifications.requestPermission();
    });
};
