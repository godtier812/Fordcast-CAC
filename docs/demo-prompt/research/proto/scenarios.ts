// mobile/src/demo/scenario/scenarios/*.ts — the four bundled scenarios (data, not code). Times = minutes after t = 0.
import type { DemoScenarioV1 } from './compile';

const calmCurves = (ids: string[]) => ids.map((gaugeId) => ({ gaugeId, diurnalFt: 0.03, noiseFt: 0.01 }));
const ALL = ['08158922', '08158930', '08158970', '08158700', '08158800', '08158827', '08159000', '08158840', '08156800',
  '08157000', '08154700', '08158200', '08155200', '08155400'].map((s) => `USGS-${s}`);

// (a) Calm evening — every monitored crossing "No rise detected"; tier C stays "Unknown · not monitored".
export const calmEvening: DemoScenarioV1 = {
  schema: 'fordcast.demo-scenario.v1', id: 'calm-evening', seed: 11, kind: 'live',
  title: { en: 'Calm evening', es: 'Noche tranquila' },
  clockStart: { h: 19, m: 30 }, durationMin: 120, playFromMin: 0,
  rain: [{ t: 0, inPerHr: 0, over: 'Austin' }],
  curves: calmCurves(ALL), outages: [], official: [], network: [{ t: 0, online: true }], truth: [],
  subscriptions: { crossingIds: ['atx-37', 'atx-680', 'atx-692'], watchAlerts: false },
  keyframes: [{ id: 'calm', label: 'Calm map', at: { kind: 'min', t: 30 } }],
};

// (b) Flash flood night — the hero. Upper Williamson Creek gets a short, intense cell over Oak Hill.
export const flashFloodNight: DemoScenarioV1 = {
  schema: 'fordcast.demo-scenario.v1', id: 'flash-flood-night', seed: 26, kind: 'live',
  title: { en: 'Flash flood night', es: 'Noche de inundación repentina' },
  subtitle: { en: 'Pre-dawn cloudburst over Oak Hill', es: 'Aguacero antes del amanecer sobre Oak Hill' },
  clockStart: { h: 5, m: 50 }, durationMin: 300, playFromMin: 0,   // pre-dawn (sunrise ≈ 7:35): AVOID lands at 7:00 AM, before the school run
  rain: [{ t: 0, inPerHr: 0, over: 'Oak Hill' }, { t: 5, inPerHr: 0.4, over: 'Oak Hill' }, { t: 15, inPerHr: 2.2, over: 'Oak Hill' },
    { t: 35, inPerHr: 3.1, over: 'Oak Hill' }, { t: 55, inPerHr: 1.2, over: 'Oak Hill' }, { t: 80, inPerHr: 0.3, over: 'Oak Hill' },
    { t: 110, inPerHr: 0, over: 'Oak Hill' }],
  curves: [
    ...calmCurves(ALL.filter((g) => !['USGS-08158922', 'USGS-08158930', 'USGS-08158970', 'USGS-08158840'].includes(g))),
    { gaugeId: 'USGS-08158922', pulses: [{ peakMin: 95, riseMin: 80, fallMin: 75, ampFt: 7.6, kRise: 3, kFall: 1.3 }], noiseFt: 0.02 },
    { gaugeId: 'USGS-08158930', routedFrom: { gaugeId: 'USGS-08158922', lagMin: 32, gain: 0.95, smoothMin: 20 }, noiseFt: 0.02 },
    { gaugeId: 'USGS-08158970', routedFrom: { gaugeId: 'USGS-08158930', lagMin: 45, gain: 1.3, smoothMin: 30 }, noiseFt: 0.02 },
    { gaugeId: 'USGS-08158840', pulses: [{ peakMin: 95, riseMin: 60, fallMin: 60, ampFt: 3.0 }], noiseFt: 0.02 },
  ],
  outages: [],
  // Simulated official closure (source label demo.source.road_crew = "Simulated road crew"), lifted at 9:25 AM.
  official: [
    { crossingId: 'atx-37', source: 'demo_official', status: 'closed', setAt: 120, expiresAt: 120 + 240 },
    { crossingId: 'atx-37', source: 'demo_official', status: 'open', setAt: 215, expiresAt: 215 + 120 },
  ],
  network: [{ t: 0, online: true }],
  truth: [
    { crossingId: 'atx-37', fromGaugeId: 'USGS-08158922', tauTrueMin: 42, overtopUpFt: 6.8 },   // onset inside the first window
    { crossingId: 'atx-680', fromGaugeId: 'USGS-08158922', tauTrueMin: 32, overtopUpFt: 9.4 },
    { crossingId: 'atx-692', fromGaugeId: 'USGS-08158930', tauTrueMin: 0, overtopUpFt: 9.0 },   // C §18.2: target gauge ≥ overtop
  ],
  subscriptions: { crossingIds: ['atx-37'], watchAlerts: false },          // the one crossing on the saved Home→School route
  keyframes: [],                                     // filled from events by takes.ts (never hand-typed times)
};

// (c) Big Onion Creek storm (simulated) — a long night storm; Twin Creeks Rd gauge goes silent mid-rise (2013-style pattern).
export const onionCreekStorm: DemoScenarioV1 = {
  schema: 'fordcast.demo-scenario.v1', id: 'onion-creek-storm', seed: 13, kind: 'storm',
  title: { en: 'Big Onion Creek storm (simulated)', es: 'Gran tormenta en Onion Creek (simulada)' },
  clockStart: { h: 1, m: 0 }, durationMin: 420, playFromMin: 0,
  rain: [{ t: 0, inPerHr: 0.2, over: 'Driftwood' }, { t: 20, inPerHr: 2.5, over: 'Driftwood' }, { t: 60, inPerHr: 4.0, over: 'Driftwood' },
    { t: 120, inPerHr: 1.5, over: 'Driftwood' }, { t: 180, inPerHr: 0.2, over: 'Driftwood' }, { t: 240, inPerHr: 0, over: 'Driftwood' }],
  curves: [
    ...calmCurves(ALL.filter((g) => !['USGS-08158700', 'USGS-08158800', 'USGS-08158827', 'USGS-08159000'].includes(g))),
    { gaugeId: 'USGS-08158700', pulses: [{ peakMin: 150, riseMin: 120, fallMin: 150, ampFt: 15, kRise: 2.5 }], noiseFt: 0.03 },
    { gaugeId: 'USGS-08158800', routedFrom: { gaugeId: 'USGS-08158700', lagMin: 105, gain: 0.95, smoothMin: 40 }, noiseFt: 0.03,
      pulses: [{ peakMin: 140, riseMin: 80, fallMin: 90, ampFt: 2.0 }] },
    { gaugeId: 'USGS-08158827', routedFrom: { gaugeId: 'USGS-08158800', lagMin: 35, gain: 1.05, smoothMin: 20 }, noiseFt: 0.03 },
    { gaugeId: 'USGS-08159000', routedFrom: { gaugeId: 'USGS-08158827', lagMin: 70, gain: 1.9, smoothMin: 40 }, noiseFt: 0.03 },
  ],
  outages: [
    { gaugeId: 'USGS-08158827', startMin: 250, endMin: 335, mode: 'delayed' },   // readings exist, arrive at endMin
    { gaugeId: 'USGS-08159000', startMin: 300, endMin: 400, mode: 'delayed' },
  ],
  official: [], network: [{ t: 0, online: true }],
  truth: [
    { crossingId: 'hays-663', fromGaugeId: 'USGS-08158700', tauTrueMin: 12, overtopUpFt: 8.0 },
    { crossingId: 'bud-1117', fromGaugeId: 'USGS-08158800', tauTrueMin: 16, overtopUpFt: 8.5 },
    { crossingId: 'tc-68', fromGaugeId: 'USGS-08158800', tauTrueMin: 47, overtopUpFt: 10.0 },
    { crossingId: 'tc-1626', fromGaugeId: 'USGS-08158827', tauTrueMin: 41, overtopUpFt: 11.0 },
  ],
  subscriptions: { crossingIds: [], watchAlerts: false },
  keyframes: [],
};

// (d) Drive — same storm; leaves Home at 6:58:54 AM while Jones Rd is WATCH, so AVOID arrives 66 s into the drive (1× clock).
export const driveCommute: DemoScenarioV1 = {
  ...flashFloodNight, id: 'drive-commute', title: { en: 'Drive to school (simulated)', es: 'Camino a la escuela (simulado)' },
  playFromMin: 68.9, drive: { route: 'commute', startSimMin: 68.9, cruiseMps: 8.9, accelS: 6, takeDetourAtBranch: true },   // 20 mph in heavy rain
};

export const SCENARIOS = [calmEvening, flashFloodNight, onionCreekStorm, driveCommute];
