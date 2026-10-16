import { estimateLag, combineStorms } from './learn';
import { pulseFt, mulberry32 } from './sim';
// six simulated past storms on the hero link; true lag varies storm to storm (34..46 min)
const trueLags = [34, 38, 40, 41, 44, 46]; const ests = [];
trueLags.forEach((L, k) => { const rnd = mulberry32(1000 + k); const amp = 3 + 5 * rnd(), rise = 50 + 40 * rnd();
  const up: number[] = [], down: number[] = [];
  for (let t = 0; t <= 600; t += 5) { const f = (x: number) => pulseFt({ peakMin: 200, riseMin: rise, fallMin: 90, ampFt: amp }, x);
    // gauges report every 15 min → hold-interpolate onto the 5-min grid like §18.1 (linear between 15-min samples)
    const s15 = (g: (x: number) => number, x: number) => { const a = Math.floor(x / 15) * 15, b = a + 15; return g(a) + (g(b) - g(a)) * (x - a) / 15; };
    up.push(2 + s15(f, t) + (rnd() - 0.5) * 0.04); down.push(1 + 0.8 * s15((x) => f(x - L), t) + (rnd() - 0.5) * 0.04); }
  const e = estimateLag(up, down, `sim-${k}`); ests.push(e!); console.log('storm', k, 'true', L, 'est', e?.lagMin.toFixed(1), 'r', e?.r.toFixed(3)); });
console.log(combineStorms(ests));
