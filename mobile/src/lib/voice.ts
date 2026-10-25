/**
 * Studio-quality Neural Voice Engine for FordCast.
 * Combines:
 *   1. Bundled open/neural TTS voice packs (Ava Warm Neural, Andrew Calm Dispatch, Aria Broadcast, Dalia ES)
 *   2. Soft Web Audio API two-tone navigation chime before alerts
 *   3. Live neural TTS audio stream fallback + rate limiting (11s cooldown for background alerts)
 */
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import neuralClipsDoc from '../../assets/voice/neural_clips.json';
import { storage } from './storage';

export type VoicePersonaId = 'ava' | 'andrew' | 'aria';

export const VOICE_PERSONAS: { id: VoicePersonaId; label: string; detail: string }[] = [
  { id: 'ava', label: 'Ava (Warm Neural)', detail: 'Natural conversational voice' },
  { id: 'andrew', label: 'Andrew (Calm Dispatch)', detail: 'Steady lower-register voice' },
  { id: 'aria', label: 'Aria (Clear Broadcast)', detail: 'Crisp navigation voice' },
];

const PERSONA_STORAGE_KEY = 'fordcast.voice_persona.v1';
let currentPersona: VoicePersonaId = 'ava';
const personaListeners = new Set<(p: VoicePersonaId) => void>();

storage
  .get(PERSONA_STORAGE_KEY)
  .then((raw) => {
    if (raw === 'ava' || raw === 'andrew' || raw === 'aria') {
      currentPersona = raw;
      personaListeners.forEach((fn) => fn(currentPersona));
    }
  })
  .catch(() => {});

export function getVoicePersona(): VoicePersonaId {
  return currentPersona;
}

export function setVoicePersona(persona: VoicePersonaId): void {
  currentPersona = persona;
  personaListeners.forEach((fn) => fn(persona));
  storage.set(PERSONA_STORAGE_KEY, persona).catch(() => {});
}

export function subscribeVoicePersona(listener: (p: VoicePersonaId) => void): () => void {
  personaListeners.add(listener);
  return () => {
    personaListeners.delete(listener);
  };
}

const neuralClips = (
  neuralClipsDoc as {
    personas: Record<'ava' | 'andrew' | 'aria' | 'es', Record<string, string>>;
  }
).personas;

let audioReady = false;
let lastAutoSpokenAt = 0;
let activeHtmlAudio: HTMLAudioElement | null = null;
let speechSessionId = 0;
let voiceMuted = false;
let currentlySpeaking = false;
const statusListeners = new Set<(speaking: boolean) => void>();
const AUTO_COOLDOWN_MS = 11_000;

function notifySpeaking(speaking: boolean): void {
  currentlySpeaking = speaking;
  statusListeners.forEach((fn) => fn(speaking));
}

export function isCurrentlySpeaking(): boolean {
  return currentlySpeaking;
}

export function subscribeVoiceStatus(listener: (speaking: boolean) => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

export function setVoiceMuted(muted: boolean): void {
  voiceMuted = muted;
  if (muted) stopSpeaking();
}

export function getVoiceMuted(): boolean {
  return voiceMuted;
}

let audioPreparation: Promise<void> | null = null;

export function prepareAudio(): Promise<void> {
  if (audioReady || Platform.OS === 'web') return Promise.resolve();
  if (audioPreparation) return audioPreparation;
  audioPreparation = (async () => {
    try {
      const { setAudioModeAsync } = await import('expo-audio');
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      audioReady = true;
    } catch {
      // Non-fatal in Expo Go / simulators without audio hardware.
    } finally {
      audioPreparation = null;
    }
  })();
  return audioPreparation;
}

/** Plays a soft, warm two-tone cockpit navigation chime before voice alerts on Web. */
function playSoftChime(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [528, 660];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      gain.gain.setValueAtTime(0.001, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.06, now + idx * 0.11 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.11 + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.28);
    });
    setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 700);
  } catch {
    // Ignore if AudioContext is blocked prior to user gesture.
  }
}

/** Converts technical abbreviations and symbols into natural spoken words while preserving simulation context. */
export function cleanForSpeech(raw: string, language: 'en' | 'es'): string {
  const s = raw
    .replace(
      /^(DRILL|SIMULACRO|SIMULATION)\s*[·.:-]?\s*/i,
      language === 'es' ? 'Simulacro: ' : 'Simulation: ',
    )
    .replace(/\s*@\s*/g, language === 'es' ? ' en ' : ' at ')
    .replace(/\(W\)/gi, language === 'es' ? 'Oeste' : 'West')
    .replace(/\(E\)/gi, language === 'es' ? 'Este' : 'East')
    .replace(/\(N\)/gi, language === 'es' ? 'Norte' : 'North')
    .replace(/\(S\)/gi, language === 'es' ? 'Sur' : 'South')
    .replace(/\bCk\b/gi, 'Creek')
    .replace(/\bBlvd\b/gi, 'Boulevard')
    .replace(/\bRd\b/gi, 'Road')
    .replace(/\bDr\b/gi, 'Drive')
    .replace(/\bLn\b/gi, 'Lane')
    .replace(/\bPkwy\b/gi, 'Parkway')
    .replace(/\bHwy\b/gi, 'Highway')
    .replace(/\bnr\b/gi, language === 'es' ? 'cerca de' : 'near')
    .replace(
      /(\d+)\s*[–-]\s*(\d+)\s*min\b/gi,
      language === 'es' ? '$1 a $2 minutos' : '$1 to $2 minutes',
    )
    .replace(/\b(\d+(?:\.\d+)?)\s*mi\b/gi, language === 'es' ? '$1 millas' : '$1 miles')
    .replace(/\b(\d+)\s*min\b/gi, language === 'es' ? '$1 minutos' : '$1 minutes')
    .replace(/[·—–]/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return s;
}

/** Resolves a bundled neural clip key ONLY from an explicit key or exact non-hazard test phrase (never by road-name guessing). */
function resolveClipKey(text: string, explicitKey?: string): string | null {
  if (explicitKey) return explicitKey;
  const lower = text.toLowerCase();
  if (lower.includes('voice warnings are') || lower.includes('avisos de voz')) return 'voice_test';
  if (lower.includes('only a test') || lower.includes('solo una prueba')) return 'test_alert';
  if (lower === 'you have arrived.' || lower === 'ha llegado.') return 'arrived';
  if (lower.includes('test flooded crossing') || lower.includes('cruce inundado de prueba'))
    return 'sim_route';
  return null;
}

function pickBestWebSpeechVoice(
  language: 'en' | 'es',
  persona: VoicePersonaId,
): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const prefix = language === 'es' ? 'es' : 'en';
  const candidates = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  const pool = candidates.length ? candidates : voices;

  const preferredKeywords =
    language === 'es'
      ? ['Dalia', 'Sabina', 'Paulina', 'Monica', 'Natural', 'Google']
      : persona === 'andrew'
        ? ['Andrew', 'Christopher', 'Guy', 'Daniel', 'Natural', 'Google US English']
        : persona === 'aria'
          ? ['Aria', 'Jenny', 'Samantha', 'Natural', 'Google US English']
          : ['Ava', 'Aria', 'Samantha', 'Natural', 'Google US English', 'Zira'];

  const scored = pool
    .map((v) => {
      const name = v.name;
      let score = 0;
      if (/Natural|Neural|Online/i.test(name)) score += 60;
      for (let i = 0; i < preferredKeywords.length; i++) {
        if (name.includes(preferredKeywords[i]!)) {
          score += 45 - i * 4;
          break;
        }
      }
      if (v.lang === (language === 'es' ? 'es-MX' : 'en-US')) score += 10;
      return { v, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.v ?? null;
}

function fallbackSpeechSynthesis(
  cleaned: string,
  language: 'en' | 'es',
  sessionId: number,
  allowWhenMuted = false,
): void {
  if (sessionId !== speechSessionId || (voiceMuted && !allowWhenMuted)) return;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(cleaned);
      u.lang = language === 'es' ? 'es-MX' : 'en-US';
      u.rate = 0.96;
      u.pitch = currentPersona === 'andrew' ? 0.92 : 1.0;
      const best = pickBestWebSpeechVoice(language, currentPersona);
      if (best) u.voice = best;
      u.onend = () => {
        if (sessionId === speechSessionId) notifySpeaking(false);
      };
      u.onerror = () => {
        if (sessionId === speechSessionId) notifySpeaking(false);
      };
      notifySpeaking(true);
      window.speechSynthesis.speak(u);
      return;
    } catch {
      // Fall through to expo-speech
    }
  }
  try {
    Speech.stop();
    notifySpeaking(true);
    Speech.speak(cleaned, {
      language: language === 'es' ? 'es-MX' : 'en-US',
      rate: 0.95,
      pitch: currentPersona === 'andrew' ? 0.92 : 0.98,
      onDone: () => {
        if (sessionId === speechSessionId) notifySpeaking(false);
      },
      onStopped: () => {
        if (sessionId === speechSessionId) notifySpeaking(false);
      },
      onError: () => {
        if (sessionId === speechSessionId) notifySpeaking(false);
      },
    });
  } catch {
    notifySpeaking(false);
  }
}

export type SpeakOptions = {
  /** Set true when triggered directly by a user action or critical reroute to bypass cooldown. */
  force?: boolean;
  /** Set true only when an explicit 'Test Voice' button should play even if voice alerts were muted. */
  allowWhenMuted?: boolean;
  /** Optional key into the pre-generated studio neural clip bank. */
  clipKey?: string;
};

export function speak(text: string, language: 'en' | 'es', opts?: SpeakOptions): void {
  if (voiceMuted && !opts?.allowWhenMuted) return;
  const now = Date.now();
  if (!opts?.force && now - lastAutoSpokenAt < AUTO_COOLDOWN_MS) {
    return;
  }
  lastAutoSpokenAt = now;

  const cleaned = cleanForSpeech(text, language);
  if (!cleaned) return;

  stopSpeaking();
  const mySession = ++speechSessionId;
  playSoftChime();

  const isSimulationPhrase = /^(DRILL|SIMULACRO|SIMULATION)\b/i.test(text.trim());
  const clipKey = isSimulationPhrase ? null : resolveClipKey(text, opts?.clipKey);
  const bank = language === 'es' ? neuralClips.es : neuralClips[currentPersona];
  const dataUri = clipKey ? bank?.[clipKey] : undefined;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof Audio !== 'undefined') {
    if (dataUri) {
      try {
        const audio = new Audio(dataUri);
        activeHtmlAudio = audio;
        notifySpeaking(true);
        audio.onended = () => {
          if (mySession === speechSessionId) notifySpeaking(false);
        };
        audio.play().catch(() => {
          if (mySession === speechSessionId && (!voiceMuted || !!opts?.allowWhenMuted)) {
            fallbackSpeechSynthesis(cleaned, language, mySession, !!opts?.allowWhenMuted);
          }
        });
        return;
      } catch {
        // Fall through
      }
    }

    // For dynamic live phrases on Web: check if the browser has a built-in Neural/Natural voice,
    // or if the phrase exceeds the 190-character streaming limit so we never truncate the action at the end.
    const bestVoice = pickBestWebSpeechVoice(language, currentPersona);
    if (
      cleaned.length > 185 ||
      (bestVoice && /Natural|Neural|Online|Samantha|Ava|Andrew|Aria/i.test(bestVoice.name))
    ) {
      fallbackSpeechSynthesis(cleaned, language, mySession, !!opts?.allowWhenMuted);
      return;
    }

    try {
      const tl = language === 'es' ? 'es-MX' : 'en-US';
      const streamUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&q=${encodeURIComponent(
        cleaned,
      )}`;
      const audio = new Audio(streamUrl);
      activeHtmlAudio = audio;
      notifySpeaking(true);
      audio.onended = () => {
        if (mySession === speechSessionId) notifySpeaking(false);
      };
      audio.play().catch(() => {
        if (mySession === speechSessionId && (!voiceMuted || !!opts?.allowWhenMuted)) {
          fallbackSpeechSynthesis(cleaned, language, mySession, !!opts?.allowWhenMuted);
        }
      });
      return;
    } catch {
      // Fall through
    }
  }

  void prepareAudio()
    .then(() => {
      fallbackSpeechSynthesis(cleaned, language, mySession, !!opts?.allowWhenMuted);
    })
    .catch(() => {
      if (mySession === speechSessionId) notifySpeaking(false);
    });
}

export function stopSpeaking(): void {
  speechSessionId += 1;
  notifySpeaking(false);
  if (activeHtmlAudio) {
    try {
      activeHtmlAudio.pause();
      activeHtmlAudio.currentTime = 0;
    } catch {}
    activeHtmlAudio = null;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  try {
    Speech.stop();
  } catch {}
}
