import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Speech from 'expo-speech';
import { useFocusEffect } from 'expo-router';
import { AppState, View } from 'react-native';
import { AppText, Button, Eyebrow, Footer, Page, Title } from '@/components/fordcast/UI';
import DriverHudView from '@/components/DriverHudView';
import {
  crossings,
  initialLockoutState,
  replays,
  stateAt,
  stepLockout,
  type LockoutState,
} from '@/lib/data';
import { REASON_KEY, selectDriveTargets } from '@/lib/danger';
import { formatMiles } from '@/lib/geo';
import { useMonitorOptional, type DangerReason } from '@/lib/monitor-context';
import { usePreferences } from '@/lib/preferences';
import { theme as c } from '@/lib/theme';
import { getVoiceMuted, setVoiceMuted, speak, stopSpeaking } from '@/lib/voice';
import type { CrossingStateKey } from '@/theme/tokens';

function cancelSpeech() {
  stopSpeaking();
}

type RouteItem = {
  id: string;
  name: string;
  creek: string;
  state: CrossingStateKey;
  window: [number, number] | null;
  distanceLabel: string;
  reasons: DangerReason[];
  onActiveRoute: boolean;
  obsAgeMin: number | null;
  obsKind: 'closure' | 'sensor' | null;
};

const URGENCY: Record<CrossingStateKey, number> = { closed: 4, avoid: 3, watch: 2, unknown: 1, no_rise: 0 };

export default function Drive() {
  const { t, language, activeStormId, simDriveActive, setSimDriveActive } = usePreferences();
  const monitor = useMonitorOptional();

  // Simulation fallback (no live monitor): walk the replay's monitored crossings at its first alert.
  const replay = replays[activeStormId] ?? replays['halloween-2013']!;
  const peakSimT = useMemo(() => {
    const heroAlert = replay.hero?.first_alert_at;
    if (heroAlert) return Date.parse(heroAlert);
    const firstAvoid = replay.storyboard.find((s) => s.kind === 'first_avoid')?.t;
    if (firstAvoid) return Date.parse(firstAvoid);
    return Date.parse(replay.storm.start) + 6 * 3600_000;
  }, [replay]);

  const route = useMemo<RouteItem[]>(() => {
    if (monitor) {
      const activeCoords =
        monitor.mode === 'live' ? (monitor.routePlan?.route.coords ?? null) : null;
      const targets = selectDriveTargets(
        monitor.statuses,
        monitor.location,
        activeCoords,
        6,
      );
      const refNow =
        monitor.mode === 'drill'
          ? monitor.drill.simT
          : Math.max(monitor.nowMs ?? 0, monitor.liveFetchedAt ?? 0, monitor.latestObsAt ?? 0);
      return targets.map((item) => ({
        id: item.id,
        name: item.name,
        creek: item.creek || t('common.crossing'),
        state: item.state,
        window: item.window,
        distanceLabel: formatMiles(item.distanceKm),
        reasons: item.reasons,
        onActiveRoute: item.onActiveRoute,
        obsKind: item.obsKind,
        obsAgeMin:
          item.obsAt != null && refNow >= item.obsAt
            ? Math.max(0, Math.round((refNow - item.obsAt) / 60_000))
            : null,
      }));
    }
    return replay.crossings.map((rc, i) => {
      const full = crossings.find((f) => f.properties.id === rc.id);
      const slice = stateAt(replay, rc.id, peakSimT);
      return {
        id: rc.id,
        name: language === 'es' ? rc.name_es : rc.name,
        creek: full?.properties.creek ?? t('common.crossing'),
        state: slice.state,
        window: slice.window,
        distanceLabel: formatMiles(0.25 + i * 0.4),
        reasons: [],
        onActiveRoute: false,
        obsAgeMin: null,
        obsKind: null,
      };
    });
  }, [monitor, replay, language, peakSimT, t]);

  // Default to the first active-route hazard ahead when a trip is planned, else most urgent nearby crossing.
  const urgentIdx = useMemo(() => {
    if (!monitor) {
      const idx = route.findIndex((item) => item.id === (replay.hero?.crossing_id ?? 'atx-7'));
      return idx >= 0 ? idx : 0;
    }
    const firstRouteHazard = route.findIndex(
      (r) => r.onActiveRoute && (r.state === 'closed' || r.state === 'avoid'),
    );
    if (firstRouteHazard >= 0) return firstRouteHazard;
    const firstRouteCaution = route.findIndex((r) => r.onActiveRoute && r.state !== 'no_rise');
    if (firstRouteCaution >= 0) return firstRouteCaution;
    let best = 0;
    route.forEach((r, i) => {
      if (URGENCY[r.state] > URGENCY[route[best]!.state]) best = i;
    });
    return best;
  }, [route, monitor, replay.hero]);

  const [crossingIdx, setCrossingIdx] = useState<number | null>(null);
  const [localMuted, setLocalMuted] = useState(() => getVoiceMuted());
  const muted = monitor ? !monitor.settings.voiceAlerts : localMuted;
  const [voiceError, setVoiceError] = useState(false);
  const [simMph, setSimMph] = useState(0);
  const [lockout, setLockout] = useState<LockoutState>(initialLockoutState);

  const effectiveIdx = crossingIdx !== null && crossingIdx < route.length ? crossingIdx : urgentIdx;
  const currentItem: RouteItem = route[effectiveIdx] ??
    route[0] ?? {
      id: 'none',
      name: t('common.crossing'),
      creek: '',
      state: 'unknown',
      window: null,
      distanceLabel: '—',
      reasons: [],
      onActiveRoute: false,
      obsAgeMin: null,
      obsKind: null,
    };
  const stateKey = currentItem.state;
  const win = currentItem.window;

  const sourceReason = useMemo(() => {
    const primaryReason = currentItem.reasons[0];
    if (primaryReason) {
      const reasonText = t(REASON_KEY[primaryReason]);
      let ageSuffix = '';
      const atxCheckedAt = monitor?.feeds.atx.at ?? null;
      const nowRef = monitor?.nowMs ?? monitor?.liveFetchedAt ?? 0;
      const atxCheckAgeMin =
        atxCheckedAt != null && nowRef >= atxCheckedAt
          ? Math.max(0, Math.round((nowRef - atxCheckedAt) / 60_000))
          : null;
      const atxFresh = Boolean(
        monitor?.feeds.atx.ok && atxCheckAgeMin != null && atxCheckAgeMin <= 15,
      );
      if (currentItem.obsKind === 'closure') {
        if (currentItem.obsAgeMin != null && currentItem.obsAgeMin <= 180) {
          if (monitor && monitor.feeds.atx.ok === false) {
            ageSuffix =
              language === 'es'
                ? ` · cierre actualizado hace ${currentItem.obsAgeMin} min (fuente sin conexión)`
                : ` · closure updated ${currentItem.obsAgeMin}m ago (feed offline)`;
          } else {
            ageSuffix =
              language === 'es'
                ? ` · cierre actualizado hace ${currentItem.obsAgeMin} min`
                : ` · closure updated ${currentItem.obsAgeMin}m ago`;
          }
        } else if (atxFresh && atxCheckAgeMin != null) {
          ageSuffix =
            language === 'es'
              ? ` · cierre comprobado hace ${atxCheckAgeMin} min`
              : ` · closure checked ${atxCheckAgeMin}m ago`;
        } else {
          ageSuffix =
            language === 'es'
              ? ' · cierre oficial en caché (fuente sin conexión)'
              : ' · cached official closure (feed offline)';
        }
      } else if (currentItem.obsAgeMin != null) {
        ageSuffix =
          language === 'es'
            ? ` · lectura hace ${currentItem.obsAgeMin} min`
            : ` · reading ${currentItem.obsAgeMin}m ago`;
      }
      return `${reasonText}${ageSuffix}`;
    }
    return undefined;
  }, [currentItem.reasons, currentItem.obsAgeMin, currentItem.obsKind, monitor, t, language]);

  const spokenText = useMemo(() => {
    const prefix = monitor?.mode === 'drill' ? `${t('alert.drill_prefix')} · ` : '';
    const primaryReason = currentItem.reasons[0];
    const reasonClause = primaryReason ? `${t(REASON_KEY[primaryReason])}. ` : '';
    const base = `${prefix}${t('drive.voice_context')} ${currentItem.name}. ${reasonClause}${t(`state.${stateKey}_spoken`)}`;
    if (win) {
      return `${base} ${win[0] === 0 ? `${t('state.now')}. ` : ''}${t('state.range_spoken', { lo: win[0], hi: win[1] })}. ${t('drive.tadd')}`;
    }
    return `${base} ${t('drive.tadd')}`;
  }, [monitor?.mode, currentItem.name, currentItem.reasons, stateKey, win, t]);

  const speakAlert = useCallback(
    (text: string) => {
      if (muted || !simDriveActive) return;
      setVoiceError(false);
      try {
        cancelSpeech();
        if (monitor) {
          speak(text, language, { force: true });
        } else {
          Speech.speak(text, {
            language: language === 'es' ? 'es-MX' : 'en-US',
            rate: 0.95,
            onError: () => setVoiceError(true),
          });
        }
      } catch {
        setVoiceError(true);
      }
    },
    [muted, language, simDriveActive, monitor],
  );

  useFocusEffect(useCallback(() => cancelSpeech, []));
  useEffect(() => {
    cancelSpeech();
    return cancelSpeech;
  }, [activeStormId, language, simDriveActive]);

  // Speak automatically when drive mode starts and whenever the crossing or its status changes.
  useEffect(() => {
    if (!simDriveActive || !monitor) return;
    const id = setTimeout(() => speakAlert(spokenText), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simDriveActive, currentItem.id, stateKey, win?.[0], language]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        cancelSpeech();
        setSimDriveActive(false);
      }
    });
    return () => sub.remove();
  }, [setSimDriveActive]);

  // Real driving lockout from GPS speed.
  const gpsSpeed = monitor?.speedMps ?? null;
  useEffect(() => {
    if (gpsSpeed == null) return;
    const id = setTimeout(
      () => setLockout((prev) => stepLockout(prev, { tMs: Date.now(), speedMps: gpsSpeed })),
      0,
    );
    return () => clearTimeout(id);
  }, [gpsSpeed]);

  const stopSimulation = () => {
    cancelSpeech();
    setSimDriveActive(false);
    setCrossingIdx(null);
    setSimMph(0);
    setLockout(initialLockoutState);
  };

  const toggleSimulatedSpeed = () => {
    const nextMph = simMph === 0 ? 25 : 0;
    setSimMph(nextMph);
    const speedMps = nextMph * 0.44704;
    const s1 = stepLockout({ ...lockout, passengerOverride: false }, { tMs: 1000, speedMps });
    const s2 = stepLockout(s1, { tMs: nextMph > 15 ? 12_000 : 35_000, speedMps });
    setLockout(s2);
  };

  const badgeLabel = !monitor
    ? t('drive.badge_sim')
    : monitor.mode === 'drill'
      ? t('drive.badge_drill')
      : currentItem.onActiveRoute
        ? `${t('drive.badge_live')} · ROUTE`
        : t('drive.badge_live');

  if (!simDriveActive) {
    return (
      <Page>
        <Eyebrow color={c.link}>{t('drive.eyebrow')}</Eyebrow>
        <Title>{t('drive.ready_title')}</Title>
        <AppText>{t('drive.ready_body')}</AppText>
        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
            padding: 14,
            gap: 6,
          }}
        >
          <AppText style={{ fontFamily: 'Inter_600SemiBold' }}>{t('drive.stopped')}</AppText>
          <AppText style={{ color: c.muted }}>{t('drive.stopped_body')}</AppText>
        </View>
        <Button title={t('drive.action')} onPress={() => setSimDriveActive(true)} />
        <AppText style={{ color: c.subtle, fontSize: 13 }}>{t('drive.tips')}</AppText>
        <Footer />
      </Page>
    );
  }

  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#070B12' }}>
      {voiceError && (
        <AppText accessibilityRole="alert" style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          {t('drive.voice_error')}
        </AppText>
      )}
      <DriverHudView
        crossingName={currentItem.name}
        creekName={currentItem.creek}
        distanceLabel={currentItem.distanceLabel}
        badgeLabel={badgeLabel}
        state={stateKey}
        window={win}
        spokenText={spokenText}
        sourceReason={sourceReason}
        muted={muted}
        lockoutLocked={lockout.locked}
        simMph={simMph}
        onRepeatVoice={() => speakAlert(spokenText)}
        onToggleMute={() => {
          const nextMuted = !muted;
          setLocalMuted(nextMuted);
          setVoiceMuted(nextMuted);
          if (monitor) monitor.updateSettings({ voiceAlerts: !nextMuted });
          if (nextMuted) cancelSpeech();
        }}
        onExitHud={stopSimulation}
        onPrevCrossing={
          route.length > 1
            ? () => setCrossingIdx((effectiveIdx - 1 + route.length) % route.length)
            : undefined
        }
        onNextCrossing={
          route.length > 1 ? () => setCrossingIdx((effectiveIdx + 1) % route.length) : undefined
        }
        onToggleSpeedSim={monitor ? undefined : toggleSimulatedSpeed}
        onPassengerOverride={() =>
          setLockout((prev) => ({ ...prev, locked: false, passengerOverride: true }))
        }
      />
    </View>
  );
}
