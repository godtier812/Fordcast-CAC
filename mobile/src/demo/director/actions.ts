// mobile/src/demo/director/actions.ts — Director buttons that have side effects (§24.3). Screens call these, never the
// store + native modules separately, so a take always starts from the same state.
import * as Speech from 'expo-speech';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { getCompiled, useDemo } from '../store/demo-store';
import { resolveKeyframe } from '../scenario/choreography';
import { TAKES, type Take } from '../scenario/takes';
import { resetDemoNotifications, armLockScreenTake } from '../notify/adapter';
import type { Lang } from '../i18n/tr';

export async function directorReset(): Promise<void> {
  await Speech.stop();
  await resetDemoNotifications();
  useDemo.getState().resetState();                                   // pause, seek to playFromMin, clear override/arm/fired
}
export async function setCleanMode(on: boolean): Promise<void> {
  useDemo.getState().setToggle('clean', on);
  if (on) await activateKeepAwakeAsync('demo'); else await deactivateKeepAwake('demo');
}
/** Tapping a take chip: load scenario → seek to its keyframe → set speed → navigate → arm notification/drive. */
export async function loadTake(take: Take, lang: Lang, navigate: (path: string) => void): Promise<number> {
  await directorReset();
  const st = useDemo.getState(); st.selectScenario(take.scenario);
  const at = resolveKeyframe(getCompiled(take.scenario), { id: take.id, label: take.beat, at: take.at });
  useDemo.getState().seek(at);
  if (take.speed !== 'paused') useDemo.getState().setSpeed(take.speed);
  if (take.id.startsWith('T06')) await armLockScreenTake(lang);      // seeks to beat − 1 and pauses itself
  navigate(TAKE_ROUTES[take.id] ?? '/');
  return at;
}
export const TAKE_ROUTES: Record<string, string> = {                 // expo-router paths (§18 route table): the first filmed frame
  'T01-calm': '/', 'T02-rising': '/crossing/atx-37', 'T03-player': '/storms', 'T04-results': '/storm/results',
  'T05-one-clock': '/storm/flash-flood-night', 'T06-lockscreen': '/', 'T07-sheet': '/crossing/atx-37', 'T08-detour': '/drive/result',
  'T09-drive-en': '/drive-mode', 'T10-drive-es': '/drive-mode', 'T11-unknown': '/storm/onion-creek-storm',
  'O1-closed': '/crossing/atx-37', 'O2-sensor': '/crossing/atx-692', 'O3-lockout': '/', 'O4-onion-result': '/storm/results',
};
export const takeById = (id: string) => TAKES.find((t) => t.id === id);
