// mobile/src/demo/voice/haptics.ts — semantic haptics (A §3.13). Two gates: safety cues ≤ 1 per 1.5 s; UI micro-haptics
// ≤ 1 per 60 ms and muted for 400 ms after a safety cue. NEVER NotificationFeedbackType.Success (copy/code guard, A §3.12).
import * as Haptics from 'expo-haptics';
import { useDemo } from '../store/demo-store';

export type SafetyCue = 'watch' | 'avoid' | 'closed' | 'unknown' | 'deescalate';
let lastSafety = -1e9; let lastUi = -1e9;
export function safetyHaptic(cue: SafetyCue, nowMs = Date.now()): boolean {
  if (!useDemo.getState().haptics || nowMs - lastSafety < 1500) return false;
  lastSafety = nowMs;
  if (cue === 'watch') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else if (cue === 'avoid' || cue === 'closed') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  else if (cue === 'unknown') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
  else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  return true;
}
export function uiHaptic(kind: 'select' | 'light' | 'medium', nowMs = Date.now()): void {
  if (!useDemo.getState().haptics || nowMs - lastUi < 60 || nowMs - lastSafety < 400) return;
  lastUi = nowMs;
  if (kind === 'select') void Haptics.selectionAsync();
  else void Haptics.impactAsync(kind === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
}
