// mobile/src/demo/scenario/takes.ts — the video take plan as DATA. Each take names a scenario, a keyframe (resolved from
// compiled events, never a hand-typed minute when an event exists), the screen and gesture, and what must be on screen.
// takes.test.ts asserts every expectation, so retuning a hydrograph can never silently break a planned shot.
import type { KeyframeAt } from './schema';
import type { Wire } from '../engine/types';

export type Expect = { crossingId: string; state: Wire; window?: [number, number] | null; lastKnown?: Wire };
export type Take = {
  id: string; beat: string; scenario: string; at: KeyframeAt; speed: 1 | 10 | 30 | 60 | 120 | 'paused';
  runForMin?: number;                 // sim-minutes the take plays (player takes); absent = a still/interaction take
  drive?: { fromS: number; toS: number; lang: 'en' | 'es' };
  screen: string; gesture: string; expect: Expect[]; notes?: string;
};
export const TAKES: Take[] = [
  { id: 'T01-calm', beat: '0:12 calm open', scenario: 'calm-evening', at: { kind: 'min', t: 30 }, speed: 'paused',
    screen: 'Map Home (tabs/map), AreaStatusCard, DEMO chip', gesture: 'none; 1 slow pinch-out at the end',
    expect: [{ crossingId: 'atx-37', state: 'no_rise' }, { crossingId: 'atx-41', state: 'no_rise' }, { crossingId: 'tc-85', state: 'unknown' }] },
  { id: 'T02-rising', beat: '0:25 how it works', scenario: 'flash-flood-night', at: { kind: 'event', crossingId: 'atx-37', state: 'watch', offsetMin: 3 }, speed: 'paused',
    screen: 'crossing/atx-37 at half detent (hydrograph hero)', gesture: 'tap Jones Rd marker → drag sheet to half',
    expect: [{ crossingId: 'atx-37', state: 'watch', window: null }] },
  { id: 'T03-player', beat: '0:35 signature', scenario: 'flash-flood-night', at: { kind: 'event', crossingId: 'atx-37', state: 'watch', offsetMin: -10 }, speed: 60,
    runForMin: 60, screen: 'storm/[flash-flood-night] player', gesture: 'tap ▶ once; touch nothing else',
    expect: [{ crossingId: 'atx-37', state: 'no_rise' }],
    notes: 'plays ▲ Watch (+10 s) → ◆ Avoid 15–30 (+25 s) → water pulse reaches Jones Rd → ● water on road (+55 s) → count-up' },
  { id: 'T04-results', beat: '1:10 result', scenario: 'flash-flood-night', at: { kind: 'event', crossingId: 'atx-37', state: 'closed', offsetMin: 5 }, speed: 'paused',
    screen: 'storm/results formSheet', gesture: 'auto-presents; drag to full once',
    expect: [{ crossingId: 'atx-37', state: 'closed' }] },
  { id: 'T05-one-clock', beat: '1:20 one clock', scenario: 'flash-flood-night', at: { kind: 'event', crossingId: 'atx-37', state: 'avoid', offsetMin: 2 }, speed: 'paused',
    screen: 'Map Home in storm (violet frame + scenario accessory)', gesture: 'tap ✕ on the player',
    expect: [{ crossingId: 'atx-37', state: 'avoid', window: [15, 30] }, { crossingId: 'atx-680', state: 'watch' }, { crossingId: 'atx-692', state: 'watch' },
      { crossingId: 'tc-87', state: 'unknown' }] },
  { id: 'T06-lockscreen', beat: '1:25 lock screen', scenario: 'flash-flood-night', at: { kind: 'event', crossingId: 'atx-37', state: 'avoid', offsetMin: -1 }, speed: 'paused',
    screen: 'iOS Lock Screen → notification', gesture: 'Director "Lock-screen take" → press side button → wait 8 s → tap notification → Face ID',
    expect: [{ crossingId: 'atx-37', state: 'watch' }], notes: 'notification announces the AVOID at the next tick; the tap seeks to it' },
  { id: 'T07-sheet', beat: '1:30 crossing sheet', scenario: 'flash-flood-night', at: { kind: 'event', crossingId: 'atx-37', state: 'avoid' }, speed: 'paused',
    screen: 'crossing/atx-37 peek → half', gesture: 'opened by the notification tap; drag to half',
    expect: [{ crossingId: 'atx-37', state: 'avoid', window: [15, 30] }] },
  { id: 'T08-detour', beat: '1:35 avoid it', scenario: 'flash-flood-night', at: { kind: 'event', crossingId: 'atx-37', state: 'avoid', offsetMin: 1 }, speed: 'paused',
    screen: 'drive/result (Home → School)', gesture: 'tap [Detour +N min] in the sheet → tap [Start Drive Mode]',
    expect: [{ crossingId: 'atx-37', state: 'avoid' }, { crossingId: 'atx-692', state: 'watch' }] },
  { id: 'T09-drive-en', beat: '1:55 Drive Mode', scenario: 'drive-commute', at: { kind: 'min', t: 68.9 }, speed: 1,
    drive: { fromS: 56, toS: 80, lang: 'en' }, screen: 'drive-mode (SIMULATED DRIVE)', gesture: 'none (phone mounted)',
    expect: [{ crossingId: 'atx-37', state: 'watch' }], notes: 'at 66 s: chime → "2 crossings ahead changed. Avoid Williamson Creek at Jones Road…" → Error haptic' },
  { id: 'T10-drive-es', beat: '2:05 Spanish', scenario: 'drive-commute', at: { kind: 'min', t: 68.9 }, speed: 1,
    drive: { fromS: 60, toS: 76, lang: 'es' }, screen: 'drive-mode in Spanish', gesture: 'none',
    expect: [{ crossingId: 'atx-37', state: 'watch' }] },
  { id: 'T11-unknown', beat: '2:10 honesty insert', scenario: 'onion-creek-storm', at: { kind: 'event', crossingId: 'tc-1626', state: 'unknown' }, speed: 'paused',
    screen: 'storm/[onion-creek-storm] player, Bluff Springs selected', gesture: 'none',
    expect: [{ crossingId: 'tc-1626', state: 'unknown', lastKnown: 'avoid' }, { crossingId: 'tc-68', state: 'avoid' }] },
  // ---- optional / B-roll takes ----
  { id: 'O1-closed', beat: 'optional: closure', scenario: 'flash-flood-night', at: { kind: 'event', crossingId: 'atx-37', state: 'closed' }, speed: 'paused',
    screen: 'crossing/atx-37 CLOSED · OFFICIAL (Simulated road crew)', gesture: 'tap marker', expect: [{ crossingId: 'atx-37', state: 'closed' }] },
  { id: 'O2-sensor', beat: 'optional: sensor at road', scenario: 'flash-flood-night', at: { kind: 'event', crossingId: 'atx-692', state: 'closed' }, speed: 'paused',
    screen: 'crossing/atx-692 "Water over road"', gesture: 'tap marker', expect: [{ crossingId: 'atx-692', state: 'closed' }] },
  { id: 'O3-lockout', beat: 'optional: lockout', scenario: 'drive-commute', at: { kind: 'min', t: 68.9 }, speed: 1, drive: { fromS: 0, toS: 15, lang: 'en' },
    screen: 'Map Home while the simulated car moves', gesture: 'at ≥ 9 s tap the search field → lockout dialog → hold "I\'m a passenger"',
    expect: [{ crossingId: 'atx-37', state: 'watch' }] },
  { id: 'O4-onion-result', beat: 'optional: second storm result', scenario: 'onion-creek-storm', at: { kind: 'onset', crossingId: 'tc-68', offsetMin: 5 }, speed: 'paused',
    screen: 'storm/results for the Onion Creek storm', gesture: 'none', expect: [{ crossingId: 'tc-68', state: 'avoid' }] },
];
