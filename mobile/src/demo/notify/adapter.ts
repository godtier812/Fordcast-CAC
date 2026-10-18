// mobile/src/demo/notify/adapter.ts — the ONLY file that calls expo-notifications (57.0.23). Local notifications only:
// no push token is ever requested (a free Personal Team has no aps-environment, §10).
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { getCompiled, useDemo } from '../store/demo-store';
import { useTick } from '../store/hooks';
import { planNotifications, type PlannedNotification } from '../scenario/choreography';
import { buildContent, lockScreenTake, requestId, type DemoNotificationContent } from './content';
import type { Lang } from '../i18n/tr';

let driveModeActive = false;
/** Drive Mode screen calls this on focus/blur: while driving, the HUD + voice carry the alert, so no foreground banner. */
export const setDriveModeActive = (v: boolean) => { driveModeActive = v; };
/** Call once at startup (root layout), before any permission prompt. Foreground banners stay visible (iOS),
 *  except in Drive Mode, where the alert still lands in Notification Center (shouldShowList) without covering the HUD. */
export function setupDemoNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: !driveModeActive, shouldShowList: true,
      shouldPlaySound: !driveModeActive, shouldSetBadge: false }),
  });
}
/** Ask only in context (primer screen, §18 permission/notifications). Returns true when granted. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync(); if (cur.granted) return true;
  const r = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return r.granted;
}
const input = (c: DemoNotificationContent): Notifications.NotificationContentInput => ({
  title: c.title, subtitle: c.subtitle, body: c.body, sound: c.sound, interruptionLevel: c.interruptionLevel,
  data: { ...c.data },
});
/** Post a planned notification now (foreground playback and Director "Fire notification now"). */
export async function postNow(p: PlannedNotification, lang: Lang): Promise<void> {
  const st = useDemo.getState(); const cmp = getCompiled(st.scenarioId); const id = requestId(cmp.scenario.id, p);
  if (st.firedIds.includes(id)) return;                                        // ≤ 1 per take
  st.markFired(id);
  await Notifications.scheduleNotificationAsync({ identifier: id, content: input(buildContent(cmp, p, lang)), trigger: null });
}
/** Director "Fire notification now": the latest planned notification at or before the current tick (false if none). */
export async function fireCurrentNow(lang: Lang, tick: number): Promise<boolean> {
  const st = useDemo.getState(); const plan = planNotifications(getCompiled(st.scenarioId)).filter((p) => p.t <= tick);
  const p = plan[plan.length - 1]; if (!p) return false;
  const id = requestId(st.scenarioId, p);
  if (st.firedIds.includes(id)) useDemo.setState({ firedIds: st.firedIds.filter((x) => x !== id) });   // explicit re-fire
  await postNow(p, lang); return true;
}
/** Foreground playback: fires each planned notification when the PLAYING clock crosses its tick (never on a seek). */
export function useNotificationPlayback(lang: Lang): void {
  const tick = useTick(); const last = useRef(tick);
  useEffect(() => {
    const prev = last.current; last.current = tick;
    const st = useDemo.getState();
    if (!st.clock.playing || tick <= prev || tick - prev > 10) return;         // seek or rewind → nothing fires
    for (const p of planNotifications(getCompiled(st.scenarioId)))
      if (p.t > prev && p.t <= tick) void postNow(p, lang);
  }, [tick, lang]);
}
/** Director → "Lock-screen take (8 s)" (§24.3, T06). JS is suspended while locked, so the OS must fire it. */
export async function armLockScreenTake(lang: Lang, leadS = 8): Promise<boolean> {
  const st = useDemo.getState(); const cmp = getCompiled(st.scenarioId);
  const p = planNotifications(cmp).find((x) => x.kind === 'risk' && x.state === 'avoid'); if (!p) return false;
  const take = lockScreenTake(cmp, p, lang, leadS);
  st.seek(take.seekToMin); st.pause();
  await Notifications.scheduleNotificationAsync({
    identifier: take.request.identifier,                                       // stable id → re-arming replaces, never stacks
    content: input(take.request.content),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: leadS, repeats: false },
  });
  st.arm({ notificationId: take.request.identifier, seekToMin: take.onResponse.seekToMin, route: take.onResponse.route });
  return true;
}
/** Tap on a demo notification → seek the ONE clock to the beat it announced, pause, open the crossing sheet. */
export function useDemoNotificationResponses(navigate: (path: string) => void): void {
  useEffect(() => {
    const handled = new Set<string>();
    const route = (resp: Notifications.NotificationResponse) => {
      const req = resp.notification.request; const key = req.identifier + resp.actionIdentifier;
      if (handled.has(key)) return; handled.add(key);
      const d = req.content.data as Partial<DemoNotificationContent['data']> | undefined;
      if (d?.demo !== true || typeof d.simMin !== 'number' || !d.crossing_id || !d.scenario) return;
      const st = useDemo.getState();
      if (st.scenarioId !== d.scenario) st.selectScenario(d.scenario);
      useDemo.getState().seek(d.simMin); useDemo.getState().pause(); useDemo.getState().arm(null);
      navigate(`/crossing/${d.crossing_id}`);
      Notifications.clearLastNotificationResponse();
    };
    const lastResp = Notifications.getLastNotificationResponse(); if (lastResp) route(lastResp);   // cold start
    const sub = Notifications.addNotificationResponseReceivedListener(route);
    return () => sub.remove();
  }, [navigate]);
}
/** Director [Reset] side effect: nothing pending, nothing left in Notification Center. */
export async function resetDemoNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
}
