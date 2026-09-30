import * as THREE from 'three';
import { labelTex, tickTex, zoneTex } from './textures.js';

const K = { kraft: 0xc9a06c, kraftL: 0xdcbb8a, wood: 0xe3bd7f, tape: 0xe9dcb0, steel: 0xb9c0ca, brass: 0xd4a72c, copper: 0xb8642f, black: 0x14161b, white: 0xf1f3f6, red: 0xe5484d };
const GEAR = [0xf59e0b, 0x22d3ee, 0xa78bfa, 0x34d399, 0xf472b6];

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({
  color, roughness: o.r ?? 0.65, metalness: o.m ?? 0, side: o.d ? THREE.DoubleSide : THREE.FrontSide,
  transparent: o.a !== undefined, opacity: o.a ?? 1, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1,
});
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const Cy = (rt, rb, h, s = 32, open = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open);
const Sp = (r) => new THREE.SphereGeometry(r, 32, 20);
const add = (g, geo, m, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); g.add(me); return me; };
const rnd = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const sideways = (geo) => geo.rotateZ(Math.PI / 2); // cylinder axis → x

function rod(g, a, b, r, m) {
  const d = new THREE.Vector3().subVectors(b, a), me = new THREE.Mesh(Cy(r, r, d.length(), 8), m);
  me.position.copy(a).addScaledVector(d, 0.5);
  me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(me); return me;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function channel(len = 1.2, w = 0.3) {
  const g = new THREE.Group(), m = mat(K.kraftL, { r: 0.9 });
  add(g, B(len, 0.03, w), m, len / 2, 0, 0);
  add(g, B(len, 0.11, 0.03), m, len / 2, 0.07, w / 2); add(g, B(len, 0.11, 0.03), m, len / 2, 0.07, -w / 2);
  return g;
}
function gearGeo(teeth, r, th = 0.09) {
  const s = new THREE.Shape(), step = Math.PI * 2 / teeth, root = r * 0.82;
  for (let i = 0; i < teeth; i++) {
    [[0, root], [.12, r], [.48, r], [.6, root]].forEach(([f, rad], k) => {
      const a = (i + f) * step, x = Math.cos(a) * rad, y = Math.sin(a) * rad;
      i === 0 && k === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
    });
  }
  s.closePath(); const h = new THREE.Path(); h.absarc(0, 0, r * 0.2, 0, Math.PI * 2, true); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1 });
  g.translate(0, 0, -th / 2); g.rotateX(-Math.PI / 2); return g;
}
function ringGeo(ro, ri, h) {
  const s = new THREE.Shape(); s.absarc(0, 0, ro, 0, Math.PI * 2, false);
  const p = new THREE.Path(); p.absarc(0, 0, ri, 0, Math.PI * 2, true); s.holes.push(p);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 24 }); g.rotateX(-Math.PI / 2); return g;
}
function syringe(color) {
  const g = new THREE.Group(), clear = mat(0xbfe6ff, { a: 0.35, r: 0.1 });
  add(g, sideways(Cy(0.075, 0.075, 0.8)), clear);
  add(g, sideways(Cy(0.06, 0.06, 0.45)), mat(color, { a: 0.9, r: 0.2 }), -0.15);
  add(g, sideways(Cy(0.03, 0.03, 0.85)), mat(K.white), 0.225);
  add(g, sideways(Cy(0.07, 0.07, 0.07)), mat(K.black), -0.25);
  add(g, sideways(Cy(0.1, 0.1, 0.03)), mat(K.white), 0.66);
  add(g, B(0.03, 0.26, 0.07), mat(K.white), 0.4);
  add(g, sideways(Cy(0.03, 0.055, 0.14)), clear, -0.47);
  g.children.forEach((c) => (c.position.y += 0.12)); return g;
}
function bottleCap(color) {
  const g = new THREE.Group(), m = mat(color, { r: 0.4, m: 0.3 });
  add(g, Cy(0.18, 0.19, 0.08, 24, true), Object.assign(m, { side: THREE.DoubleSide }), 0, 0.04);
  add(g, Cy(0.18, 0.18, 0.012), m, 0, 0.08); add(g, new THREE.TorusGeometry(0.18, 0.012, 8, 24).rotateX(Math.PI / 2), m, 0, 0.078);
  return g;
}
function cupShell(color, h = 0.4) {
  const g = new THREE.Group(), m = mat(color, { r: 0.7, d: true });
  add(g, Cy(0.3, 0.22, h, 40, true), m, 0, h / 2); add(g, Cy(0.22, 0.22, 0.02, 40), m, 0, 0.01);
  add(g, new THREE.TorusGeometry(0.3, 0.015, 8, 40).rotateX(Math.PI / 2), m, 0, h); return g;
}

export const P = {
  ramp(n = 3) {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) { const c = channel(1.2); c.position.set(-0.6, 0, (i - (n - 1) / 2) * 0.42); c.rotation.z = -0.08; g.add(c); }
    return g;
  },
  yfork() {
    const g = new THREE.Group(), s = channel(0.8, 0.28); s.position.x = -0.8; g.add(s);
    [1, -1].forEach((d) => { const b = channel(0.8, 0.28); b.rotation.y = d * 0.45; g.add(b); }); return g;
  },
  ball() {
    const g = new THREE.Group();
    add(g, Sp(0.22), new THREE.MeshPhysicalMaterial({ color: 0x7dd3fc, roughness: 0.05, transparent: true, opacity: 0.5, clearcoat: 1 }), 0, 0.22);
    add(g, Sp(0.12), mat(0xff5ea8, { r: 0.3, e: 0x330018 }), 0, 0.22); return g;
  },
  cup(label, color) {
    const g = cupShell(color), pl = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), new THREE.MeshBasicMaterial({ map: labelTex(label), transparent: true }));
    pl.position.set(0, 0.2, 0.268); pl.rotation.x = -0.2; g.add(pl); return g;
  },
  paperCup() { return cupShell(0xf5f5f5, 0.4); },
  stick() {
    const g = new THREE.Group(), m = mat(K.wood, { r: 0.8 });
    add(g, B(1.3, 0.03, 0.16), m, 0, 0.015); [-1, 1].forEach((d) => add(g, Cy(0.08, 0.08, 0.03, 20), m, d * 0.65, 0.015)); return g;
  },
  fulcrum() { const g = new THREE.Group(); add(g, Cy(0.16, 0.16, 0.4, 3).rotateX(-Math.PI / 2), mat(K.kraft, { r: 0.9 }), 0, 0.08); return g; },
  tape(color = K.tape) {
    const g = new THREE.Group(), t = add(g, new THREE.TorusGeometry(0.26, 0.1, 16, 40).rotateX(Math.PI / 2), mat(color, { r: 0.5 }), 0, 0.1);
    t.scale.y = 0.85; add(g, Cy(0.17, 0.17, 0.2, 32, true), mat(K.kraft, { d: true }), 0, 0.1); return g;
  },
  blocks() {
    const g = new THREE.Group(), m = mat(K.wood, { r: 0.75 });
    [[-0.2, 0.16, 0], [0.2, 0.16, 0], [0, 0.48, 0], [0.65, 0.16, 0.12]].forEach(([x, y, z], i) => { const b = add(g, B(0.32, 0.32, 0.32), m, x, y, z); if (i === 3) b.rotation.y = 0.4; });
    return g;
  },
  chassis() {
    const g = new THREE.Group(); add(g, B(1.5, 0.05, 0.65), mat(K.kraft, { r: 0.9 }), 0, 0.025);
    [-0.5, 0.5].forEach((x) => add(g, B(0.28, 0.056, 0.09), mat(0x2a2016), x, 0.026)); return g;
  },
  caps(n = 4) {
    const g = new THREE.Group(), cols = [0xef4444, 0x3b82f6, 0xfacc15, 0x22c55e];
    for (let i = 0; i < n; i++) { const c = bottleCap(cols[i % 4]); c.position.set((i % 2) * 0.44, 0, Math.floor(i / 2) * 0.44); g.add(c); } return g;
  },
  skewers() {
    const g = new THREE.Group(), m = mat(0xe8d3a2, { r: 0.8 });
    [-0.07, 0.07].forEach((z) => { add(g, sideways(Cy(0.014, 0.014, 1.2, 8)), m, 0, 0.014, z); add(g, sideways(Cy(0.001, 0.014, 0.1, 8)), m, -0.65, 0.014, z); }); return g;
  },
  straw(n = 1, r = 0.035, color = 0xffffff) {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) add(g, sideways(Cy(r, r, 0.75, 16, true)), mat(color, { r: 0.4, d: true }), 0, r, (i - (n - 1) / 2) * 0.14); return g;
  },
  balloon(size = 0.4, color = 0xff5ea8) {
    const g = new THREE.Group(), m = mat(color, { r: 0.25 }), b = add(g, Sp(size), m, 0, size * 1.2); b.scale.y = 1.2;
    add(g, Cy(0.03, 0.06, 0.1), m, 0, 0.02); add(g, new THREE.TorusGeometry(0.045, 0.014, 8, 16).rotateX(Math.PI / 2), m, 0, 0.0); return g;
  },
  lane() {
    const g = new THREE.Group(); add(g, B(1.7, 0.02, 0.18), mat(0xf5c542), 0, 0.01);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.18), new THREE.MeshStandardMaterial({ map: tickTex(), roughness: 0.6 }));
    pl.rotation.x = -Math.PI / 2; pl.position.y = 0.022; g.add(pl); return g;
  },
  syringes(n = 6, color = 0x38bdf8) {
    const g = new THREE.Group(), k = Math.min(n, 6);
    for (let i = 0; i < k; i++) { const s = syringe(color); s.position.z = (i - (k - 1) / 2) * 0.22; s.rotation.y = (i - (k - 1) / 2) * 0.05; g.add(s); } return g;
  },
  tubing() {
    const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 4.5, r = 0.6 - t * 0.28; pts.push(V(Math.cos(a) * r, 0.04 + t * 0.09, Math.sin(a) * r)); }
    const g = new THREE.Group(); add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.035, 10), mat(0x7dd3fc, { a: 0.75, r: 0.2 })); return g;
  },
  sticks(n = 10) {
    const g = new THREE.Group(), r = rnd(7), m = mat(K.wood, { r: 0.8 });
    for (let i = 0; i < n; i++) { const s = add(g, B(1.1, 0.028, 0.12), m, (r() - .5) * .06, 0.014 + i * 0.03, (r() - .5) * .06); s.rotation.y = (r() - .5) * .6; } return g;
  },
  fasteners() {
    const g = new THREE.Group(), m = mat(K.brass, { m: 0.9, r: 0.3 });
    [[-0.2, 0], [0.15, -0.1], [0.05, 0.18], [-0.05, -0.2]].forEach(([x, z], i) => {
      const f = new THREE.Group(); add(f, Cy(0.07, 0.07, 0.012), m, 0, 0.006);
      [-1, 1].forEach((d) => { const p = add(f, B(0.2, 0.008, 0.03), m, d * 0.03, 0.004); p.rotation.y = d * 0.35; });
      f.position.set(x, 0, z); f.rotation.y = i; g.add(f);
    }); return g;
  },
  turntable() {
    const g = new THREE.Group(); add(g, Cy(0.2, 0.2, 0.08), mat(0xef4444, { r: 0.4 }), 0, 0.04);
    add(g, Cy(0.55, 0.55, 0.04, 48), mat(K.kraft, { r: 0.9 }), 0, 0.1);
    const t = mat(0x3b2a18); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, m = add(g, B(0.03, 0.006, 0.07), t, Math.cos(a) * 0.47, 0.123, Math.sin(a) * 0.47); m.rotation.y = -a; } return g;
  },
  board(w = 1.6, d = 1.1) {
    const g = new THREE.Group(); add(g, B(w, 0.06, d), mat(K.kraft, { r: 0.9 }), 0, 0.03);
    add(g, B(w * 0.9, 0.062, 0.02), mat(0x8a6a3f), 0, 0.03, 0); return g;
  },
  baseplate() {
    const g = P.board(1.5, 0.9), m = mat(0x2a2016);
    [[-0.5, -0.15], [-0.15, 0.1], [0.2, -0.15], [0.5, 0.15], [0.5, -0.25]].forEach(([x, z]) => add(g, Cy(0.05, 0.05, 0.064), m, x, 0.03, z)); return g;
  },
  spool(color = 0xf3f4f6) {
    const g = new THREE.Group(), w = mat(K.wood, { r: 0.7 });
    add(g, Cy(0.1, 0.1, 0.34), w, 0, 0.17); [0.02, 0.32].forEach((y) => add(g, Cy(0.2, 0.2, 0.03), w, 0, y));
    add(g, Cy(0.16, 0.16, 0.26), mat(color, { r: 1 }), 0, 0.17); return g;
  },
  basket() {
    const g = cupShell(K.kraft, 0.26), m = mat(0xf3f4f6, { r: 1 }), top = V(0, 0.8, 0);
    [0, 2.1, 4.2].forEach((a) => rod(g, V(Math.cos(a) * 0.3, 0.26, Math.sin(a) * 0.3), top, 0.008, m));
    add(g, new THREE.TorusGeometry(0.04, 0.01, 8, 16), m, 0, 0.82); return g;
  },
  tower() {
    const g = new THREE.Group(), m = mat(K.kraft, { r: 0.9 });
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([x, z]) => add(g, B(0.04, 1.2, 0.04), m, x * 0.17, 0.6, z * 0.17));
    [0.3, 0.7, 1.15].forEach((y) => { add(g, B(0.38, 0.03, 0.03), m, 0, y, 0.17); add(g, B(0.38, 0.03, 0.03), m, 0, y, -0.17); add(g, B(0.03, 0.03, 0.38), m, 0.17, y, 0); add(g, B(0.03, 0.03, 0.38), m, -0.17, y, 0); });
    add(g, Cy(0.08, 0.08, 0.05, 24).rotateX(Math.PI / 2), mat(K.steel, { m: 0.8, r: 0.3 }), 0, 1.12); return g;
  },
  crank() {
    const g = new THREE.Group(), s = mat(K.steel, { m: 0.85, r: 0.3 });
    add(g, Cy(0.03, 0.03, 0.55, 16), s, 0, 0.275); add(g, B(0.42, 0.05, 0.07), s, 0.2, 0.53);
    add(g, Cy(0.055, 0.055, 0.3, 20), mat(K.red, { r: 0.4 }), 0.4, 0.4); return g;
  },
  gears(list) {
    const g = new THREE.Group(); let x = 0;
    list.forEach((t, i) => { const r = t * 0.022 + 0.05; x += r; add(g, gearGeo(t, r), mat(GEAR[(i + t) % 5], { r: 0.4, m: 0.1 }), x, 0.05); x += r + 0.02; });
    return g;
  },
  gearbox() {
    const g = new THREE.Group(); add(g, B(1.1, 0.05, 0.6), mat(0x2b3240, { r: 0.5, m: 0.4 }), 0, 0.025);
    add(g, gearGeo(20, 0.34), mat(GEAR[0], { r: 0.4 }), -0.27, 0.12); add(g, gearGeo(10, 0.17), mat(GEAR[1], { r: 0.4 }), 0.27, 0.12);
    [-0.27, 0.27].forEach((x) => add(g, Cy(0.03, 0.03, 0.25), mat(K.steel, { m: 0.9, r: 0.3 }), x, 0.12)); return g;
  },
  coins(washers = false) {
    const g = new THREE.Group(), c = mat(K.copper, { m: 0.8, r: 0.35 }), s = mat(K.steel, { m: 0.9, r: 0.3 });
    if (!washers) { for (let i = 0; i < 6; i++) add(g, Cy(0.1, 0.1, 0.02, 32), c, -0.1, 0.01 + i * 0.022); [[0.2, 0.1], [0.15, -0.14], [0.35, -0.02]].forEach(([x, z]) => add(g, Cy(0.1, 0.1, 0.02, 32), c, x, 0.01, z)); }
    else { for (let i = 0; i < 6; i++) add(g, ringGeo(0.11, 0.05, 0.02), s, -0.1, i * 0.022); [[0.2, 0.1], [0.15, -0.14], [0.35, -0.02]].forEach(([x, z]) => add(g, ringGeo(0.11, 0.05, 0.02), s, x, 0, z)); }
    return g;
  },
  glue() {
    const g = new THREE.Group(); add(g, Cy(0.14, 0.16, 0.45), mat(0xf8fafc, { r: 0.35 }), 0, 0.225);
    add(g, Cy(0.145, 0.145, 0.16), mat(0x2563eb, { r: 0.4 }), 0, 0.2); add(g, Cy(0.05, 0.14, 0.12), mat(0xf97316, { r: 0.4 }), 0, 0.51); add(g, Cy(0.02, 0.04, 0.1), mat(0xf97316), 0, 0.62); return g;
  },
  jig() {
    const g = new THREE.Group(), m = mat(K.kraft, { r: 0.9 }); add(g, B(1.7, 0.04, 0.9), m, 0, 0.02);
    [-0.6, 0.6].forEach((x) => add(g, B(0.5, 0.18, 0.9), mat(K.kraftL, { r: 0.9 }), x, 0.13));
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), new THREE.MeshBasicMaterial({ map: labelTex('GAP', { w: 300, h: 160 }), transparent: true }));
    l.rotation.x = -Math.PI / 2; l.position.y = 0.045; g.add(l); return g;
  },
  scale() {
    const g = new THREE.Group(), m = mat(0xe5e7eb, { r: 0.4 });
    add(g, Cy(0.07, 0.07, 0.8), m, 0, 0.5); add(g, B(0.02, 0.5, 0.005), mat(0x111827), 0, 0.55, 0.07);
    for (let i = 0; i < 8; i++) add(g, B(0.05, 0.008, 0.006), mat(0xf59e0b), 0.0, 0.34 + i * 0.062, 0.073);
    add(g, new THREE.TorusGeometry(0.05, 0.012, 8, 20), mat(K.steel, { m: 0.9 }), 0, 0.95);
    add(g, new THREE.TorusGeometry(0.05, 0.012, 8, 16, Math.PI * 1.5), mat(K.steel, { m: 0.9 }), 0, 0.05).rotation.z = Math.PI * .75; return g;
  },
  zonemat() {
    const g = new THREE.Group(); add(g, B(1.7, 0.03, 1.06), mat(0x1a2130), 0, 0.015);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.06), new THREE.MeshStandardMaterial({ map: zoneTex('#ffb020'), roughness: 0.7 }));
    pl.rotation.x = -Math.PI / 2; pl.position.y = 0.032; g.add(pl); return g;
  },
  object() {
    const g = new THREE.Group(); add(g, B(0.3, 0.3, 0.3), mat(0xf97316, { r: 0.4 }), 0, 0.15); add(g, B(0.16, 0.16, 0.16), mat(0xfacc15, { r: 0.4 }), 0.0, 0.38); return g;
  },
  motor() {
    const g = new THREE.Group(), s = mat(K.steel, { m: 0.9, r: 0.3 });
    add(g, sideways(Cy(0.22, 0.22, 0.55)), s, 0, 0.22); add(g, sideways(Cy(0.225, 0.225, 0.08)), mat(0x1f2937, { r: 0.5 }), -0.3, 0.22);
    add(g, sideways(Cy(0.03, 0.03, 0.3, 16)), mat(0xe5e7eb, { m: 1, r: 0.2 }), 0.42, 0.22);
    [-0.06, 0.06].forEach((z) => add(g, B(0.1, 0.02, 0.03), mat(K.brass, { m: 0.9 }), -0.38, 0.22, z)); return g;
  },
  prop(blades = 3, size = 0.6, color = 0xf3f4f6, pitch = 0.35) {
    const g = new THREE.Group(), m = mat(color, { r: 0.35 }); add(g, Cy(0.09, 0.09, 0.14), mat(0x1f2937, { r: 0.4 }), 0, 0.07);
    for (let i = 0; i < blades; i++) {
      const arm = new THREE.Group(), b = add(arm, B(size, 0.018, size * 0.24), m, size / 2 + 0.07, 0.07); b.rotation.x = pitch;
      arm.rotation.y = i * Math.PI * 2 / blades; g.add(arm);
    } return g;
  },
  diode() {
    const g = new THREE.Group(); add(g, sideways(Cy(0.05, 0.05, 0.16, 16)), mat(K.black, { r: 0.4 }), 0, 0.05);
    add(g, sideways(Cy(0.052, 0.052, 0.025, 16)), mat(0xd1d5db, { m: 0.9, r: 0.3 }), 0.055, 0.05);
    add(g, sideways(Cy(0.008, 0.008, 0.36, 8)), mat(0xd1d5db, { m: 1, r: 0.25 }), 0, 0.05); return g;
  },
  capacitor() {
    const g = new THREE.Group(); add(g, Cy(0.1, 0.1, 0.24), mat(0x1e3a8a, { r: 0.4, m: 0.2 }), 0, 0.12);
    add(g, new THREE.CylinderGeometry(0.102, 0.102, 0.24, 20, 1, false, 0, 1.4), mat(0xd1d5db, { r: 0.3, m: 0.6 }), 0, 0.12);
    add(g, Cy(0.1, 0.1, 0.01), mat(0x0f172a), 0, 0.245); [-0.04, 0.04].forEach((x) => add(g, Cy(0.008, 0.008, 0.3, 8), mat(0xd1d5db, { m: 1, r: 0.25 }), x, -0.05)); return g;
  },
  led() {
    const g = new THREE.Group(), m = mat(0xff3b3b, { a: 0.8, r: 0.15, e: 0x661111 });
    add(g, Cy(0.06, 0.06, 0.12), m, 0, 0.06 + 0.02); add(g, new THREE.SphereGeometry(0.06, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, 0.14);
    add(g, Cy(0.075, 0.075, 0.015), m, 0, 0.02); [-0.025, 0.025].forEach((x) => add(g, Cy(0.006, 0.006, 0.3, 8), mat(0xd1d5db, { m: 1, r: 0.25 }), x, -0.13)); return g;
  },
  clips() {
    const g = new THREE.Group();
    [[0xe5484d, -0.14], [0x111827, 0.14]].forEach(([c, z]) => {
      const m = mat(c, { r: 0.5 });
      add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.6, 0.03, z), V(-0.2, 0.05, z + 0.08), V(0.2, 0.05, z - 0.08), V(0.6, 0.03, z)]), 40, 0.014, 8), m);
      [-1, 1].forEach((d) => { add(g, B(0.16, 0.06, 0.05), m, d * 0.68, 0.04, z); add(g, B(0.1, 0.02, 0.04), mat(K.steel, { m: 0.9, r: 0.3 }), d * 0.8, 0.035, z); });
    }); return g;
  },
  stand() {
    const g = new THREE.Group(), m = mat(K.wood, { r: 0.8 }); add(g, B(1.2, 0.06, 0.8), m, 0, 0.03);
    add(g, B(0.06, 0.8, 0.6), m, -0.3, 0.46); add(g, B(0.4, 0.05, 0.3), m, -0.1, 0.09); return g;
  },
};
