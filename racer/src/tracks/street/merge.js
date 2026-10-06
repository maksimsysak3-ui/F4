import { BufferGeometry, Float32BufferAttribute } from 'three';

/** Concatenate non-indexed geometries' positions and normals (tiny stand-in for BufferGeometryUtils). */
export function mergeGeometries(geos) {
  const pos = [];
  const nrm = [];
  for (const g of geos) {
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i++) pos.push(p[i]);
    const n = g.attributes.normal ? g.attributes.normal.array : new Float32Array(p.length);
    for (let i = 0; i < n.length; i++) nrm.push(n[i]);
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new Float32BufferAttribute(nrm, 3));
  return out;
}
