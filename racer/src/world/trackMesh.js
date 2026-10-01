import {
  BufferGeometry, Float32BufferAttribute, Mesh, Group, MeshStandardMaterial, MeshBasicMaterial,
  CanvasTexture, RepeatWrapping, SRGBColorSpace, AdditiveBlending, DoubleSide, Color,
} from 'three';
import { TRACK } from '../config.js';
import { R_IN, R_OUT, kerbProfile, kerbBlocks } from './trackShape.js';

const TAU = Math.PI * 2;

/** Procedural asphalt: dark base, aggregate speckle, faint tar seams. */
function asphaltTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#1d1d21';
  g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = Math.random();
    const v = n > 0.992 ? 56 : n > 0.93 ? 37 : 26 + Math.random() * 6;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 2] += 2;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(10,10,12,0.35)';
  g.lineWidth = 1.5;
  for (let k = 0; k < 2; k++) {
    g.beginPath();
    let x = Math.random() * size;
    g.moveTo(x, 0);
    for (let y = 0; y <= size; y += 32) { x += (Math.random() - 0.5) * 24; g.lineTo(x, y); }
    g.stroke();
  }
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Ring strip between two radii at height(r) -> y. UV u runs along the lap in metres / uvScale.
 * flip: wind the faces downwards (for the underside).
 */
function ringStrip(r0, r1, segments, heightFn, { uvScale = 8, flip = false, acrossSteps = 1 } = {}) {
  const pos = [];
  const uv = [];
  const rc = (r0 + r1) / 2;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * TAU;
    const a1 = ((i + 1) / segments) * TAU;
    for (let j = 0; j < acrossSteps; j++) {
      const ra = r0 + ((r1 - r0) * j) / acrossSteps;
      const rb = r0 + ((r1 - r0) * (j + 1)) / acrossSteps;
      const P = (a, r) => [Math.cos(a) * r, heightFn(r, a), Math.sin(a) * r];
      const U = (a, r) => [(a * rc) / uvScale, (r - r0) / uvScale];
      const quad = [[a0, ra], [a0, rb], [a1, rb], [a1, ra]];
      const order = flip ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
      for (const k of order) {
        pos.push(...P(...quad[k]));
        uv.push(...U(...quad[k]));
      }
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

/** Vertical wall around the ring at radius r between y0 and y1 (outward = facing away from centre). */
function ringWall(r, y0, y1, segments, outward) {
  const pos = [];
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * TAU;
    const a1 = ((i + 1) / segments) * TAU;
    const p = (a, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
    const q = [p(a0, y0), p(a1, y0), p(a1, y1), p(a0, y1)];
    const order = outward ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
    for (const k of order) pos.push(...q[k]);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Red/white kerb blocks whose shape matches the physics height profile exactly. */
function kerbGeometry(rEdge, rOuter) {
  const radius = (rEdge + rOuter) / 2;
  const blocks = kerbBlocks(radius);
  const pos = [];
  const col = [];
  const red = new Color(0xc8102e);
  const white = new Color(0xf2f2f2);
  const us = [0, 0.35, 1];
  for (let b = 0; b < blocks; b++) {
    const c = b % 2 ? red : white;
    // Two sub-segments per block: rise to the ridge and fall back.
    for (const [t0, t1] of [[0, 0.5], [0.5, 1]]) {
      const a0 = ((b + t0) / blocks) * TAU;
      const a1 = ((b + t1) / blocks) * TAU;
      for (let j = 0; j < us.length - 1; j++) {
        const P = (a, t, u) => {
          const r = rEdge + (rOuter - rEdge) * u;
          return [Math.cos(a) * r, kerbProfile(u, t) + 0.001, Math.sin(a) * r];
        };
        const quad = [P(a0, t0, us[j]), P(a0, t0, us[j + 1]), P(a1, t1, us[j + 1]), P(a1, t1, us[j])];
        // Wind so the face points up regardless of which side of the track the kerb is on.
        const outward = rOuter > rEdge;
        const order = outward ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
        for (const k of order) { pos.push(...quad[k]); col.push(c.r, c.g, c.b); }
      }
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Checkered start/finish band across the track at theta = 0. */
function startLine() {
  const pos = [];
  const col = [];
  const rows = 2;
  const cols = 22;
  const depth = 0.7; // metres per row along the track
  const dark = new Color(0x0d0d0f);
  const light = new Color(0xeeeeee);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const r0 = R_IN + TRACK.kerbWidth + ((R_OUT - R_IN - 2 * TRACK.kerbWidth) * j) / cols;
      const r1 = R_IN + TRACK.kerbWidth + ((R_OUT - R_IN - 2 * TRACK.kerbWidth) * (j + 1)) / cols;
      const z0 = (i - rows / 2) * depth;
      const z1 = z0 + depth;
      const c = (i + j) % 2 ? dark : light;
      const q = [[r0, 0.004, z0], [r1, 0.004, z0], [r1, 0.004, z1], [r0, 0.004, z1]];
      for (const k of [0, 2, 1, 0, 3, 2]) { pos.push(...q[k]); col.push(c.r, c.g, c.b); }
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Soft additive halo under the ring so it reads as floating in the void. */
function haloTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 8;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 8);
  return new CanvasTexture(c);
}

export function buildTrack() {
  const group = new Group();
  const seg = TRACK.segments;
  const kw = TRACK.kerbWidth;
  const th = TRACK.thickness;

  const asphalt = asphaltTexture();
  const asphaltMat = new MeshStandardMaterial({ map: asphalt, roughness: 0.93, metalness: 0.0, envMapIntensity: 0.25 });
  const top = new Mesh(ringStrip(R_IN + kw, R_OUT - kw, seg, () => 0, { acrossSteps: 4, uvScale: 9 }), asphaltMat);
  top.receiveShadow = true;
  group.add(top);

  const kerbMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, flatShading: true, envMapIntensity: 0.4 });
  for (const [a, b] of [[R_IN + kw, R_IN], [R_OUT - kw, R_OUT]]) {
    const k = new Mesh(kerbGeometry(a, b), kerbMat);
    k.receiveShadow = true;
    group.add(k);
  }

  // Painted white lines just inside each kerb.
  const lineMat = new MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const r of [R_IN + kw + 0.25, R_OUT - kw - 0.25]) {
    const line = new Mesh(ringStrip(r - 0.15, r + 0.15, seg, () => 0.002), lineMat);
    line.receiveShadow = true;
    group.add(line);
  }

  const startMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3 });
  const start = new Mesh(startLine(), startMat);
  start.receiveShadow = true;
  group.add(start);

  // The slab: dark walls and underside, with glowing seams.
  const slabMat = new MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.7, metalness: 0.3, side: DoubleSide });
  group.add(new Mesh(ringWall(R_OUT, -th, 0.0, seg, true), slabMat));
  group.add(new Mesh(ringWall(R_IN, -th, 0.0, seg, false), slabMat));
  group.add(new Mesh(ringStrip(R_IN, R_OUT, seg, () => -th, { flip: true }), slabMat));

  const glowMat = new MeshBasicMaterial({ color: new Color(0.9, 1.3, 3.0) });
  for (const [r, out] of [[R_OUT + 0.01, true], [R_IN - 0.01, false]]) {
    for (const y of [-0.25, -th + 0.12]) {
      group.add(new Mesh(ringWall(r, y - 0.05, y, seg, out), glowMat));
    }
  }

  const haloMat = new MeshBasicMaterial({
    map: haloTexture(), color: new Color(0.12, 0.2, 0.45), transparent: true, blending: AdditiveBlending,
    depthWrite: false, side: DoubleSide,
  });
  const halo = new Mesh(ringStrip(R_IN - 40, R_OUT + 40, 180, () => -th - 6), haloMat);
  // Remap UVs so the gradient runs across the ring.
  const uv = halo.geometry.attributes.uv;
  const p = halo.geometry.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const r = Math.hypot(p.getX(i), p.getZ(i));
    uv.setXY(i, (r - (R_IN - 40)) / (R_OUT - R_IN + 80), 0.5);
  }
  group.add(halo);

  return group;
}
