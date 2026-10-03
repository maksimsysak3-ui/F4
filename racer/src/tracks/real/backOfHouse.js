import { rgb } from '../street/kit.js';
import { transporterRow, paddockClub, teamHospitality, medicalCentre, teamColour } from '../paddock.js';
import {
  portal, sub, recoveryCrane, cameraTower, cabinStack, container, uplinkFarm, busTerminal, helipad, gate, loos, foodTrucks,
  lightMast, constructionSite, VEHICLES,
} from '../backstageProps.js';

/*
 * The working side of a Grand Prix venue, wired to its roads: a paddock road
 * behind the transporters that dives through a tunnel under the track to the
 * perimeter road, gates, the paddock (transporters, hospitality, paddock club,
 * medical centre, helipad, TV uplinks), the F1 logistics yard, shuttle-bus
 * terminals, recovery cranes and camera towers on the service road, and
 * concessions. Every piece stands on a road or on the service lane. The
 * circuit chooses where (pit side, tunnel, ring distance, exits) and how it
 * looks (paint, liveries, bus colours, crane colours).
 */

const wrap = (L, v) => ((v % L.length) + L.length) % L.length;

/** Roads: perimeter ring, paddock road + tunnel + access spur, exits, service lanes, traffic. */
export function venueRoads({ bs, kit, L }, o) {
  const net = {};
  const side = o.pitSide, other = side === 'L' ? 'R' : 'L';
  net.ring = bs.ring(o.ring ?? 160);
  const lane = (ds, sd, extra) => { const f = kit.frontage(wrap(L, ds), sd, extra); return [f.x, f.z]; };
  const [a, b] = o.paddock, T = o.tunnel;
  net.portalIn = kit.frontage(wrap(L, T), side, 16);
  net.portalOut = kit.frontage(wrap(L, T), other, 16);
  const dirn = T < a ? 1 : -1; // the paddock road runs from the tunnel along the paddock
  const pts = [lane(T, side, 16), lane(T + dirn * 30, side, 50)];
  for (let ds = T + dirn * 60; dirn > 0 ? ds <= b : ds >= a; ds += dirn * 20) pts.push(lane(ds, side, 92));
  net.paddock = bs.path(pts, { w: 7, kind: 'spur', margin: 1 });
  net.spur = bs.spur(net.portalOut.x, net.portalOut.z, o.ring ?? 160);
  net.exits = (o.exits ?? [0.1, 0.45, 0.75]).map((f, k) => bs.exitFrom(net.ring, f, { w: k === 0 ? 10 : 8 }));
  net.extra = o.moreRoads?.(net) ?? [];
  net.service = bs.service({ offset: 10, w: 4.5 });
  for (let ds = Math.min(a, b); ds < Math.max(a, b); ds += 30) { const f = kit.frontage(wrap(L, ds), side, 26); bs.pad(f.x, f.z, f.dirX, f.dirZ, 31, 70, o.apron ?? [0.66, 0.65, 0.62]); }
  const P = o.palette;
  bs.traffic(net.ring, { density: o.density ?? 10, mix: o.mix, palette: P, speed: [9, 12] });
  for (const e of [...net.exits, ...net.extra]) bs.traffic(e, { density: (o.density ?? 10) * 1.6, mix: o.mix, palette: P, speed: [11, 15] });
  bs.traffic(net.spur, { density: 12, mix: { van: 2, truck: 1, car: 1 }, palette: [0xf2f2ee, 0x1b1b1f], speed: [6, 8] });
  bs.traffic(net.paddock, { density: 8, mix: { van: 2, car: 1 }, palette: [0xf2f2ee, 0x1b1b1f], speed: [4, 6] });
  return net;
}

/** Everything that stands on those roads. */
export function venueBackOfHouse({ L, R, kit, bs, placed, frameAt }, net, o) {
  const n = { cranes: 0, cams: 0, paddock: 0 };
  const lotBehind = (s, sd, extra, W, D, margin = 2) => {
    const fr = kit.frontage(wrap(L, s), sd, extra);
    return kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, margin, null);
  };
  const facing = (fr) => frameAt(fr.x, fr.z, Math.atan2(fr.dirX, fr.dirZ));
  if (net.paddock) {
    portal(facing(net.portalIn), { W: 8, col: o.concrete });
    portal(facing(net.portalOut), { W: 8, col: o.concrete });
    const g = bs.alongside(net.paddock, { side: 1, offset: -3.5, every: 1000, from: 70 })[0];
    if (g) gate(frameAt(g.x, g.z, Math.atan2(g.dirZ, -g.dirX)), R, { W: 12, col: o.gate });
    let team = 0;
    for (const F of bs.roadside(net.paddock, { side: 'in', W: 22, D: 16, every: 24, count: 12, from: 90, apron: null, margin: 1 })) { transporterRow(F, R, 6, team); team += 6; n.paddock++; }
    const out = (q) => bs.roadside(net.paddock, { side: 'out', every: 12, margin: 1, ...q });
    for (const F of out({ W: 64, D: 19, count: 1, from: 100 })) { paddockClub(F, R); n.paddock++; }
    for (const F of out({ W: 23, D: 15, count: o.hospitality ?? 7, from: 60 })) { teamHospitality(F, R, teamColour(n.paddock)); n.paddock++; }
    for (const F of out({ W: 20, D: 13, count: 1, from: 40 })) { medicalCentre(F, R); n.paddock++; }
  }
  // Helipad and TV uplinks: on the paddock road if there's room, else on the perimeter road.
  const either = (q) => (net.paddock && bs.roadside(net.paddock, { side: 'out', every: 12, margin: 1, ...q })[0]) || bs.roadside(net.ring, { side: 'in', every: 40, margin: 3, ...q })[0];
  const H = either({ W: 26, D: 26 });
  if (H) { helipad(sub(H, 0, -13), R, o.heli ?? rgb(0xc8242b)); placed.helipad = 1; }
  const U = either({ W: 52, D: 30 });
  if (U) { uplinkFarm(U, R, { livery: o.liveries }); placed.uplink = 1; }
  // F1 logistics yard by the access spur.
  const Y = bs.roadside(net.spur, { side: 1, W: 70, D: 34, every: 15, from: 20 })[0] || bs.roadside(net.spur, { side: -1, W: 70, D: 34, every: 15, from: 20 })[0]
    || bs.roadside(net.ring, { side: 'out', W: 70, D: 34, every: 60 })[0];
  if (Y) {
    const C = [rgb(0xffd23f), rgb(0xc8242b), rgb(0x1f3f8a), rgb(0x8a929e)];
    for (let k = 0; k < 5; k++) for (let h = 0; h < 2; h++) if (h === 0 || R() < 0.7) container(sub(Y, -30 + k * 3, -24, 0, h * 2.6), R, C[(k + h) % 4]);
    for (let k = 0; k < 6; k++) VEHICLES.truck(sub(Y, -8 + k * 4, -9, Math.PI), k % 2 ? rgb(0xffd23f) : rgb(0xf2f2ee), 'stucco');
    for (let k = 0; k < 2; k++) cabinStack(sub(Y, 22 + k * 7, -3, 0), R, 2);
    lightMast(sub(Y, -34, -16));
    placed.logistics = 1;
  }
  for (const F of bs.roadside(net.ring, { side: 'in', W: 44, D: 16, every: 90, from: 150, count: o.busTerminals ?? 2, margin: 3 })) { busTerminal(sub(F, 0, -15), R, { n: 7, col: o.bus }); placed.buses = (placed.buses ?? 0) + 1; }
  for (const F of bs.roadside(net.ring, { side: 'out', W: 46, D: 36, every: 60, from: 500, count: o.sites ?? 1, margin: 4, apron: [0.55, 0.5, 0.42] })) {
    constructionSite(sub(F, 0, -7), R, { W: 34, D: 22, floors: 7 + Math.floor(R() * 6), built: 0.5 + R() * 0.3, cranes: 1 + (R() < 0.5 ? 1 : 0), hoarding: o.hoarding, craneCol: o.crane });
    placed.sites = (placed.sites ?? 0) + 1;
  }
  for (const c of bs.corners(1 / 70)) {
    if (c.k > 1 / 45 && n.cranes < 8) {
      const C = lotBehind(c.s + 25, c.outside, 9.5, 9, 14, 1);
      if (C) { recoveryCrane(sub(C, 0, -7), R, o.recovery ?? rgb(0xffd23f)); n.cranes++; }
    }
    const T = lotBehind(c.s - 30, c.outside, -1.4, 2.6, 2.6, 0.5);
    if (T) { cameraTower(sub(T, 0, -1.3), R, 6 + R() * 3); n.cams++; }
  }
  for (const at of o.concessions ?? []) {
    const s = L.pointS(at), i = Math.floor(s / L.ds) % L.N;
    const sd = L.k[i] > 0 ? 'R' : 'L';
    const Fd = lotBehind(s + 40, sd, 9.5, 42, 6, 1);
    if (Fd) foodTrucks(Fd, R, 5);
    const Fl = lotBehind(s - 50, sd, 9.5, 12, 2, 1);
    if (Fl) loos(Fl, R, 9);
  }
  Object.assign(placed, n);
}
