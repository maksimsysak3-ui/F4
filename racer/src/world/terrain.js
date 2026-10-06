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
    S.push([L.x[i], L.z[i], L.elev[i], Math.max(L.wall.L[i], L.wall.R[i]), i]);
  }
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of S) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  minX -= margin; maxX += margin; minZ -= margin; maxZ += margin;
  const nx = Math.ceil((maxX - minX) / cell) + 1, nz = Math.ceil((maxZ - minZ) / cell) + 1;
  const H = new Float32Array(nx * nz), D = new Float32Array(nx * nz);
  const reach = cell * 1.45; // a vertex this far outside a wall can still share a triangle (its diagonal) with the corridor
  const smoothstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  for (let j = 0; j < nz; j++) {
    const z = minZ + j * cell;
    for (let i = 0; i < nx; i++) {
      const x = minX + i * cell;
      // Two blends of the track's height profile: a sharp one (power 4) that interpolates smoothly
      // between neighbouring parts of the lap without a cliff where the nearest part changes, and a
      // wide one (power 2) the landscape relaxes into far from the track.
      let best = Infinity, wall = 10, w4sum = 0, h4sum = 0, wsum = 0, hsum = 0;
      const close = [];
      for (let k = 0; k < S.length; k++) {
        const [sx, sz, sh, sw] = S[k];
        const d2 = (x - sx) ** 2 + (z - sz) ** 2;
        if (d2 < best) { best = d2; wall = sw; }
        if (d2 < (sw + reach + 5) ** 2) close.push(k);
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
      // Never above any part of the track corridor: every vertex of a cell that reaches inside a wall
      // stays under that road's edge, so neither a hillside nor a higher section of the lap next door
      // can poke up through run-offs and escape roads. (Retaining walls cover the drop; see walls().)
      for (const k of close) {
        // Closest point on the centreline segment to the next coarse sample (radial past its ends,
        // so the outside of a tight corner is covered too).
        const [ax, az, , , ai] = S[k], [bx, bz, , , bi] = S[(k + 1) % S.length];
        const ux = bx - ax, uz = bz - az, len2 = ux * ux + uz * uz || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * ux + (z - az) * uz) / len2));
        const px = x - (ax + ux * t), pz = z - (az + uz * t), off = Math.hypot(px, pz);
        const left = px * L.nx[ai] + pz * L.nz[ai] > 0;
        const sw = left ? Math.min(L.wall.L[ai], L.wall.L[bi]) : Math.min(L.wall.R[ai], L.wall.R[bi]);
        if (off > Math.max(left ? L.wall.L[ai] : L.wall.R[ai], left ? L.wall.L[bi] : L.wall.R[bi]) + reach) continue;
        const f = ai + t * (((bi - ai) % L.N + L.N) % L.N);
        // (A little lower on banking, where the surface's twist runs between the grid's straight edges.)
        h = Math.min(h, L.yAt(f, (left ? 1 : -1) * Math.min(sw, off)) - 0.1 - Math.abs(L.bank[ai]) * cell * 0.3);
      }
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

  /** Exact height of the drawn mesh (its triangles, including the sink next to the track). */
  const vy = (i, j) => H[j * nx + i] - sinkNear * (1 - smoothstep(30, 60, D[j * nx + i])) - 0.04;
  const meshAt = (x, z) => {
    const fx = (x - minX) / cell, fz = (z - minZ) / cell;
    const i = Math.max(0, Math.min(nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(nz - 2, Math.floor(fz)));
    const u = fx - i, v = fz - j;
    // Triangles (a, c, b) and (b, c, e) as in mesh(): a=(i,j) b=(i+1,j) c=(i,j+1) e=(i+1,j+1).
    if (u + v <= 1) return vy(i, j) + (vy(i + 1, j) - vy(i, j)) * u + (vy(i, j + 1) - vy(i, j)) * v;
    return vy(i + 1, j + 1) + (vy(i, j + 1) - vy(i + 1, j + 1)) * (1 - u) + (vy(i + 1, j) - vy(i + 1, j + 1)) * (1 - v);
  };

  /**
   * Ground out to the horizon: a strip from the terrain's own boundary (matching its edge
   * heights exactly, so there's no seam) sloping out to a far ring at the edges' mean height.
   * It never passes through the playable area, unlike a flat plane under a hilly map.
   */
  const skirt = (material, reach = 9000) => {
    const ring = [];
    for (let i = 0; i < nx - 1; i++) ring.push([i, 0]);
    for (let j = 0; j < nz - 1; j++) ring.push([nx - 1, j]);
    for (let i = nx - 1; i > 0; i--) ring.push([i, nz - 1]);
    for (let j = nz - 1; j > 0; j--) ring.push([0, j]);
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    let mean = 0;
    for (const [i, j] of ring) mean += vy(i, j);
    mean = mean / ring.length - 2;
    const pos = [];
    const pt = (k) => {
      const [i, j] = ring[k % ring.length], x = minX + i * cell, z = minZ + j * cell;
      const dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz) || 1;
      return [[x, vy(i, j) - 0.02, z], [cx + (dx / l) * reach, mean, cz + (dz / l) * reach]];
    };
    for (let k = 0; k < ring.length; k++) {
      const [a, A] = pt(k), [b, B] = pt(k + 1);
      pos.push(...a, ...A, ...b, ...b, ...A, ...B);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    // Faces must point up: flip the winding if this ring runs the other way round.
    const n = geo.attributes.normal;
    if (n.getY(0) < 0) { for (let k = 0; k < pos.length; k += 9) { for (let c = 0; c < 3; c++) { const t = pos[k + 3 + c]; pos[k + 3 + c] = pos[k + 6 + c]; pos[k + 6 + c] = t; } } geo.setAttribute('position', new Float32BufferAttribute(pos, 3)); geo.computeVertexNormals(); }
    const m = new Mesh(geo, material);
    m.receiveShadow = false;
    return m;
  };

  return { heightAt, distAt, distSmooth, meshY, meshAt, mesh, skirt, bounds: { minX, maxX, minZ, maxZ }, grid: { D, nx, nz, minX, minZ, cell } };
}
