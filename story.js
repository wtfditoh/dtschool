/* story.js — Hub Brain · Gerador de Stories
   Foco: nova funcionalidade de Compartilhar Pasta nos Conteúdos
   4 slides: Hook (problema) → Botão novo → Página compartilhada → CTA */

let imagens = {
    compartilhar: null,   // print da tela do app com o FAB
    pasta: null           // print da página compartilhada
};

let slideAtual = 0;

/* ═══════════ SLIDES ═══════════ */
const SLIDES = [
    {
        nome: 'problema',
        label: 'Problema',
        tipo: 'hook',
        badge: '😩 JÁ PASSOU POR ISSO?',
        titulo: 'Alguém tem<br><em>tudo de matemática</em>?',
        subtitulo: 'Você pede no grupo, ninguém responde. Ou mandam 30 fotos soltas que se perdem no meio da conversa.',
        chat: [
            { tipo: 'outro', txt: 'algm tem as foto de mat do 2 bim??' },
            { tipo: 'outro', txt: 'eu tbm qro 👀' },
            { tipo: 'outro', txt: 'tbm n tenho, mandaram no grupo semana passada' },
            { tipo: 'outro', txt: 'si perdeu tudo no meio da conversa kkkk' }
        ],
        explicacao: {
            ico: '💡',
            titulo: 'A gente resolveu isso.',
            texto: 'Agora você compartilha a pasta inteira do Hub Brain com UM link só. Bora ver como funciona →'
        }
    },
    {
        nome: 'botao',
        label: 'Como funciona',
        tipo: 'upload',
        imagemKey: 'compartilhar',
        badge: '🔗 NOVIDADE NO APP',
        titulo: 'Um <em>botão novo</em><br>que muda tudo',
        subtitulo: 'Filtra a matéria e o bimestre, e o botão "Compartilhar" aparece. Toca nele e pronto.',
        placeholder: {
            ico: '📱',
            txt: 'Suba o print da tela de Conteúdos',
            hint: 'Com o FAB "Compartilhar" aparecendo'
        },
        explicacao: {
            ico: '🎯',
            titulo: 'Como funciona?',
            texto: 'Escolhe o filtro (ex: Matemática · 2º BIM), toca em Compartilhar, e o app cria um link único com tudo que tá ali.'
        }
    },
    {
        nome: 'pasta',
        label: 'O que chega',
        tipo: 'upload',
        imagemKey: 'pasta',
        badge: '😍 DO OUTRO LADO',
        titulo: 'Um link só.<br><em>Tudo dentro.</em>',
        subtitulo: 'Quem recebe no zap vê um preview bonito. Clica e abre a página com todas as fotos e PDFs.',
        placeholder: {
            ico: '📚',
            txt: 'Suba o print da pasta compartilhada',
            hint: 'A página que abre pelo link /pasta/...'
        },
        explicacao: {
            ico: '⚡',
            titulo: 'Por que é brabo?',
            texto: 'Preview aparece no zap sozinho, abre em 1 clique e cada foto tem botão de baixar. Zoom, navegação entre fotos, tudo.'
        }
    },
    {
        nome: 'cta',
        label: 'CTA',
        tipo: 'cta',
        badge: '🚀 CHAMA A GALERA',
        titulo: 'Bora parar de<br><em>perder arquivo</em>?',
        subtitulo: 'Agenda, notas, foco, IA e conteúdos num app só.<br>Grátis, sem anúncio, feito por aluno.',
        ctaLink: 'hubbrain.netlify.app'
    }
];

/* ═══════════ UI ═══════════ */
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

/* Slide 1 — Hook com chat feio */
function htmlSlideHook(s) {
    const bubbles = s.chat.map((m) => `
        <div class="chat-bubble ${m.tipo}">
            <span>${m.txt}</span>
        </div>
    `).join('');

    return `
        <div class="story">
            <div class="badge">${s.badge}</div>
            <h1 class="story-title">${s.titulo}</h1>
            <p class="story-sub">${s.subtitulo}</p>

            <div class="chat-mockup">
                <div class="chat-topo">
                    <div class="chat-avatar">👥</div>
                    <div class="chat-info">
                        <b>Turma 2º EM</b>
                        <small>14 participantes</small>
                    </div>
                    <div class="chat-badge">zap</div>
                </div>
                <div class="chat-corpo">
                    ${bubbles}
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

/* Slides 2 e 3 — upload de print */
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

/* Slide 4 — CTA */
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

    // Limites: altura disponível na tela (deixa espaço pro resto da UI)
    const alturaMax = Math.min(window.innerHeight * 0.55, 560);
    const larguraMax = Math.min(wrap.parentElement?.clientWidth || 320, 320);

    // Calcula pelas 2 restrições
    let w = larguraMax;
    let h = w * 16 / 9;
    if (h > alturaMax) {
        h = alturaMax;
        w = h * 9 / 16;
    }

    wrap.style.width = w + 'px';
    wrap.style.height = h + 'px';

    const scale = w / 1080;
    scaler.style.transform = `scale(${scale})`;
    scaler.style.transformOrigin = 'top left';
}

window.addEventListener('resize', fitPreview);
window.addEventListener('orientationchange', () => setTimeout(fitPreview, 100));

/* ═══════════ INIT ═══════════ */
montarNav();
atualizarUploadLabel();
renderizar(0);
requestAnimationFrame(fitPreview);
