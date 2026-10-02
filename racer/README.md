# Tiny Lambo Racer

Miniature, hand-built low-poly cars on two tracks (press **T** to switch):

- **Porto Vela Street Circuit:** 3.36 km through a fictional Riviera harbour town at dusk.
  It has kerbs, run-offs painted in the sponsors' colours, a drivable Monaco-style pit lane
  with a 60 km/h limiter, 13 grandstands, and thousands of modelled spectators.
- **Pinewood Ridge:** a 3.7 km mountain road course through spruce forest, with gravel
  traps, timber grandstands, fan camps, a lake and snowy peaks.
- **Lumen Bay International:** a 4.5 km purpose-built floodlit circuit raced at night by a
  marina, with a main grandstand complex, a lattice-shell hotel, a fan zone and a city around it.
- **Void Ring:** a black ring floating in the void, used as a physics test bed.

Timing: three sectors (purple, green, yellow), a live delta to your best lap, and a top-10
leaderboard per track (press **L**). Cameras include a cockpit view with a working wheel.

There are three cars (press **V** to switch), and they handle very differently:

- **Lamborghini:** mid-engine AWD V10, short and darty, high grip and sharp turn-in.
- **Mustang fastback:** front-engine RWD V8, heavy and soft, huge low-down torque, slow shifts,
  and big progressive power slides.
- **Mini F1:** light, open-wheel and RWD, with huge downforce, a sharp grip peak, a high-revving
  hybrid V6 and seamless shifts. It's the fastest by far.

## Run it

ES modules need to be served over `http://`, so opening the file directly won't work:

```bash
cd racer
npm run serve        # http://localhost:8080  (Node 18+, no install needed)
```

It also works on any static host, such as GitHub Pages. three.js is vendored in `vendor/`.

## Controls

| | |
|---|---|
| W / S or ↑ / ↓ | throttle / brake (hold S when stopped to reverse) |
| A / D or ← / → | steer |
| Space | handbrake |
| C | camera: chase, far chase, bumper, showroom (drag to orbit, scroll to zoom), top-down |
| R | reset the car onto the track |
| V | switch car |
| X | cycle paint |
| 1 / 2 / 3 | assists (TC + ABS + ESC), auto/manual gearbox (Q/E to shift), AWD/RWD |
| 4 | physics telemetry: per-tire slip, load, force vectors, g-meter |
| H / M / P | horn / mute / pause |

Gamepads use the standard mapping: RT/LT for throttle and brake, the left stick to steer,
A for the handbrake, LB/RB to shift, Y for camera and B to reset.

## How it's built

- `src/cars/<car>/`: each car is a lines plan (`body.js`), hand-placed details (`parts.js`), and a
  physics spec (`spec.js`). To add a car, add a folder and list it in `src/cars/index.js`.
- `src/car/`: the shared car builder. `loft.js` turns a lines plan into a faceted body,
  `proportions.js` squashes it lengthwise (the arches keep their shape) and scales it into a
  Choro-Q-style miniature, and there are also the wheels, materials, the chibi driver, and the visual.
- `src/physics/`: a custom 6-DOF rigid body with raycast suspension, anti-roll bars,
  combined-slip tires with load sensitivity, sub-stepped implicit wheel spin, a V10 with a
  slipping-clutch launch, a 7-speed gearbox, AWD/RWD with viscous LSDs, aero, TC/ABS/ESC, hull
  contacts for crashes, and falling into the void.
- `src/config.js`: track and driver-assist settings. Each car's handling lives in its `spec.js`.
- `src/world/trackShape.js`: track geometry shared by the physics and the mesh, so the kerbs
  you see are the bumps the tires feel.
- `src/tracks/street/`: Porto Vela. `layout.js` builds the circuit from hand-drawn points
  (walls, kerbs, run-offs). `pitlane.js` defines the pit lane, which the walls, the dressing
  and the pit building all share. `circuit.js` builds the track furniture and sponsor zones.
  `buildings.js`, `trees.js`, `people.js`, `pits.js`, `hills.js` and `water.js` hold the
  hand-built town.
- Dev tools: `tools/humanlap.mjs` (a keyboard-style bot laps Porto Vela and counts spins and
  slides), `tools/turncheck.mjs` (steady-state turning), and `tools/view.mjs` / `tools/shot.mjs`
  (headless screenshots).

## Tests

```bash
npm install && npm test
```

The headless physics regression tests check settling, 0-100, top speed, braking, reverse,
wheelspin, lapping the ring, falling off, ESC stability, handbrake slides, kerbs and braking
out of a corner.

`tools/shot.mjs` and `tools/drive.mjs` are dev helpers that take headless screenshots.
They need Playwright.
