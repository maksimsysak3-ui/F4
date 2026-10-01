# Tiny Lambo Racer

A miniature, hand-built low-poly Lamborghini on a black ring track floating in the void.
It's a physics and visuals test bed: there's one car, one track, and nothing else.

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
| X | cycle paint |
| 1 / 2 / 3 | assists (TC + ABS + ESC), auto/manual gearbox (Q/E to shift), AWD/RWD |
| 4 | physics telemetry: per-tire slip, load, force vectors, g-meter |
| H / M / P | horn / mute / pause |

Gamepads use the standard mapping: RT/LT for throttle and brake, the left stick to steer,
A for the handbrake, LB/RB to shift, Y for camera and B to reset.

## How it's built

- `src/car/`: the body is lofted from a hand-drawn lines plan (`lamboBody.js`). It has hexagonal
  arches, Y-shaped DRLs and taillights, an STO-style wing, a roof snorkel and Y-spoke wheels.
  `src/proportions.js` then squashes it lengthwise (the arches keep their shape) and scales it
  down, which turns it into a Choro-Q-style miniature.
- `src/physics/`: a custom 6-DOF rigid body with raycast suspension, anti-roll bars,
  combined-slip tires with load sensitivity, sub-stepped implicit wheel spin, a V10 with a
  slipping-clutch launch, a 7-speed gearbox, AWD/RWD with viscous LSDs, aero, TC/ABS/ESC, hull
  contacts for crashes, and falling into the void.
- `src/config.js`: every handling number lives here.
- `src/world/trackShape.js`: track geometry shared by the physics and the mesh, so the kerbs
  you see are the bumps the tires feel.

## Tests

```bash
npm install && npm test
```

The headless physics regression tests check settling, 0-100, top speed, braking, reverse,
wheelspin, lapping the ring, falling off, ESC stability, handbrake slides, kerbs and braking
out of a corner.

`tools/shot.mjs` and `tools/drive.mjs` are dev helpers that take headless screenshots.
They need Playwright.
