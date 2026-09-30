import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { KITS } from './data.js';
import { P } from './parts.js';
import * as TX from './textures.js';

const $ = (s) => document.querySelector(s);
const W = 7, H = 1.5, D = 5, T = 0.14, SP = 10, FLOOR_Y = -H / 2 + T;
const LID_OPEN = -2.0;
const damp = (dt, k) => 1 - Math.exp(-k * dt);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeBack = (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

// ---------- renderer / scene ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b0d); scene.fog = new THREE.Fog(0x0b0b0d, 18, 50);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.08, 0.5, 1.4);
composer.addPass(new OutputPass());

const key = new THREE.DirectionalLight(0xffffff, 2.1);
key.position.set(3, 12, 8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: 1, far: 30 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; scene.add(key);
scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x141416, 0.5));
const rimA = new THREE.PointLight(0xfff0dc, 70, 40, 2); rimA.position.set(-9, 3, 5); scene.add(rimA);
const rimB = new THREE.PointLight(0xa9b8ff, 35, 40, 2); rimB.position.set(9, 4, -4); scene.add(rimB);

// ---------- backdrop: scrolling grid, glow, particles ----------
const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.85, metalness: 0.1 }));
floor.position.y = -3.4; floor.receiveShadow = true; scene.add(floor);
const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ map: TX.glowTex(), color: 0xff6b4a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.16 }));
glow.scale.set(22, 1, 15); glow.position.y = -3.38; scene.add(glow);

// ---------- kit boxes ----------
const rail = new THREE.Group(); scene.add(rail);
const padTexture = TX.padTex();
const bodyMat = () => new THREE.MeshStandardMaterial({ color: 0x1c1d21, roughness: 0.55, metalness: 0.25 });

function makeUnit(kit, i) {
  const accent = new THREE.Color(kit.accent);
  const holder = new THREE.Group(); holder.position.x = i * SP; rail.add(holder);
  const tilt = new THREE.Group(); holder.add(tilt);
  const shell = new THREE.Group(); tilt.add(shell);
  const body = bodyMat(), edge = { opacity: 0 };
  const frontMat = new THREE.MeshStandardMaterial({ map: TX.frontTex(kit, i), emissiveMap: null, roughness: 0.4, metalness: 0.3 });
  const lidTop = new THREE.MeshStandardMaterial({ map: TX.lidTex(kit, i, KITS.length), roughness: 0.5, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0 });
  lidTop.emissiveMap = lidTop.map;
  const lidIn = body.clone(), floorMat = body.clone(); lidIn.metalness = 0.05; lidIn.roughness = 0.8; floorMat.color.set(0xffffff); floorMat.metalness = 0.05; floorMat.roughness = 0.85;

  const wall = (geo, mats, x, y, z) => {
    const m = new THREE.Mesh(geo, mats); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
    shell.add(m); return m;
  };
  wall(new THREE.BoxGeometry(W, H - T, T), [body, body, body, body, frontMat, body], 0, T / 2, D / 2 - T / 2);
  wall(new THREE.BoxGeometry(W, H - T, T), body, 0, T / 2, -D / 2 + T / 2);
  [-1, 1].forEach((s) => wall(new THREE.BoxGeometry(T, H - T, D - 2 * T), body, s * (W / 2 - T / 2), T / 2, 0));
  wall(new THREE.BoxGeometry(W, T, D), [body, body, floorMat, body, body, body], 0, -H / 2 + T / 2, 0);

  const lidPivot = new THREE.Group(); lidPivot.position.set(0, H / 2, -D / 2 - 0.06); shell.add(lidPivot);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(W + 0.12, 0.18, D + 0.12), [body, body, lidTop, lidIn, body, body]);
  lid.position.set(0, 0.09, (D + 0.12) / 2); lid.castShadow = lid.receiveShadow = true;
  lidPivot.add(lid);

  const partsG = new THREE.Group(); partsG.visible = false; tilt.add(partsG);
  return { kit, i, accent, holder, tilt, shell, lidPivot, lidTop, lidIn, floorMat, edge, partsG, parts: null,
    scale: i === 0 ? 1 : 0.68, lidA: 0, glow: 0, pk: 0 };
}

// Lazily build the contents of a box: procedural parts laid out in a grid of trays.
function ensureParts(u) {
  if (u.parts) return;
  u.floorMat.map = TX.floorTex(); u.floorMat.needsUpdate = true;
  u.lidIn.map = TX.lidInnerTex(u.kit); u.lidIn.needsUpdate = true;
  const n = u.kit.parts.length, rows = Math.ceil(n / 4), cols = Math.ceil(n / rows);
  const iw = W - 2 * T - 0.35, id = D - 2 * T - 0.35, cw = iw / cols, ch = id / rows;
  u.parts = u.kit.parts.map((def, idx) => {
    const raw = P[def.t](...def.a), box = new THREE.Box3().setFromObject(raw), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    raw.position.set(-c.x, -box.min.y, -c.z);
    const wrap = new THREE.Group(); wrap.add(raw);
    const s = Math.min((cw * 0.74) / Math.max(size.x, 0.01), (ch * 0.74) / Math.max(size.z, 0.01), 1.25 / Math.max(size.y, 0.01), 2.4);
    wrap.scale.setScalar(s);
    const holder = new THREE.Group(); holder.add(wrap);
    const row = Math.floor(idx / cols), inRow = Math.min(cols, n - row * cols), col = idx % cols;
    holder.position.set(-iw / 2 + cw * (col + 0.5) + ((cols - inRow) * cw) / 2, FLOOR_Y, -id / 2 + ch * (row + 0.5));
    holder.scale.setScalar(0.001);
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(cw * 0.94, ch * 0.94).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: padTexture, color: 0x1e1f23, transparent: true, depthWrite: false }));
    pad.position.set(holder.position.x, FLOOR_Y + 0.006, holder.position.z); u.partsG.add(pad);
    const mats = new Set();
    raw.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.part = idx; if (o.material.emissive) mats.add(o.material); } });
    mats.forEach((m) => { m.userData.e0 = m.emissive.clone(); m.userData.i0 = m.emissiveIntensity; });
    holder.userData.part = idx; u.partsG.add(holder);
    return { def, holder, wrap, pad, mats: [...mats], h: 0, s, sway: idx * 1.3 };
  });
}

const units = KITS.map(makeUnit);

// ---------- UI ----------
const info = $('#info'), tip = $('#tip'), partsUl = $('#parts');
$('#tot').textContent = String(KITS.length).padStart(2, '0');
const dots = $('#dots');
KITS.forEach((_, i) => { const b = document.createElement('button'); b.ariaLabel = `Kit ${i + 1}`; b.onclick = () => !opened && goTo(i); dots.append(b); });

let cur = 0, opened = false, hoverList = -1, hovPart = -1, hovBox = false, railX = 0, openK = 0, yaw = 0, pitch = 0.25;
const pointer = new THREE.Vector2(0, 0), accentNow = new THREE.Color(KITS[0].accent);

function setInfo(first) {
  const k = KITS[cur], apply = () => {
    document.documentElement.style.setProperty('--accent', k.accent);
    $('#band').textContent = k.band; $('#title').textContent = k.name; $('#edition').textContent = k.edition;
    $('#concept').textContent = k.concept; $('#cost').textContent = k.cost; $('#cur').textContent = String(cur + 1).padStart(2, '0');
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === cur));
    $('#prev').disabled = cur === 0; $('#next').disabled = cur === KITS.length - 1;
  };
  if (first) return apply();
  info.classList.add('swap'); setTimeout(() => { apply(); info.classList.remove('swap'); }, 220);
}
function goTo(i) { const n = clamp(i, 0, KITS.length - 1); if (n === cur) return; cur = n; setInfo(); }
$('#prev').onclick = () => !opened && goTo(cur - 1);
$('#next').onclick = () => !opened && goTo(cur + 1);

function openBox() {
  if (opened) return;
  const u = units[cur]; ensureParts(u); u.partsG.visible = true; opened = true; yaw = 0; pitch = 0.25;
  $('#ptitle').textContent = u.kit.name; $('#pedition').textContent = u.kit.edition; $('#pcount').textContent = u.kit.parts.length;
  partsUl.innerHTML = '';
  u.kit.parts.forEach((p, i) => {
    const li = document.createElement('li'); li.innerHTML = `<span>${String(i + 1).padStart(2, '0')}</span>${p.n}<em>${p.q}</em>`;
    li.onmouseenter = () => (hoverList = i); li.onmouseleave = () => (hoverList = -1); partsUl.append(li);
  });
  document.body.classList.add('open');
}
function closeBox() { if (!opened) return; opened = false; hoverList = -1; hovPart = -1; tip.classList.remove('show'); document.body.classList.remove('open'); }
$('#close').onclick = closeBox;
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' && !opened) goTo(cur + 1);
  else if (e.key === 'ArrowLeft' && !opened) goTo(cur - 1);
  else if ((e.key === 'Enter' || e.key === ' ') && !opened) openBox();
  else if (e.key === 'Escape') closeBox();
});

// ---------- pointer: hover, click, drag ----------
const ray = new THREE.Raycaster(); let drag = null;
canvas.addEventListener('pointermove', (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  tip.style.transform = `translate(${e.clientX + 18}px, ${e.clientY + 16}px)`;
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 6) drag.moved = true;
    if (opened && drag.moved) { yaw = clamp(yaw + (e.clientX - drag.lx) * 0.006, -1.1, 1.1); pitch = clamp(pitch + (e.clientY - drag.ly) * 0.004, 0.05, 0.6); }
    drag.lx = e.clientX; drag.ly = e.clientY;
  }
});
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', (e) => {
  const d = drag; drag = null; if (!d) return;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(pointer, camera); pick();
  const dx = e.clientX - d.x;
  if (!opened && Math.abs(dx) > 70) goTo(cur + (dx < 0 ? 1 : -1));
  else if (!d.moved && !opened && hovBox) openBox();
});
canvas.addEventListener('pointerleave', () => { pointer.set(0, 0); });

function pick() {
  const u = units[cur];
  if (!opened) {
    hovBox = ray.intersectObject(u.shell, true).length > 0; hovPart = -1;
  } else {
    hovBox = false; hovPart = -1;
    const hit = ray.intersectObjects(u.parts.map((p) => p.holder), true)[0];
    if (hit && u.partsG.visible && u.pk > 0.3) hovPart = hit.object.userData.part;
  }
}

// ---------- resize ----------
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h);
  bloom.resolution.set(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- main loop ----------
let tPrev = performance.now(), tAcc = 0;
const camPos = new THREE.Vector3(0, 2, 13), camLook = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
let lastHov = -2;

function frame() {
  const now = performance.now(), dt = Math.min((now - tPrev) / 1000, 0.05); tPrev = now; tAcc += dt; const t = tAcc;
  if (renderer.domElement.width !== Math.floor(innerWidth * renderer.getPixelRatio()) && innerWidth > 0) resize();
  railX += (-cur * SP - railX) * damp(dt, 5); rail.position.x = railX;
  openK += ((opened ? 1 : 0) - openK) * damp(dt, 4);
  accentNow.lerp(units[cur].accent, damp(dt, 4));
  glow.material.color.copy(accentNow);
  glow.position.x = 0;

  ray.setFromCamera(pointer, camera); pick();

  units.forEach((u, i) => {
    const act = i === cur, sc = act ? 1 : opened ? 0 : 0.68;
    u.scale += (sc - u.scale) * damp(dt, 6); u.holder.scale.setScalar(Math.max(u.scale, 0.001)); u.holder.visible = u.scale > 0.03;
    if (!u.holder.visible) return;
    const openA = act && opened;
    u.holder.position.y += ((act ? (openA ? 0 : 1.05) : 0.5) + Math.sin(t * 0.9 + i * 1.7) * (openA ? 0.03 : 0.14) - u.holder.position.y) * damp(dt, 5);
    const ty = openA ? yaw : Math.sin(t * 0.45 + i) * 0.3 + (act ? pointer.x * 0.28 : 0);
    const tx = openA ? pitch * 0 : 0.5 + (act ? -pointer.y * 0.12 : 0);
    u.tilt.rotation.y += (ty - u.tilt.rotation.y) * damp(dt, 5);
    u.tilt.rotation.x += (tx - u.tilt.rotation.x) * damp(dt, 5);
    u.lidA += ((openA ? LID_OPEN : 0) - u.lidA) * damp(dt, openA ? 4.2 : 6); u.lidPivot.rotation.x = u.lidA;
    u.glow += ((act && !opened && hovBox ? 1 : 0) - u.glow) * damp(dt, 8);
    u.lidTop.emissiveIntensity = 0.18 * u.glow;

    // parts: pop in once the lid is up, stagger by index
    const ready = openA && u.lidA < -0.9;
    u.pk = clamp(u.pk + (ready ? dt : -dt * 3), 0, 3);
    if (u.parts) {
      if (!openA && u.pk <= 0) u.partsG.visible = false;
      const hv = openA ? (hoverList >= 0 ? hoverList : hovPart) : -1;
      u.parts.forEach((p, idx) => {
        const e = easeBack(clamp((u.pk - idx * 0.07) / 0.55, 0, 1));
        p.h += ((idx === hv ? 1 : 0) - p.h) * damp(dt, 12);
        p.holder.scale.setScalar(Math.max(e, 0.001));
        p.holder.position.y = FLOOR_Y + (1 - Math.min(e, 1)) * 0.8 + p.h * 0.32 + Math.sin(t * 2 + p.sway) * 0.025 * p.h;
        p.wrap.rotation.y = Math.sin(t * 0.6 + p.sway) * 0.22 + p.h * Math.sin(t * 1.6) * 0.25;
        p.pad.material.color.set(0x1e1f23).lerp(u.accent, p.h * 0.55);
        p.mats.forEach((m) => { m.emissive.copy(m.userData.e0).lerp(u.accent, p.h * 0.5); m.emissiveIntensity = m.userData.i0 + p.h * 0.12; });
      });
    }
  });

  // tooltip + list highlight
  const u = units[cur], hv = opened ? (hoverList >= 0 ? hoverList : hovPart) : -1;
  if (hv !== lastHov) {
    lastHov = hv;
    [...partsUl.children].forEach((li, i) => li.classList.toggle('on', i === hv));
    if (hv >= 0 && hoverList < 0) { const p = u.kit.parts[hv]; tip.innerHTML = `${p.n}<em>${p.q}</em>`; tip.classList.add('show'); } else tip.classList.remove('show');
  }
  canvas.style.cursor = drag && drag.moved ? 'grabbing' : hovBox || hovPart >= 0 ? 'pointer' : opened ? 'grab' : 'default';
  $('#hint').textContent = hovBox ? 'Click to open' : 'Click the box to open';

  // camera
  const asp = camera.aspect, fit = Math.max(1, 15 / asp / 14.5);
  const sx = asp > 1.3 ? 2.0 : 0, cp = opened ? tmpP.set(sx, 10.6, 8.6) : tmpP.set(0, 2.6, 14.5);
  cp.multiplyScalar(opened ? Math.max(1, 9 / (asp * 8.5)) : fit);
  cp.x += pointer.x * 0.7; cp.y += pointer.y * 0.4 + (opened ? 0 : 0);
  const cl = opened ? tmpL.set(sx, asp > 1.3 ? -0.2 : -2.2, 0.2) : tmpL.set(0, -0.2, 0);
  camPos.lerp(cp, damp(dt, 3)); camLook.lerp(cl, damp(dt, 3));
  camera.position.copy(camPos); camera.lookAt(camLook);

  composer.render();
  requestAnimationFrame(frame);
}

setInfo(true);
Promise.race([Promise.all([document.fonts.load('800 100px "Bricolage Grotesque"'), document.fonts.load('500 20px "DM Mono"')]), new Promise((r) => setTimeout(r, 2500))])
  .catch(() => {})
  .then(() => {
    // textures were drawn at construction, so rebuild them now that fonts are ready
    units.forEach((u, i) => { u.lidTop.map = u.lidTop.emissiveMap = TX.lidTex(u.kit, i, KITS.length); u.shell.children[0].material[4].map = TX.frontTex(u.kit, i); u.lidTop.needsUpdate = true; });
    frame(); setTimeout(() => $('#loader').classList.add('done'), 150);
  });
