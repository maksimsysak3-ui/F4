import { MeshPhysicalMaterial, MeshStandardMaterial, MeshBasicMaterial, Color, AdditiveBlending, DoubleSide } from 'three';

/** Every material the car uses, keyed by the names the geometry builders emit. */
export function createCarMaterials(paintHex, overrides = {}) {
  // Body meshes carry explicit per-facet normals; primitives are pre-faceted with facet().
  const flat = {};
  const m = {
    paint: new MeshPhysicalMaterial({
      ...flat, color: paintHex, metalness: 0.3, roughness: 0.32,
      clearcoat: 1, clearcoatRoughness: 0.24, envMapIntensity: 1.35,
    }),
    black: new MeshStandardMaterial({ ...flat, color: 0x0c0c0e, roughness: 0.6, metalness: 0.2 }),
    carbon: new MeshPhysicalMaterial({
      ...flat, color: 0x18181b, roughness: 0.38, metalness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15,
    }),
    grille: new MeshStandardMaterial({ ...flat, color: 0x050506, roughness: 0.85, metalness: 0.1 }),
    glass: new MeshPhysicalMaterial({
      ...flat, color: 0x0b0f16, roughness: 0.09, metalness: 0.1, transparent: true, opacity: 0.8,
      envMapIntensity: 1.1, depthWrite: false,
    }),
    headlight: new MeshPhysicalMaterial({
      ...flat, color: 0x1a1d22, roughness: 0.05, metalness: 0.9, clearcoat: 1, envMapIntensity: 2.2,
    }),
    drl: new MeshStandardMaterial({ color: 0x000000, emissive: new Color(0xf2f6ff), emissiveIntensity: 6 }),
    tail: new MeshStandardMaterial({ color: 0x220000, emissive: new Color(0xff1020), emissiveIntensity: 3 }),
    reverse: new MeshStandardMaterial({ color: 0x111111, emissive: new Color(0xffffff), emissiveIntensity: 0 }),
    chrome: new MeshStandardMaterial({ ...flat, color: 0xc8ccd2, roughness: 0.12, metalness: 1 }),
    titanium: new MeshStandardMaterial({ ...flat, color: 0x6d6a66, roughness: 0.25, metalness: 1 }),
    gold: new MeshStandardMaterial({ ...flat, color: 0xd4a640, roughness: 0.2, metalness: 1 }),
    tire: new MeshStandardMaterial({ ...flat, color: 0x141416, roughness: 0.92, metalness: 0 }),
    tireWall: new MeshStandardMaterial({ ...flat, color: 0x1c1c1f, roughness: 0.8, metalness: 0 }),
    rim: new MeshStandardMaterial({ ...flat, color: 0x2a2b2f, roughness: 0.28, metalness: 0.9 }),
    rimLip: new MeshStandardMaterial({ ...flat, color: 0xb9bdc4, roughness: 0.15, metalness: 1 }),
    disc: new MeshStandardMaterial({ ...flat, color: 0x55575c, roughness: 0.45, metalness: 0.85 }),
    caliper: new MeshStandardMaterial({ ...flat, color: 0xffb400, roughness: 0.35, metalness: 0.2 }),
    interior: new MeshStandardMaterial({ ...flat, color: 0x121214, roughness: 0.9 }),
    alcantara: new MeshStandardMaterial({ ...flat, color: 0x1d1d22, roughness: 1 }),
    stitch: new MeshStandardMaterial({ ...flat, color: 0xffc21a, roughness: 0.6 }),
    helmet: new MeshPhysicalMaterial({ ...flat, color: 0xf4f4f4, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 0.6 }),
    visor: new MeshPhysicalMaterial({ ...flat, color: 0x101418, roughness: 0.05, metalness: 0.6, clearcoat: 1 }),
    suit: new MeshStandardMaterial({ ...flat, color: 0x24242a, roughness: 0.8 }),
    stripe: new MeshPhysicalMaterial({
      ...flat, color: 0xf4f4f2, metalness: 0.1, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.24,
    }),
    amber: new MeshStandardMaterial({ color: 0x331a00, emissive: new Color(0xff8a10), emissiveIntensity: 1.2 }),
    lamp: new MeshPhysicalMaterial({ color: 0xdfe6ee, emissive: new Color(0xfff2d8), emissiveIntensity: 1.3, roughness: 0.1, clearcoat: 1 }),
    plate: new MeshStandardMaterial({ ...flat, color: 0xe9e6dc, roughness: 0.6 }),
    flame: new MeshBasicMaterial({
      color: 0xff8a2a, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide,
    }),
  };
  for (const [key, hex] of Object.entries(overrides)) m[key].color.setHex(hex);
  return m;
}
