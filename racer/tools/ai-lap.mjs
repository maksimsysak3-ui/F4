// Dev check of the AI's driving: one car alone on a circuit (no rendering), its lap time against the
// plan's ideal, and where its speed falls short of the plan (corners, braking).
// Usage: node tools/ai-lap.mjs [track] [pace] [skill] [humanity]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [track = 'austria', pace = '0.975', skill = '0.98', humanity = '0.2'] = process.argv.slice(2);
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 160, height: 100 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(`http://localhost:${port}/index.html?autostart&nopost&track=${track}`);
for (let k = 0; k < 120; k++) { if (await p.evaluate((t) => window.__racer?.track?.id === t && window.__racer.started, track)) break; await p.waitForTimeout(500); }
const out = await p.evaluate(async ([pace, skill, humanity]) => {
  const S = await import('./src/ai/sim2d.js'), D = await import('./src/ai/driver.js'), F = await import('./src/ai/field.js');
  const L = window.__racer.track.layout, plan = F.planFor(window.__racer.track);
  const d = new D.AIDriver(plan, { pace: +pace, skill: +skill, humanity: +humanity, aggression: 0.5, name: 'T', seed: 77 });
  const pose = L.poseAt(10, plan.line[Math.floor(10 / L.ds)]);
  const car = new S.Car(1, { x: pose.x, z: pose.z, heading: Math.atan2(pose.fz ?? Math.sin(pose.yaw), pose.fx ?? Math.cos(pose.yaw)) });
  if (pose.yaw !== undefined && pose.fx === undefined) car.h = -pose.yaw + Math.PI / 2;
  car.h = Math.atan2(L.tz[1], L.tx[1]); car.u = 30;
  const dt = 1 / 120, laps = [], speedLog = new Float32Array(L.N), brakeLog = new Float32Array(L.N);
  let t = 0, lastLap = 0, prevS = 0, lapNo = 0;
  for (let k = 0; k < 120 * 400 && laps.length < 3; k++) {
    S.locate(L, car);
    const o = d.drive(car, [], dt, t);
    car.steer = o.steer; car.throttle = o.throttle; car.brake = o.brake;
    S.stepCar(L, car, dt); t += dt;
    const s = car.s;
    if (s < prevS - L.length / 2) { laps.push(t - lastLap); lastLap = t; lapNo++; }
    if (lapNo === 2) { const i = Math.floor(s / L.ds) % L.N; speedLog[i] = car.u; brakeLog[i] = car.brake; }
    prevS = s;
  }
  // The ideal: the plan's speed profile at pace 1 along the line.
  let ideal = 0; for (let i = 0; i < L.N; i++) ideal += L.ds / plan.vLine[i];
  // Corners: plan min speed vs driven min speed.
  const corners = [];
  for (let i = 0; i < L.N; i++) {
    const a = (i - 1 + L.N) % L.N, c = (i + 1) % L.N;
    if (plan.vLine[i] < plan.vLine[a] && plan.vLine[i] <= plan.vLine[c] && plan.vLine[i] < 75) {
      let mn = Infinity; for (let q = -15; q <= 15; q++) mn = Math.min(mn, speedLog[(i + q + L.N) % L.N] || Infinity);
      // Braking start: walk back while the plan is falling.
      let j = i, n = 0; while (n < 400 && plan.vLine[(j - 1 + L.N) % L.N] > plan.vLine[j] + 1e-6) { j = (j - 1 + L.N) % L.N; n++; }
      let jb = i, m = 0; for (let q = 0; q < 30; q++) if (speedLog[(jb - 1 + L.N) % L.N] < speedLog[jb]) jb = (jb - 1 + L.N) % L.N; else break; // to the AI's own minimum
      while (m < 600 && speedLog[(jb - 1 + L.N) % L.N] > speedLog[jb] + 1e-4) { jb = (jb - 1 + L.N) % L.N; m++; }
      corners.push({ at: Math.round(i * L.ds), planMin: +(plan.vLine[i] * 3.6).toFixed(0), aiMin: +(mn * 3.6).toFixed(0), planBrakeM: Math.round(n * L.ds), aiBrakeM: Math.round(m * L.ds) });
    }
  }
  return { laps: laps.map((x) => x.toFixed(2)), ideal: ideal.toFixed(2), corners, walls: car.wallHits, off: car.offTime.toFixed(1) };
}, [pace, skill, humanity]);
console.log(`${track} pace ${pace}: laps ${out.laps.join(' ')}  plan ideal ${out.ideal}  wall hits ${out.walls}, off track ${out.off} s`);
for (const c of out.corners) console.log(`  @${c.at}m  min speed plan ${c.planMin} / AI ${c.aiMin} km/h   slowing over: plan ${c.planBrakeM} m / AI ${c.aiBrakeM} m`);
await b.close(); server.kill();
