import * as THREE from 'three';

export const FD = '"Bricolage Grotesque", "Segoe UI", sans-serif';
export const FM = '"DM Mono", Consolas, monospace';

const BG = '#18191c', INK = '#f2ede4', DIM = '#8b8a86';

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, aniso = 8) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
}
function rrect(x, a, b, w, h, r) { x.beginPath(); x.roundRect(a, b, w, h, r); }
function fit(x, text, font, max, size) {
  do { x.font = font(size); size -= 2; } while (x.measureText(text).width > max && size > 12);
}

// Gear silhouette used as the brand mark on the lid.
function gear(x, cx, cy, ro, teeth, color, hole) {
  const ri = ro * 0.84, step = Math.PI * 2 / teeth;
  x.beginPath();
  for (let i = 0; i < teeth; i++) {
    [[0, ri], [.14, ro], [.46, ro], [.6, ri]].forEach(([f, r], k) => {
      const a = (i + f) * step, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      i === 0 && k === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
    });
  }
  x.closePath(); x.fillStyle = color; x.fill();
  x.beginPath(); x.arc(cx, cy, ro * hole, 0, 7); x.fillStyle = BG; x.fill();
  x.beginPath(); x.arc(cx, cy, ro * hole * 0.42, 0, 7); x.fillStyle = color; x.fill();
}

export function lidTex(kit, idx, total) {
  const w = 1200, h = 860, [c, x] = cv(w, h), a = kit.accent;
  x.fillStyle = BG; x.fillRect(0, 0, w, h);
  gear(x, 900, 400, 290, 14, a, 0.62);
  x.textBaseline = 'alphabetic'; x.textAlign = 'left';
  x.font = `800 150px ${FD}`; x.fillStyle = INK; x.fillText('cirkity', 70, 190);
  const tw = x.measureText('cirkity').width; x.fillStyle = a; x.fillText('.', 70 + tw, 190);
  x.font = `500 26px ${FM}`; x.fillStyle = DIM; x.fillText('STEM ENGINEERING KITS', 74, 240);
  // kit name, wrapped to two lines when long
  const words = kit.name.split(' '); let lines = [kit.name];
  x.font = `800 92px ${FD}`;
  if (x.measureText(kit.name).width > 620 && words.length > 1) {
    const m = Math.ceil(words.length / 2); lines = [words.slice(0, m).join(' '), words.slice(m).join(' ')];
  }
  const y0 = lines.length === 2 ? 620 : 690;
  lines.forEach((l, i) => { fit(x, l, (s) => `800 ${s}px ${FD}`, 640, 92); x.fillStyle = INK; x.fillText(l, 70, y0 + i * 96); });
  x.font = `500 27px ${FM}`; x.fillStyle = a; x.fillText(kit.edition.toUpperCase(), 74, h - 70);
  // corner tags
  x.textAlign = 'right'; x.font = `500 26px ${FM}`; x.fillStyle = INK;
  x.fillText(`GRADES ${kit.band}`, w - 70, 100);
  x.fillStyle = DIM; x.fillText(`No. ${String(idx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, w - 70, h - 70);
  return tex(c);
}

export function lidInnerTex(kit) {
  const w = 1000, h = 720, [c, x] = cv(w, h);
  x.fillStyle = '#131417'; x.fillRect(0, 0, w, h);
  gear(x, w / 2, h / 2 - 40, 120, 12, kit.accent, 0.6);
  x.textAlign = 'center'; x.font = `800 64px ${FD}`; x.fillStyle = INK; x.fillText('cirkity.', w / 2, h / 2 + 170);
  return tex(c);
}

export function frontTex(kit, idx) {
  const w = 1400, h = 300, [c, x] = cv(w, h), a = kit.accent;
  x.fillStyle = BG; x.fillRect(0, 0, w, h);
  x.fillStyle = a; x.fillRect(0, 0, 240, h);
  x.fillStyle = '#121214'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `800 150px ${FD}`; x.fillText(String(idx + 1).padStart(2, '0'), 120, h / 2 + 8);
  x.textAlign = 'left'; fit(x, kit.name, (s) => `800 ${s}px ${FD}`, 720, 100);
  x.fillStyle = INK; x.fillText(kit.name, 290, 122);
  x.font = `500 30px ${FM}`; x.fillStyle = DIM; x.fillText(kit.edition, 292, 200);
  x.textAlign = 'right'; x.font = `800 54px ${FD}`; x.fillStyle = INK; x.fillText('cirkity', w - 74, 118);
  x.fillStyle = a; x.fillText('.', w - 50, 118);
  x.font = `500 27px ${FM}`; x.fillStyle = DIM; x.fillText(`GRADES ${kit.band}`, w - 54, 190);
  return tex(c);
}

export function floorTex() {
  const [c, x] = cv(64, 64); x.fillStyle = '#121316'; x.fillRect(0, 0, 64, 64); return tex(c, 1);
}

export function padTex() {
  const s = 256, [c, x] = cv(s, s); rrect(x, 8, 8, s - 16, s - 16, 34); x.fillStyle = '#fff'; x.fill();
  return tex(c, 4);
}

export function glowTex() {
  const [c, x] = cv(256, 256), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.4, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return tex(c, 1);
}

export function labelTex(text, { w = 256, h = 160, fg = '#121214', bg = '#f4f1ea' } = {}) {
  const [c, x] = cv(w, h); rrect(x, 4, 4, w - 8, h - 8, 26); x.fillStyle = bg; x.fill();
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `800 ${h * .6}px ${FD}`; x.fillText(text, w / 2, h / 2 + 4);
  return tex(c, 4);
}

export function tickTex() {
  const w = 1024, h = 128, [c, x] = cv(w, h);
  x.fillStyle = '#f5c542'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1a1a'; x.font = `500 22px ${FM}`; x.textAlign = 'center';
  for (let i = 0; i <= 16; i++) {
    const px = 30 + i * 60; x.fillRect(px - 2, 0, 4, i % 2 ? 40 : 66);
    if (!(i % 2)) x.fillText(String(i / 2), px, 92);
  }
  return tex(c, 4);
}

export function zoneTex(accent) {
  const w = 1024, h = 640, [c, x] = cv(w, h);
  x.fillStyle = '#26272b'; x.fillRect(0, 0, w, h); x.strokeStyle = accent; x.lineWidth = 8; x.setLineDash([26, 16]);
  x.strokeRect(50, 150, 340, 340); x.strokeRect(w - 390, 150, 340, 340); x.setLineDash([]);
  x.fillStyle = accent; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `800 190px ${FD}`;
  x.fillText('A', 220, 322); x.fillText('B', w - 220, 322);
  x.beginPath(); x.moveTo(440, 322); x.lineTo(560, 322); x.lineTo(540, 296); x.moveTo(560, 322); x.lineTo(540, 348); x.lineWidth = 10; x.stroke();
  return tex(c, 4);
}
