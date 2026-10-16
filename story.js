/* ═══════════════════════════════════════════════════════
   HUB BRAIN — GERADOR DE STORIES
   Lógica: upload de print + navegação + download PNG
   ═══════════════════════════════════════════════════════ */

/* Estado global */
let imagens = {
    welcome: null,
    login: null
};

let slideAtual = 0;

/* ═══════════ SLIDES ═══════════ */
const SLIDES = [
    {
        nome: 'welcome',
        label: 'Welcome',
        imagemKey: 'welcome',
        badge: '✨ PÁGINA NOVA',
        titulo: 'Conhece o <em>Welcome</em>?',
        subtitulo: 'É a primeira tela que você vê quando abre o Hub Brain. Sem precisar criar conta.',
        placeholder: {
            ico: '🚪',
            txt: 'Suba o print da tela Welcome',
            hint: 'Clica no botão acima'
        },
        explicacao: {
            ico: '💡',
            titulo: 'O que ela faz?',
            texto: 'Apresenta o app em segundos, mostra as ferramentas principais e deixa você testar a calculadora de notas e os números da educação brasileira sem precisar de login.'
        }
    },
    {
        nome: 'login',
        label: 'Login',
        imagemKey: 'login',
        badge: '🔐 MUDOU POUCO',
        titulo: 'Login <em>repaginado</em>',
        subtitulo: 'Continua simples — a gente só tirou o mascote e deixou tudo mais clean e moderno.',
        placeholder: {
            ico: '🔑',
            txt: 'Suba o print da tela de Login',
            hint: 'Clica no botão acima'
        },
        explicacao: {
            ico: '⚡',
            titulo: 'O que mudou?',
            texto: 'Design mais bonito, campos mais compactos, confirmação de senha no cadastro e validação dos termos. Rápido, seguro e sem enrolação.'
        }
    }
];

/* ═══════════ NAVEGAÇÃO ═══════════ */
function montarNav() {
    const nav = document.getElementById('nav');
    nav.innerHTML = '';
    SLIDES.forEach((s, i) => {
        const b = document.createElement('button');
        b.className = 'nav-btn' + (i === 0 ? ' on' : '');
        b.textContent = s.label;
        b.onclick = () => mudarSlide(i);
        nav.appendChild(b);
    });
}

function mudarSlide(idx) {
    slideAtual = idx;
    document.querySelectorAll('.nav-btn').forEach((b, i) => {
        b.classList.toggle('on', i === idx);
    });
    atualizarUploadLabel();
    renderizar(idx);
}

/* ═══════════ RENDER ═══════════ */
function htmlSlide(s) {
    const img = imagens[s.imagemKey];

    const tela = img
        ? `<img src="${img}" alt="${s.label}">`
        : `<div class="phone-placeholder">
               <div class="ico">${s.placeholder.ico}</div>
               <div class="txt">${s.placeholder.txt}</div>
               <div class="hint">${s.placeholder.hint}</div>
           </div>`;

    return `
        <div class="story">
            <div class="badge">${s.badge}</div>

            <h1 class="story-title">${s.titulo}</h1>
            <p class="story-sub">${s.subtitulo}</p>

            <div class="phone-stage">
                <div class="phone-3d">
                    <div class="phone-screen">${tela}</div>
                </div>
            </div>

            <div class="explain">
                <div class="explain-icon">${s.explicacao.ico}</div>
                <div class="explain-txt">
                    <b>${s.explicacao.titulo}</b>
                    <span>${s.explicacao.texto}</span>
                </div>
            </div>

            <div class="story-footer">
                <div class="story-logo">HUB BRAIN</div>
                <div class="story-url">hubbrain.netlify.app</div>
            </div>
        </div>
    `;
}

function renderizar(idx, target) {
    const alvo = target || document.getElementById('preview-content');
    alvo.innerHTML = htmlSlide(SLIDES[idx]);
}

/* ═══════════ UPLOAD ═══════════ */
const uploadInput = document.getElementById('upload-input');
const uploadText = document.getElementById('upload-text');
const uploadLabel = document.getElementById('upload-label');

function atualizarUploadLabel() {
    const s = SLIDES[slideAtual];
    const temImg = !!imagens[s.imagemKey];
    uploadText.textContent = temImg
        ? `✓ Print do ${s.label} carregado (clica pra trocar)`
        : `📱 Subir print do ${s.label}`;
    uploadLabel.classList.toggle('ok', temImg);
}

uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        imagens[SLIDES[slideAtual].imagemKey] = ev.target.result;
        atualizarUploadLabel();
        renderizar(slideAtual);
    };
    reader.readAsDataURL(file);

    // Permite subir o mesmo arquivo de novo se trocar
    uploadInput.value = '';
});

/* ═══════════ DOWNLOAD ═══════════ */
async function baixarStory() {
    const btn = document.getElementById('btn-baixar');
    const status = document.getElementById('status-msg');

    btn.disabled = true;
    btn.querySelector('span').textContent = 'Gerando...';

    try {
        const renderArea = document.getElementById('render-area');
        renderizar(slideAtual, renderArea);

        await new Promise(r => setTimeout(r, 350));

        const canvas = await html2canvas(renderArea.firstElementChild, {
            width: 1080,
            height: 1920,
            scale: 1,
            backgroundColor: null,
            useCORS: true,
            logging: false
        });

        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hub-brain-story-${SLIDES[slideAtual].nome}.png`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 2000);

            renderArea.innerHTML = '';

            status.classList.add('show');
            setTimeout(() => status.classList.remove('show'), 2200);

            btn.disabled = false;
            btn.querySelector('span').textContent = 'Baixar PNG';
        }, 'image/png');

    } catch (e) {
        console.error('[story]', e);
        alert('Erro ao gerar imagem: ' + e.message);
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Baixar PNG';
    }
}

async function baixarTodos() {
    const btn = document.querySelector('.btn-secundario');
    btn.disabled = true;

    for (let i = 0; i < SLIDES.length; i++) {
        slideAtual = i;
        await baixarStory();
        await new Promise(r => setTimeout(r, 700));
    }

    // Volta pro primeiro slide
    mudarSlide(0);
    btn.disabled = false;
}

/* ═══════════ INIT ═══════════ */
montarNav();
atualizarUploadLabel();
renderizar(0);
