import { BufferGeometry, Float32BufferAttribute, Mesh } from 'three';

/**
 * Terrain around a circuit with elevation: a heightfield that matches the
 * track's own cross-section next to the road (so verges, run-offs and the
 * landscape meet the asphalt) and relaxes into a smooth, track-wide average
 * further out, plus a per-circuit `relief(x, z, d)` for dunes, hills or the
 * bowl a city circuit sits in (d = distance to the track).
 *
 * Returns { heightAt(x, z), mesh(material, colourAt) }. heightAt is the raw
 * surface (physics and object placement); the mesh sits a little lower next to
 * the track so circuit-drawn surfaces always cover it.
 */
export function createTerrain(L, { margin = 700, cell = 8, relief = null, sinkNear = 0.25 } = {}) {
  // Coarse centreline samples: position, height and how far the walls are.
  const S = [];
  for (let i = 0; i < L.N; i += 4) {
    S.push([L.x[i], L.z[i], L.elev[i], Math.max(L.wall.L[i], L.wall.R[i])]);
  }
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of S) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  minX -= margin; maxX += margin; minZ -= margin; maxZ += margin;
  const nx = Math.ceil((maxX - minX) / cell) + 1, nz = Math.ceil((maxZ - minZ) / cell) + 1;
  const H = new Float32Array(nx * nz), D = new Float32Array(nx * nz);
  const smoothstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  for (let j = 0; j < nz; j++) {
    const z = minZ + j * cell;
    for (let i = 0; i < nx; i++) {
      const x = minX + i * cell;
      // Two blends of the track's height profile: a sharp one (power 4) that interpolates smoothly
      // between neighbouring parts of the lap without a cliff where the nearest part changes, and a
      // wide one (power 2) the landscape relaxes into far from the track.
      let best = Infinity, wall = 10, w4sum = 0, h4sum = 0, wsum = 0, hsum = 0;
      for (const [sx, sz, sh, sw] of S) {
        const d2 = (x - sx) ** 2 + (z - sz) ** 2;
        if (d2 < best) { best = d2; wall = sw; }
        const w4 = 1 / (d2 + 400) ** 2;
        w4sum += w4; h4sum += w4 * sh;
        const w = 1 / (d2 + 2500);
        wsum += w; hsum += w * sh;
      }
      let d = Math.sqrt(best);
      let near = h4sum / w4sum;
      const n = d < wall + 50 ? L.nearest(x, z) : null;
      if (n) {
        // Next to the track: exactly the track's surface out past the walls (banking stops at the kerbs),
        // easing into the smooth blend beyond.
        d = Math.abs(n.lateral);
        const exact = L.yAt(n.i + n.t, n.lateral);
        near = exact + (near - exact) * smoothstep(wall + 6, wall + 45, d);
      }
      const far = hsum / wsum;
      let h = near + (far - near) * smoothstep(60, 320, d);
      if (relief) h += relief(x, z, d);
      H[j * nx + i] = h;
      D[j * nx + i] = d;
    }
  }

  const heightAt = (x, z) => {
    const fx = (x - minX) / cell, fz = (z - minZ) / cell;
    const i = Math.max(0, Math.min(nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(nz - 2, Math.floor(fz)));
    const u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fz - j));
    const a = H[j * nx + i], b = H[j * nx + i + 1], c = H[(j + 1) * nx + i], e = H[(j + 1) * nx + i + 1];
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + e * u) * v;
  };
  const distAt = (x, z) => {
    const i = Math.max(0, Math.min(nx - 1, Math.round((x - minX) / cell))), j = Math.max(0, Math.min(nz - 1, Math.round((z - minZ) / cell)));
    return D[j * nx + i];
  };

  /** Terrain mesh with vertex colours from colourAt(x, z, h, slope, d) -> [r, g, b]. */
  const mesh = (material, colourAt) => {
    const pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, x = minX + i * cell, z = minZ + j * cell;
      const d = D[k];
      const sink = sinkNear * (1 - smoothstep(30, 60, d)) + 0.04;
      pos.set([x, H[k] - sink, z], k * 3);
      const hx = H[j * nx + Math.min(nx - 1, i + 1)] - H[j * nx + Math.max(0, i - 1)];
      const hz = H[Math.min(nz - 1, j + 1) * nx + i] - H[Math.max(0, j - 1) * nx + i];
      const slope = Math.hypot(hx, hz) / (2 * cell);
      col.set(colourAt ? colourAt(x, z, H[k], slope, d) : [1, 1, 1], k * 3);
    }
    const idx = [];
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, e = c + 1;
      idx.push(a, c, b, b, c, e);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new Mesh(geo, material);
    m.receiveShadow = true;
    return m;
  };

  /** Distance to the track, bilinear on the grid (smooth enough to follow its gradient). */
  const distSmooth = (x, z) => {
    const fx = (x - minX) / cell, fz = (z - minZ) / cell;
    const i = Math.max(0, Math.min(nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(nz - 2, Math.floor(fz)));
    const u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fz - j));
    return (D[j * nx + i] * (1 - u) + D[j * nx + i + 1] * u) * (1 - v) + (D[(j + 1) * nx + i] * (1 - u) + D[(j + 1) * nx + i + 1] * u) * v;
  };
  /** Height of the drawn terrain mesh (which sits a little below heightAt next to the track). */
  const meshY = (x, z) => heightAt(x, z) - sinkNear * (1 - smoothstep(30, 60, distSmooth(x, z))) - 0.04;

  return { heightAt, distAt, distSmooth, meshY, mesh, bounds: { minX, maxX, minZ, maxZ }, grid: { D, nx, nz, minX, minZ, cell } };
}
