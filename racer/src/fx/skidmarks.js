import { BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, Vector3, DoubleSide, DynamicDrawUsage } from 'three';

const MAX_SEGMENTS = 6000;
const MIN_STEP = 0.25; // metres between segments
const _l = new Vector3();
const _r = new Vector3();

/** Rubber laid down by sliding tires: a ring buffer of quads in one draw call. */
export class Skidmarks {
  constructor(scene, wheelCount) {
    this.pos = new Float32Array(MAX_SEGMENTS * 6 * 3);
    this.col = new Float32Array(MAX_SEGMENTS * 6 * 4);
    this.geo = new BufferGeometry();
    this.posAttr = new Float32BufferAttribute(this.pos, 3);
    this.colAttr = new Float32BufferAttribute(this.col, 4);
    this.posAttr.setUsage(DynamicDrawUsage);
    this.colAttr.setUsage(DynamicDrawUsage);
    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('color', this.colAttr);
    this.normals = new Float32Array(MAX_SEGMENTS * 6 * 3);
    for (let i = 1; i < this.normals.length; i += 3) this.normals[i] = 1;
    this.geo.setAttribute('normal', new Float32BufferAttribute(this.normals, 3));
    this.geo.setDrawRange(0, 0);
    // Glossier than the asphalt, so marks catch the light even on a near-black track.
    const mat = new MeshStandardMaterial({
      color: 0x050506, roughness: 0.38, metalness: 0, envMapIntensity: 1.6,
      vertexColors: true, transparent: true, depthWrite: false, side: DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
    this.mesh = new Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
    this.next = 0;
    this.count = 0;
    this.trails = Array.from({ length: wheelCount }, () => ({ active: false, p: new Vector3(), l: new Vector3(), r: new Vector3(), a: 0 }));
    this.dirty = false;
  }

  /** Feed one wheel's contact each frame. intensity 0..1 (0 ends the trail). */
  add(i, point, lateral, width, intensity, height) {
    const t = this.trails[i];
    if (intensity <= 0.02) { t.active = false; return; }
    const y = height + 0.012;
    const l = _l.copy(point).addScaledVector(lateral, width / 2).setY(y);
    const r = _r.copy(point).addScaledVector(lateral, -width / 2).setY(y);
    if (!t.active) {
      t.active = true;
      t.p.copy(point); t.l.copy(l); t.r.copy(r); t.a = intensity;
      return;
    }
    if (t.p.distanceToSquared(point) < MIN_STEP * MIN_STEP) return;
    if (t.p.distanceToSquared(point) > 9) { t.p.copy(point); t.l.copy(l); t.r.copy(r); return; }
    this.writeQuad(t.l, t.r, r, l, t.a, intensity);
    t.p.copy(point); t.l.copy(l); t.r.copy(r); t.a = intensity;
  }

  writeQuad(a, b, c, d, alphaA, alphaB) {
    const k = this.next;
    const verts = [a, b, c, a, c, d];
    const alphas = [alphaA, alphaA, alphaB, alphaA, alphaB, alphaB];
    for (let v = 0; v < 6; v++) {
      const pi = (k * 6 + v) * 3;
      this.pos[pi] = verts[v].x; this.pos[pi + 1] = verts[v].y; this.pos[pi + 2] = verts[v].z;
      const ci = (k * 6 + v) * 4;
      this.col[ci] = 1; this.col[ci + 1] = 1; this.col[ci + 2] = 1; this.col[ci + 3] = 0.9 * alphas[v];
    }
    this.next = (k + 1) % MAX_SEGMENTS;
    this.count = Math.min(this.count + 1, MAX_SEGMENTS);
    this.dirty = true;
  }

  flush() {
    if (!this.dirty) return;
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.geo.setDrawRange(0, this.count * 6);
    this.dirty = false;
  }

  clear() {
    this.count = 0;
    this.next = 0;
    for (const t of this.trails) t.active = false;
    this.geo.setDrawRange(0, 0);
  }
}
