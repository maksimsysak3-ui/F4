import { rgb } from '../street/kit.js?v=b8df018';

/** A covered section of track from s0 to s1: side walls on the barriers, a roof slab, lamps down the middle. */
export function buildTunnel(L, kit, s0, s1) {
  const c0 = L.poseAt(s0, 0), mb = kit.builderAt(c0.x, c0.z); // merged with the scene's other chunks
  const step = 4;
  const pt = (s, side, extra, y) => {
    const i = Math.floor(s / L.ds) % L.N, sg = side === 'L' ? 1 : -1;
    const lat = kit.barrierBack(side, i) + extra;
    const p = L.poseAt(s, sg * lat);
    return [p.x, L.yAt(s / L.ds, sg * Math.min(lat, L.halfW)) + y, p.z];
  };
  const H = 7.2;
  for (let s = s0; s < s1; s += step) {
    const t = Math.min(s1, s + step);
    for (const side of ['L', 'R']) {
      mb.color = rgb(0xb8b4ac);
      const a0 = pt(s, side, 0.15, -0.5), a1 = pt(t, side, 0.15, -0.5), b0 = pt(s, side, 0.75, -0.5), b1 = pt(t, side, 0.75, -0.5);
      mb.hexa('concrete', [a0, a1, b1, b0], [[a0[0], a0[1] + H, a0[2]], [a1[0], a1[1] + H, a1[2]], [b1[0], b1[1] + H, b1[2]], [b0[0], b0[1] + H, b0[2]]]);
    }
    // Roof slab spanning the road, dark underneath, with a row of lamps along the centre.
    const l0 = pt(s, 'L', 0.75, H), l1 = pt(t, 'L', 0.75, H), r0 = pt(s, 'R', 0.75, H), r1 = pt(t, 'R', 0.75, H);
    mb.color = rgb(0x5a5c60);
    mb.hexa('concrete', [l0, l1, r1, r0], [l0, l1, r1, r0].map(([x, y, z]) => [x, y + 1.4, z]));
    if (Math.floor(s / step) % 3 === 0) {
      const c = L.poseAt(s, 0), yc = L.yAt(s / L.ds, 0) + H - 0.05;
      mb.color = [3.2, 3.0, 2.6];
      mb.hexa('neon', [[c.x - 0.4, yc - 0.1, c.z - 0.4], [c.x + 0.4, yc - 0.1, c.z - 0.4], [c.x + 0.4, yc - 0.1, c.z + 0.4], [c.x - 0.4, yc - 0.1, c.z + 0.4]],
        [[c.x - 0.4, yc, c.z - 0.4], [c.x + 0.4, yc, c.z - 0.4], [c.x + 0.4, yc, c.z + 0.4], [c.x - 0.4, yc, c.z + 0.4]]);
    }
  }
  return mb;
}
