// mobile/src/demo/voice/speak.ts — chime → TTS → haptic for one Drive Mode utterance (D §30.7–§30.8).
// expo-audio 57.0.5 (chimes, ducking) + expo-speech 57.0.3. Only *.tts / drive.tts.* keys are ever spoken.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { CROSSINGS } from '../data/demo-data';
import type { Utterance } from '../drive/drive';
import { tr, type Lang } from '../i18n/tr';
import { safetyHaptic } from './haptics';

let chime: AudioPlayer | null = null; let chimeSoft: AudioPlayer | null = null;
/** Call when Drive Mode starts. Sources come from the caller: require('@/assets/sounds/chime.wav') etc. */
export async function prepareVoice(src: { chime: number; chimeSoft: number }): Promise<void> {
  await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
  chime ??= createAudioPlayer(src.chime); chimeSoft ??= createAudioPlayer(src.chimeSoft);
}
const voiceCache: Partial<Record<Lang, string | null>> = {};
export async function pickVoice(lang: Lang): Promise<string | undefined> {   // never hard-code voice names
  const hit = voiceCache[lang]; if (hit !== undefined) return hit ?? undefined;
  const voices = await Speech.getAvailableVoicesAsync();
  const prefs = lang === 'es' ? ['es-US', 'es-MX', 'es-419', 'es'] : ['en-US', 'en'];
  for (const p of prefs) {
    const v = voices.filter((x) => x.language?.startsWith(p))
      .sort((a, b) => Number(b.quality === Speech.VoiceQuality.Enhanced) - Number(a.quality === Speech.VoiceQuality.Enhanced))[0];
    if (v) { voiceCache[lang] = v.identifier; return v.identifier; }
  }
  voiceCache[lang] = null; return undefined;
}
export const clearVoiceCache = () => { delete voiceCache.en; delete voiceCache.es; };
const spokenName = (id: string, lang: Lang) => { const c = CROSSINGS.find((x) => x.id === id); return c?.spoken?.[lang] ?? c?.name ?? id; };
export const utteranceText = (u: Utterance, lang: Lang) =>
  u.lines.map((l) => tr(lang, l.key, { ...(l.count != null ? { count: l.count } : {}), name: l.crossingId ? spokenName(l.crossingId, lang) : '' })).join(' ');

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
let muted = false; let lastText: { text: string; lang: Lang } | null = null;
export const setMuted = (m: boolean) => { muted = m; if (m) void Speech.stop(); };
/** Plays one utterance. Priority 2 pre-empts. Mute keeps chime + haptic (never one channel only). */
export async function playUtterance(u: Utterance, lang: Lang, rate = 0.95): Promise<void> {
  if (u.priority === 2) await Speech.stop();
  const player = u.chime === 'chime' ? chime : u.chime === 'chime_soft' ? chimeSoft : null;
  if (player) { void player.seekTo(0); player.play(); }
  if (u.haptic) safetyHaptic(u.haptic === 'error' ? 'avoid' : u.haptic === 'warning' ? 'watch' : u.haptic === 'soft' ? 'unknown' : 'deescalate');
  await sleep(u.chime === 'chime' ? 650 : u.chime === 'chime_soft' ? 450 : 300);   // chime end + 150 ms (§15 choreography)
  const text = utteranceText(u, lang); lastText = { text, lang };
  if (muted) return;
  Speech.speak(text, { language: lang === 'es' ? 'es-US' : 'en-US', voice: await pickVoice(lang), rate, pitch: 1.0,
    useApplicationAudioSession: true });
}
/** [Repeat] button + VoiceOver magic tap in Drive Mode. */
export async function repeatLast(rate = 0.95): Promise<void> {
  if (!lastText || muted) return;
  await Speech.stop();
  Speech.speak(lastText.text, { language: lastText.lang === 'es' ? 'es-US' : 'en-US', voice: await pickVoice(lastText.lang), rate,
    useApplicationAudioSession: true });
}
