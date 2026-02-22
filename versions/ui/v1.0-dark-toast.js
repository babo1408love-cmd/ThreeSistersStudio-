// Toast notifications — 실시간 자막 비활성화
export function showToast(message, duration = 2000) { return; }
export function showComboText(text) { return; }
export function showScoreFloat(points, x, y) { return; }

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
    document.getElementById('app').appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }
}
