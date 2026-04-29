// ===== TOAST =====
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== TEMA =====
function setTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(theme === 'dark' ? 'darkBtn' : 'lightBtn').classList.add('active');

  showToast(theme === 'dark' ? '🌙 Tema escuro ativado' : '☀️ Tema claro ativado');
}

// ===== COR DE DESTAQUE =====
function setAccent(color) {
  document.documentElement.style.setProperty('--accent', color);
  localStorage.setItem('accent', color);

  document.querySelectorAll('.color-dot').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  showToast('🎨 Cor atualizada!');
}

// ===== FONTE =====
function setFontSize(size) {
  const sizes = { small: '14px', medium: '16px', large: '18px' };
  document.documentElement.style.fontSize = sizes[size];
  localStorage.setItem('fontSize', size);

  document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  showToast('🔡 Tamanho de fonte ajustado!');
}

// ===== NOME =====
function saveName() {
  const name = document.getElementById('username').value.trim();
  if (!name) { showToast('⚠️ Digite um nome!'); return; }
  localStorage.setItem('username', name);
  showToast(`✅ Nome salvo: ${name}`);
}

// ===== AVATAR =====
function setAvatar(emoji) {
  localStorage.setItem('avatar', emoji);
  document.querySelectorAll('.avatar-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  showToast(`Avatar definido: ${emoji}`);
}

// ===== PREFERÊNCIAS TOGGLE =====
function savePref(key, value) {
  localStorage.setItem(key, value);
  showToast(value ? '🔔 Ativado!' : '🔕 Desativado!');
}

// ===== EXPORTAR DADOS =====
function exportData() {
  const data = { ...localStorage };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hubbrain-config.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Dados exportados!');
}

// ===== LIMPAR DADOS =====
function clearData() {
  if (!confirm('Tem certeza? Isso vai apagar todas as configurações salvas.')) return;
  localStorage.clear();
  showToast('🗑️ Dados removidos!');
  setTimeout(() => location.reload(), 1200);
}

// ===== CARREGAR PREFERÊNCIAS SALVAS =====
function loadPreferences() {
  const theme = localStorage.getItem('theme') || 'dark';
  const accent = localStorage.getItem('accent') || '#6c63ff';
  const fontSize = localStorage.getItem('fontSize') || 'medium';
  const username = localStorage.getItem('username') || '';
  const avatar = localStorage.getItem('avatar') || '🧠';

  // Tema
  document.body.setAttribute('data-theme', theme);
  if (theme === 'light') {
    document.getElementById('lightBtn')?.classList.add('active');
    document.getElementById('darkBtn')?.classList.remove('active');
  }

  // Accent
  document.documentElement.style.setProperty('--accent', accent);
  document.querySelectorAll('.color-dot').forEach(btn => {
    if (btn.style.background === accent) btn.classList.add('active');
  });

  // Fonte
  const sizes = { small: '14px', medium: '16px', large: '18px' };
  document.documentElement.style.fontSize = sizes[fontSize] || '16px';

  // Username
  if (username) document.getElementById('username').value = username;

  // Avatar
  document.querySelectorAll('.avatar-btn').forEach(btn => {
    if (btn.textContent === avatar) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  // Toggles
  ['studyReminder', 'newContent', 'sounds'].forEach(key => {
    const el = document.getElementById(key);
    if (el && localStorage.getItem(key) !== null) {
      el.checked = localStorage.getItem(key) === 'true';
    }
  });
}

// Inicializa
loadPreferences();
