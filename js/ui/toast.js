// Toast notifications
export function showToast(message, duration = 2000) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

export function showComboText(text) {
  const el = document.createElement('div');
  el.className = 'combo-text';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 600);
}

export function showScoreFloat(points, x, y) {
  const el = document.createElement('div');
  el.className = 'score-float';
  el.style.left = (x || (30 + Math.random() * 40)) + '%';
  el.style.top = (y || (30 + Math.random() * 20)) + '%';
  el.textContent = '+' + points;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 500);
}

export function showConfetti() {
  const emojis = ['🎉', '✨', '⭐', '💎', '🌈', '🎊'];
  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = Math.random() * 100 + '%';
    el.style.top = '-20px';
    el.style.animationDelay = (Math.random() * 0.5) + 's';
    el.style.animationDuration = (1.5 + Math.random()) + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }
}
