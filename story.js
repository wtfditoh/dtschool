/* story.js — Gerador de Stories para o novo Login/Cadastro */

let imagens = {
    login: null,
    cadastro: null
};

let slideAtual = 0;

const SLIDES = [
    {
        nome: 'hook',
        label: 'Novidade',
        tipo: 'hook',
        badge: '✨ NOVO VISUAL',
        titulo: 'Estudar ficou<br><em>bonito.</em>',
        subtitulo: 'O Hub Brain ganhou um banho de loja. Mais vidro, mais neon, mais você.',
        explicacao: {
            ico: '🧠',
            titulo: 'O que mudou?',
            texto: 'Fizemos um upgrade insano no design de toda a área de login e cadastro. Ficou digno de e-sports.'
        }
    },
    {
        nome: 'login',
        label: 'Tela de Login',
        tipo: 'upload',
        imagemKey: 'login',
        badge: '🔐 DE VOLTA',
        titulo: 'Sua conta,<br><em>seu ritmo.</em>',
        subtitulo: 'O vidro agora é transparente de verdade. O fundo do HUB BRAIN aparece por trás.',
        placeholder: {
            ico: '📱',
            txt: 'Suba o print da tela de Login',
            hint: 'Com o fundo do HUB BRAIN e o card de vidro'
        },
        explicacao: {
            ico: '🌌',
            titulo: 'Glassmorphism Real',
            texto: 'Aquele efeito de vidro transparente que a gente ama. O logo HUB BRAIN fica flutuando no fundo.'
        }
    },
    {
        nome: 'cadastro',
        label: 'Tela de Cadastro',
        tipo: 'upload',
        imagemKey: 'cadastro',
        badge: '🚀 NOVO POR AQUI?',
        titulo: 'Comece agora,<br><em>é grátis.</em>',
        subtitulo: 'Criar conta leva menos de 30 segundos. Zero enrolação, zero anúncios.',
        placeholder: {
            ico: '📱',
            txt: 'Suba o print da tela de Cadastro',
            hint: 'A tela com o HUB BRAIN roxo no fundo'
        },
        explicacao: {
            ico: '💜',
            titulo: 'Tudo num só lugar',
            texto: 'Agenda, IA, notas, foco e ranking. O app que a gente sempre quis ter.'
        }
    },
    {
        nome: 'cta',
        label: 'CTA',
        tipo: 'cta',
        badge: '🧠 HUB BRAIN',
        titulo: 'Bora organizar<br><em>sua vida?</em>',
        subtitulo: 'Agenda, notas, foco e IA num app só.<br>Grátis, sem anúncio, feito por aluno.',
        ctaLink: 'hubbrain.netlify.app'
    }
];

const $ = (id) => document.getElementById(id);

function montarNav() {
    const nav = $('nav');
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

/* ═══════════ HTML DOS SLIDES ═══════════ */

function htmlSlideHook(s) {
    return `
        <div class="story">
            <div class="badge">${s.badge}</div>
            <h1 class="story-title">${s.titulo}</h1>
            <p class="story-sub">${s.subtitulo}</p>

            <div class="mockup-login">
                <div class="glass-preview">
                    <div class="glass-form">
                        <div style="height: 60px; width: 60%; background: rgba(255,255,255,0.1); border-radius: 10px; align-self: center; margin-bottom: 20px;"></div>
                        <div class="glass-input"></div>
                        <div class="glass-input"></div>
                        <div class="glass-btn"></div>
                    </div>
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

function htmlSlideUpload(s) {
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

function htmlSlideCta(s) {
    return `
        <div class="story story-cta">
            <div class="badge">${s.badge}</div>

            <div class="story-center">
                <h1 class="story-title cta-titulo">${s.titulo}</h1>
                <p class="story-sub cta-sub">${s.subtitulo}</p>

                <div class="cta-url-box">
                    <span class="cta-url-dot"></span>
                    <span>${s.ctaLink}</span>
                </div>
            </div>

            <div class="story-footer">
                <div class="story-logo">HUB BRAIN</div>
                <div class="story-url">Feito por DITOH</div>
            </div>
        </div>
    `;
}

function htmlSlide(s) {
    if (s.tipo === 'hook') return htmlSlideHook(s);
    if (s.tipo === 'upload') return htmlSlideUpload(s);
    if (s.tipo === 'cta') return htmlSlideCta(s);
    return '';
}

function renderizar(idx, target) {
    const alvo = target || $('preview-content');
    alvo.innerHTML = htmlSlide(SLIDES[idx]);
}

/* ═══════════ UPLOAD ═══════════ */
const uploadInput = $('upload-input');
const uploadText = $('upload-text');
const uploadLabel = $('upload-label');
const uploadArea = document.querySelector('.upload-area');

function atualizarUploadLabel() {
    const s = SLIDES[slideAtual];
    if (s.tipo !== 'upload') {
        if (uploadArea) uploadArea.style.display = 'none';
        return;
    }
    if (uploadArea) uploadArea.style.display = 'block';
    const temImg = !!imagens[s.imagemKey];
    uploadText.textContent = temImg
        ? `✓ Print carregado (clica pra trocar)`
        : `📱 Subir print: ${s.label}`;
    uploadLabel.classList.toggle('ok', temImg);
}

if (uploadInput) {
    uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const s = SLIDES[slideAtual];
            if (s.tipo !== 'upload') return;
            imagens[s.imagemKey] = ev.target.result;
            atualizarUploadLabel();
            renderizar(slideAtual);
        };
        reader.readAsDataURL(file);
        uploadInput.value = '';
    });
}

/* ═══════════ DOWNLOAD ═══════════ */
async function baixarStory() {
    const btn = $('btn-baixar');
    const status = $('status-msg');
    if (!btn) return;

    btn.disabled = true;
    btn.querySelector('span').textContent = 'Gerando...';

    try {
        const renderArea = $('render-area');
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
            a.download = `hub-brain-login-${SLIDES[slideAtual].nome}.png`;
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
    if (!btn) return;
    btn.disabled = true;
    for (let i = 0; i < SLIDES.length; i++) {
        slideAtual = i;
        await baixarStory();
        await new Promise(r => setTimeout(r, 700));
    }
    mudarSlide(0);
    btn.disabled = false;
}

/* ═══════════ PREVIEW RESPONSIVO ═══════════ */
function fitPreview() {
    const wrap = document.querySelector('.preview-wrap');
    const scaler = document.querySelector('.preview-scaler');
    if (!wrap || !scaler) return;

    const larguraTela = window.innerWidth;
    const alturaTela = window.innerHeight;

    let w = Math.min(larguraTela - 24, 400);
    let h = w * 16 / 9;

    const alturaMax = alturaTela - 180;
    if (h > alturaMax) {
        h = alturaMax;
        w = h * 9 / 16;
    }

    wrap.style.width = w + 'px';
    wrap.style.height = h + 'px';

    const scale = w / 1080;
    scaler.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', fitPreview);
window.addEventListener('orientationchange', () => setTimeout(fitPreview, 100));

/* ═══════════ INIT ═══════════ */
montarNav();
atualizarUploadLabel();
renderizar(0);
requestAnimationFrame(fitPreview);
