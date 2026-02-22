// Dialog/modal utility
export function showDialog({ title, message, buttons = [] }) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const panel = document.createElement('div');
    panel.className = 'overlay-panel';
    panel.style.textAlign = 'center';
    panel.style.minWidth = '280px';

    if (title) {
      const h = document.createElement('div');
      h.style.cssText = 'font-size:clamp(16px, 4.5vw, 22px);font-weight:700;margin-bottom:clamp(8px, 2.5vw, 14px);';
      h.textContent = title;
      panel.appendChild(h);
    }

    if (message) {
      const p = document.createElement('div');
      p.style.cssText = 'color:#8e92b8;margin-bottom:clamp(10px, 3vw, 16px);font-size:clamp(12px, 3.2vw, 15px);';
      p.textContent = message;
      panel.appendChild(p);
    }

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap;';

    buttons.forEach(btn => {
      const b = document.createElement('button');
      b.className = `btn ${btn.class || 'btn-secondary'}`;
      b.textContent = btn.text;
      b.onclick = () => {
        overlay.remove();
        resolve(btn.value);
      };
      btnContainer.appendChild(b);
    });

    panel.appendChild(btnContainer);
    overlay.appendChild(panel);
    document.getElementById('app').appendChild(overlay);
  });
}
