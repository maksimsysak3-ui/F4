import { PointLight, Group } from 'three';

/**
 * Floodlit night racing: a handful of real point lights that ride along with the camera, snapped to
 * the nearest floodlight positions along the circuit (alternating sides, high above the walls).
 * Near the car the road, kerbs, walls, stands and the car itself get bright pools with falloff in
 * between; everything further out stays dark and is carried by windows, neon and the lamps' glow.
 * A fixed light count, so the shaders compile once per track.
 */
export class NightLights {
  constructor(scene, L, { count = 8, spacing = 40, height = 18, intensity = 520, distance = 85, colour = 0xfff2e0 } = {}) {
    this.group = new Group();
    this.points = [];
    for (let s = 0, k = 0; s < L.length; s += spacing, k++) {
      const i = Math.floor(s / L.ds) % L.N, side = k % 2 ? 'R' : 'L', sg = side === 'L' ? 1 : -1;
      const p = L.poseAt(s, sg * (L.wall[side][i] + 2.5));
      this.points.push([p.x, L.yAt(i, 0) + height, p.z]);
    }
    this.lights = Array.from({ length: count }, () => {
      const l = new PointLight(colour, intensity, distance, 2);
      l.castShadow = false;
      this.group.add(l);
      return l;
    });
    this.order = this.points.map((_, k) => k);
    this.d2 = new Float32Array(this.points.length);
    scene.add(this.group);
  }

  update(at) {
    const { points, d2, order } = this;
    for (let k = 0; k < points.length; k++) { const p = points[k]; d2[k] = (p[0] - at.x) ** 2 + (p[2] - at.z) ** 2; }
    order.sort((a, b) => d2[a] - d2[b]);
    this.lights.forEach((l, k) => { const p = points[order[k]]; l.position.set(p[0], p[1], p[2]); });
  }

  dispose(scene) {
    scene.remove(this.group);
    for (const l of this.lights) l.dispose();
  }
}
