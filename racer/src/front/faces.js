import { objectImage } from './parts3d.js';
import { buildPerson, setPose } from './people.js';
import { SKIN, HAIR } from './teams.js';

/*
 * Faces: a person's head and shoulders rendered from our 3D people (the same characters as in the
 * garage and the paddock), for the staff cards, the market and the news. A person without a look (the
 * generated staff) gets one from their id, so the same person always has the same face.
 */
const SKINS = Object.values(SKIN), HAIRC = Object.values(HAIR);
const STYLES = ['short', 'buzz', 'quiff', 'bald', 'curly', 'long', 'mullet', 'short', 'buzz'];
const FACIAL = ['none', 'none', 'stubble', 'beard', 'none', 'moustache', 'goatee'];
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
/** A look from an id (stable). */
export function lookFor(id, age = 40) {
  let h = hash(id); const r = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; return (h % 10000) / 10000; };
  const greyed = age > 52 && r() < 0.6;
  return { skin: SKINS[Math.floor(r() * SKINS.length)], hair: STYLES[Math.floor(r() * STYLES.length)], hairCol: greyed ? HAIR.grey : HAIRC[Math.floor(r() * 6)], facial: FACIAL[Math.floor(r() * FACIAL.length)] };
}
/** A face as an image: person { id, look?, age }, outfit { kind: 'polo' | 'race' | 'suit', main, accent }. */
export function faceImage(person, outfit, { w = 256, h = 256, full = false } = {}) {
  const look = person.look ?? lookFor(person.id ?? person.name, person.age);
  const key = `face-${person.id ?? person.name}-${outfit.main}-${w}x${h}-${full ? 1 : 0}`;
  return objectImage(key, () => { const p = buildPerson(look, outfit); setPose(p, 'idle'); p.rotation.y = -0.3; return p; },
    { dir: [0.16, 0.06, 1], fov: 20, w, h, frame: (box) => { const H = box.max.y - box.min.y; return full ? [box.max.y - H * 0.26, H * 0.56] : [box.max.y - H * 0.13, H * 0.3]; } });
}
