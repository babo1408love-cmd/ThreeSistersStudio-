/**
 * generate-icons.js — Puppeteer로 모든 터치아이콘 + PWA 아이콘 + 스크린샷 생성
 * Usage: node generate-icons.js
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ICON_SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 167, 180, 192, 384, 512];
const SCREENSHOT_SIZES = [
  { w: 390, h: 844, name: 'screenshot-mobile', dpr: 2 },
  { w: 1024, h: 768, name: 'screenshot-tablet', dpr: 2 },
];

const ICON_HTML = (size) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;overflow:hidden;">
<canvas id="c" width="${size}" height="${size}"></canvas>
<script>
const s = ${size};
const c = document.getElementById('c');
const ctx = c.getContext('2d');

// 배경: 게임 테마 그라디언트 (딥 퍼플 → 다크 블루)
const bg = ctx.createRadialGradient(s*0.5, s*0.4, s*0.1, s*0.5, s*0.5, s*0.7);
bg.addColorStop(0, '#6b21a8');
bg.addColorStop(0.5, '#3b0764');
bg.addColorStop(1, '#0f0a2e');
ctx.fillStyle = bg;
ctx.beginPath();
// 둥근 모서리 (iOS 마스킹용)
const r = s * 0.18;
ctx.moveTo(r, 0);
ctx.lineTo(s - r, 0);
ctx.quadraticCurveTo(s, 0, s, r);
ctx.lineTo(s, s - r);
ctx.quadraticCurveTo(s, s, s - r, s);
ctx.lineTo(r, s);
ctx.quadraticCurveTo(0, s, 0, s - r);
ctx.lineTo(0, r);
ctx.quadraticCurveTo(0, 0, r, 0);
ctx.fill();

// 반짝이 파티클
ctx.globalAlpha = 0.3;
for (let i = 0; i < 12; i++) {
  const px = s * (0.1 + Math.sin(i * 1.7) * 0.4 + 0.4);
  const py = s * (0.1 + Math.cos(i * 2.3) * 0.4 + 0.4);
  const pr = s * (0.005 + Math.abs(Math.sin(i * 3.1)) * 0.015);
  ctx.fillStyle = ['#c4b5fd','#a78bfa','#e9d5ff','#fde68a'][i % 4];
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fill();
}
ctx.globalAlpha = 1;

// 소환의 나무 실루엣 (하단)
ctx.fillStyle = 'rgba(139,92,246,0.15)';
ctx.beginPath();
ctx.ellipse(s*0.5, s*0.92, s*0.35, s*0.12, 0, 0, Math.PI*2);
ctx.fill();
// 나무 줄기
ctx.fillStyle = 'rgba(139,92,246,0.2)';
ctx.fillRect(s*0.46, s*0.65, s*0.08, s*0.28);
// 나무 관 (crown)
ctx.beginPath();
ctx.ellipse(s*0.5, s*0.58, s*0.22, s*0.18, 0, 0, Math.PI*2);
ctx.fill();

// 🧚 요정 이모지
const fontSize = Math.round(s * 0.52);
ctx.font = fontSize + 'px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// 글로우 효과
ctx.shadowColor = '#c084fc';
ctx.shadowBlur = s * 0.12;
ctx.fillText('🧚', s * 0.5, s * 0.42);
ctx.shadowBlur = s * 0.06;
ctx.fillText('🧚', s * 0.5, s * 0.42);
ctx.shadowBlur = 0;

// 하단 텍스트 (큰 아이콘만)
if (s >= 128) {
  const ts = Math.round(s * 0.11);
  ctx.font = 'bold ' + ts + 'px "Segoe UI", sans-serif';
  ctx.fillStyle = '#e9d5ff';
  ctx.shadowColor = '#7c3aed';
  ctx.shadowBlur = s * 0.03;
  ctx.fillText('몽글벨', s * 0.5, s * 0.82);
  ctx.shadowBlur = 0;
}
</script>
</body>
</html>
`;

async function main() {
  const iconsDir = path.join(__dirname, 'icons');
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  // --- Generate icon PNGs ---
  for (const size of ICON_SIZES) {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(ICON_HTML(size), { waitUntil: 'load' });
    // Wait for emoji font rendering
    await new Promise(r => setTimeout(r, 500));

    const canvas = await page.$('#c');
    await canvas.screenshot({ path: path.join(iconsDir, `icon-${size}x${size}.png`), omitBackground: true });
    await page.close();
    console.log(`  ✓ icon-${size}x${size}.png`);
  }

  // --- Special: apple-touch-icon (180x180, same as icon-180) ---
  fs.copyFileSync(
    path.join(iconsDir, 'icon-180x180.png'),
    path.join(iconsDir, 'apple-touch-icon.png')
  );
  console.log('  ✓ apple-touch-icon.png (copy of 180x180)');

  // --- Special: favicon-16x16, favicon-32x32 ---
  fs.copyFileSync(path.join(iconsDir, 'icon-16x16.png'), path.join(iconsDir, 'favicon-16x16.png'));
  fs.copyFileSync(path.join(iconsDir, 'icon-32x32.png'), path.join(iconsDir, 'favicon-32x32.png'));
  console.log('  ✓ favicon-16x16.png, favicon-32x32.png');

  // --- Generate PWA screenshots ---
  // Use the actual game for screenshots
  // First check if dev server is running
  let serverUrl = null;
  try {
    const testPage = await browser.newPage();
    const resp = await testPage.goto('http://localhost:8001', { timeout: 3000 });
    if (resp && resp.ok()) serverUrl = 'http://localhost:8001';
    await testPage.close();
  } catch (e) {
    // try common ports
    for (const port of [8000, 3000, 5000]) {
      try {
        const tp = await browser.newPage();
        const r = await tp.goto(`http://localhost:${port}`, { timeout: 2000 });
        if (r && r.ok()) { serverUrl = `http://localhost:${port}`; await tp.close(); break; }
        await tp.close();
      } catch (_) {}
    }
  }

  if (serverUrl) {
    for (const ss of SCREENSHOT_SIZES) {
      const page = await browser.newPage();
      await page.setViewport({ width: ss.w, height: ss.h, deviceScaleFactor: ss.dpr });
      await page.goto(serverUrl, { waitUntil: 'networkidle0', timeout: 10000 });
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({
        path: path.join(iconsDir, `${ss.name}.png`),
        clip: { x: 0, y: 0, width: ss.w, height: ss.h }
      });
      await page.close();
      console.log(`  ✓ ${ss.name}.png (${ss.w * ss.dpr}x${ss.h * ss.dpr})`);
    }
  } else {
    console.log('  ⚠ Dev server not found, generating placeholder screenshots');
    // Generate placeholder screenshots with game branding
    for (const ss of SCREENSHOT_SIZES) {
      const pw = ss.w * ss.dpr;
      const ph = ss.h * ss.dpr;
      const page = await browser.newPage();
      await page.setViewport({ width: pw, height: ph, deviceScaleFactor: 1 });
      await page.setContent(`
        <!DOCTYPE html><html><body style="margin:0;overflow:hidden;">
        <canvas id="c" width="${pw}" height="${ph}"></canvas>
        <script>
        const c=document.getElementById('c'), ctx=c.getContext('2d');
        const w=${pw}, h=${ph};
        const bg=ctx.createLinearGradient(0,0,0,h);
        bg.addColorStop(0,'#1e0a3e'); bg.addColorStop(0.5,'#0f0a2e'); bg.addColorStop(1,'#050218');
        ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);
        // Stars
        for(let i=0;i<40;i++){
          ctx.fillStyle='rgba(196,181,253,'+(0.2+Math.random()*0.5)+')';
          ctx.beginPath();
          ctx.arc(Math.random()*w,Math.random()*h*0.6,1+Math.random()*2,0,Math.PI*2);
          ctx.fill();
        }
        // Fairy
        ctx.font='${Math.round(pw*0.15)}px "Segoe UI Emoji"';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.shadowColor='#c084fc'; ctx.shadowBlur=30;
        ctx.fillText('🧚',w/2,h*0.35);
        ctx.shadowBlur=0;
        // Title
        ctx.font='bold ${Math.round(pw*0.08)}px "Segoe UI",sans-serif';
        ctx.fillStyle='#e9d5ff';
        ctx.shadowColor='#7c3aed'; ctx.shadowBlur=10;
        ctx.fillText('몽글벨',w/2,h*0.55);
        ctx.font='${Math.round(pw*0.035)}px "Segoe UI",sans-serif';
        ctx.fillStyle='#a78bfa';
        ctx.fillText('정령과 함께하는 모험',w/2,h*0.63);
        ctx.shadowBlur=0;
        </script></body></html>
      `, { waitUntil: 'load' });
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: path.join(iconsDir, `${ss.name}.png`) });
      await page.close();
      console.log(`  ✓ ${ss.name}.png (${pw}x${ph} placeholder)`);
    }
  }

  await browser.close();
  console.log('\n✅ All icons generated in icons/ directory');
}

main().catch(e => { console.error(e); process.exit(1); });
