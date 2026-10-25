import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Speech from 'expo-speech';
import { router, useFocusEffect } from 'expo-router';
import {
  AppState,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import ArrivalBucketStrip from '@/components/ArrivalBucketStrip';
import CausalHydrograph from '@/components/CausalHydrograph';
import { AppText, Button, Chip, Dip, Footer, styles, type State } from '@/components/fordcast/UI';
import ProvenanceCard, { CorridorPropagationBar } from '@/components/ProvenanceCard';
import StateBadge, { StateGlyphSvg } from '@/components/StateBadge';
import ValidationScorecardModal from '@/components/ValidationScorecardModal';
import CrossingRow from '@/features/map/CrossingRow';
import MapSurface from '@/features/map/MapSurface';
import {
  activePulsesAt,
  crossings,
  links,
  replayIndex,
  replays,
  results,
  stateAt,
  visibleSamples,
} from '@/lib/data';
import { usePreferences } from '@/lib/preferences';
import { gaugeInterruptionActive, replayStepInterval } from '@/lib/replay-controls';
import {
  HYDROGRAPH_TOKENS,
  LOCKED_STATE_HEX,
  SURFACES,
  TYPOGRAPHY,
} from '@/theme/tokens';

type FilterMode = 'all' | 'monitored' | 'tier_a' | 'tier_b' | 'saved';
type MobileSnapPoint = 'collapsed' | 'half' | 'full' | 'directory';
const SPEEDS = [1, 10, 30, 60, 120] as const;

export default function CockpitScreen({
  initialSelectedCrossingId = 'atx-19',
  mode = 'map',
}: {
  initialSelectedCrossingId?: string;
  mode?: 'map' | 'replay';
}) {
  const { width } = useWindowDimensions();
  const isDesktopCockpit = width >= 1024;

  const {
    t,
    language,
    setLanguage,
    saved,
    toggleSaved,
    watchIds,
    toggleWatch,
    activeStormId,
    setActiveStormId,
    setSimDriveActive,
    triggerSampleReplay,
  } = usePreferences();

  const replay = replays[activeStormId] ?? replays['halloween-2013']!;
  const startMs = Date.parse(replay.storm.start);
  const endMs = Date.parse(replay.storm.end);
  const stepMs = replay.step_s * 1000;
  const totalSteps = Math.floor((endMs - startMs) / stepMs) + 1;

  const initialStep = useMemo(() => {
    const firstSb = replay.storyboard[0]?.t;
    if (!firstSb) return 0;
    return Math.max(
      0,
      Math.min(totalSteps - 1, Math.round((Date.parse(firstSb) - startMs) / stepMs)),
    );
  }, [replay, startMs, stepMs, totalSteps]);

  const [stepIdx, setStepIdx] = useState(initialStep);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(60);
  const [selectedCrossingId, setSelectedCrossingId] = useState<string>(
    replay.hero?.crossing_id ?? initialSelectedCrossingId,
  );
  const [selectedGaugeId, setSelectedGaugeId] = useState<string>(
    replay.gauges.find((g) => g.id === 'USGS-08158840')?.id ?? replay.gauges[0]?.id ?? '',
  );
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('monitored');
  const [mobileSnap, setMobileSnap] = useState<MobileSnapPoint>(
    mode === 'replay' ? 'full' : 'half',
  );
  const [showTable, setShowTable] = useState(false);
  const [showScorecardModal, setShowScorecardModal] = useState(false);

  useFocusEffect(useCallback(() => () => setPlaying(false), []));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setPlaying(false);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const intervalMs = replayStepInterval(replay.step_s, speed);
    const timer = setTimeout(() => {
      if (stepIdx >= totalSteps - 2) setPlaying(false);
      setStepIdx((i) => Math.min(totalSteps - 1, i + 1));
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [playing, stepIdx, totalSteps, speed, replay.step_s]);

  const clampedStepIdx = Math.min(totalSteps - 1, Math.max(0, stepIdx));
  const simT = startMs + clampedStepIdx * stepMs;
  const wireT = Math.max(startMs, simT - (replay.assumptions.default_delay_min ?? 60) * 60_000);

  const selectedCrossing = useMemo(
    () =>
      crossings.find((c) => c.properties.id === selectedCrossingId) ??
      crossings.find((c) => c.properties.id === 'atx-7') ??
      crossings[0]!,
    [selectedCrossingId],
  );
  const selectedCrossingSlice = useMemo(
    () => stateAt(replay, selectedCrossing.properties.id, simT),
    [replay, selectedCrossing.properties.id, simT],
  );

  const crossingLinks = useMemo(
    () => links.filter((l) => l.crossing_id === selectedCrossing.properties.id),
    [selectedCrossing.properties.id],
  );
  const upstreamGaugeId = crossingLinks[0]?.gauge_id ?? selectedGaugeId;
  const downstreamGaugeId =
    selectedCrossing.properties.target_gauge_id ?? 'USGS-08159000';

  const selectedGauge =
    replay.gauges.find((g) => g.id === selectedGaugeId) ?? replay.gauges[0]!;
  const upstreamGauge =
    replay.gauges.find((g) => g.id === upstreamGaugeId) ?? selectedGauge;
  const downstreamGauge =
    replay.gauges.find((g) => g.id === downstreamGaugeId) ?? selectedGauge;

  const upSamples = useMemo(() => visibleSamples(upstreamGauge, simT), [upstreamGauge, simT]);
  const dnSamples = useMemo(() => visibleSamples(downstreamGauge, simT), [downstreamGauge, simT]);
  const gaugeSamples = useMemo(() => visibleSamples(selectedGauge, simT), [selectedGauge, simT]);
  const pulses = useMemo(() => activePulsesAt(replay, simT), [replay, simT]);

  const upValid = upSamples.filter((s): s is typeof s & { stageFt: number } => s.stageFt !== null);
  const dnValid = dnSamples.filter((s): s is typeof s & { stageFt: number } => s.stageFt !== null);
  const latestUp = upValid[upValid.length - 1] ?? null;
  const prevUp = upValid.length >= 2 ? upValid[upValid.length - 2]! : null;
  const upSlopeFtHr =
    latestUp && prevUp && latestUp.t > prevUp.t
      ? ((latestUp.stageFt - prevUp.stageFt) / (latestUp.t - prevUp.t)) * 3600_000
      : null;
  const latestDn = dnValid[dnValid.length - 1] ?? null;
  const isGaugeInOutage = gaugeInterruptionActive(selectedGauge, simT);

  const filteredCrossings = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return crossings
      .filter((f) => {
        const p = f.properties;
        if (filterMode === 'monitored' && p.tier !== 'A' && p.tier !== 'B') return false;
        if (filterMode === 'tier_a' && p.tier !== 'A') return false;
        if (filterMode === 'tier_b' && p.tier !== 'B') return false;
        if (filterMode === 'saved' && !saved.includes(p.id)) return false;
        if (!q) return true;
        const hay = `${p.name} ${p.road ?? ''} ${p.creek ?? ''}`.toLocaleLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const rankTier = { A: 0, B: 1, C: 2 } as Record<string, number>;
        const diff = (rankTier[a.properties.tier] ?? 2) - (rankTier[b.properties.tier] ?? 2);
        return diff !== 0 ? diff : a.properties.name.localeCompare(b.properties.name);
      });
  }, [query, filterMode, saved]);

  const crossingSlices = useMemo(
    () =>
      replay.crossings
        .map((cr) => ({ meta: cr, slice: stateAt(replay, cr.id, simT) }))
        .sort((a, b) => {
          const rankOrder: Record<State, number> = {
            closed: 0,
            avoid: 1,
            watch: 2,
            unknown: 3,
            no_rise: 4,
          };
          const d = (rankOrder[a.slice.state] ?? 4) - (rankOrder[b.slice.state] ?? 4);
          return d !== 0 ? d : a.meta.id.localeCompare(b.meta.id);
        }),
    [replay, simT],
  );

  const summaryCounts = useMemo(() => {
    let avoidCount = 0;
    let watchCount = 0;
    let unknownCount = 0;
    for (const item of crossingSlices) {
      if (item.slice.state === 'avoid' || item.slice.state === 'closed') avoidCount += 1;
      else if (item.slice.state === 'watch') watchCount += 1;
      else if (item.slice.state === 'unknown') unknownCount += 1;
    }
    return { avoidCount, watchCount, unknownCount };
  }, [crossingSlices]);

  const eventSteps = useMemo(() => {
    const set = new Set<number>();
    for (const s of replay.storyboard) {
      set.add(
        Math.max(0, Math.min(totalSteps - 1, Math.round((Date.parse(s.t) - startMs) / stepMs))),
      );
    }
    for (const ev of replay.events) {
      if (ev.state === 'avoid' || ev.state === 'unknown') {
        set.add(
          Math.max(0, Math.min(totalSteps - 1, Math.round((Date.parse(ev.t) - startMs) / stepMs))),
        );
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [replay, startMs, stepMs, totalSteps]);

  const stamp = (msOrIso: number | string) =>
    new Date(msOrIso).toLocaleString(language === 'es' ? 'es-US' : 'en-US', {
      timeZone: 'America/Chicago',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const shortClock = (ms: number) =>
    new Date(ms).toLocaleTimeString(language === 'es' ? 'es-US' : 'en-US', {
      timeZone: 'America/Chicago',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const speakCrossingSummary = () => {
    const st = selectedCrossingSlice.state;
    const win = selectedCrossingSlice.window;
    const text = `${t('drive.voice_context')} ${selectedCrossing.properties.name}. ${t(
      `state.${st}_spoken`,
    )}${
      win
        ? ` ${win[0] === 0 ? `${t('state.now')}. ` : ''}${t('state.range_spoken', {
            lo: win[0],
            hi: win[1],
          })}.`
        : ''
    }`;
    try {
      void Promise.resolve(Speech.stop()).catch(() => {});
      Speech.speak(text, {
        language: language === 'es' ? 'es-MX' : 'en-US',
        rate: 0.96,
      });
    } catch {
      // Safe fallback when speech is unavailable
    }
  };

  const stepByMinutes = (deltaMinutes: number) => {
    setPlaying(false);
    const deltaSteps = Math.max(1, Math.round((Math.abs(deltaMinutes) * 60) / replay.step_s));
    setStepIdx((i) =>
      deltaMinutes < 0
        ? Math.max(0, i - deltaSteps)
        : Math.min(totalSteps - 1, i + deltaSteps),
    );
  };

  const progressPct = totalSteps > 1 ? (clampedStepIdx / (totalSteps - 1)) * 100 : 0;
  const latencyPct = Math.min(
    progressPct,
    ((replay.assumptions.default_delay_min * 60_000) / Math.max(1, endMs - startMs)) * 100,
  );
  const pooledUp = results.methods.upstream_rule.avoid.pooled;

  // Shared Inspector Content (mounted in Right Column on Desktop >=1024px, or inside Z-Plane 2 Bottom Sheet on Mobile <1024px)
  const renderCrossingInspector = (expandLevel: 'half' | 'full') => {
    const p = selectedCrossing.properties;
    const isSaved = saved.includes(p.id);
    const isWatchOn = watchIds.includes(p.id);
    const isUnmonitored = p.tier === 'C' && selectedCrossingSlice.state === 'unknown';

    return (
      <View testID="crossing-inspector-sheet" style={{ gap: 12 }}>
        {/* 1. Sheet Header & Triple-Redundancy Banner (minHeight: 84dp) */}
        <View
          style={{
            minHeight: 84,
            backgroundColor: SURFACES.dark.elevated1,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: SURFACES.dark.borderSubtle,
            padding: 14,
            gap: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={TYPOGRAPHY.sheetTitle}>{p.name}</AppText>
              <AppText style={{ fontSize: 12, color: SURFACES.dark.textSecondary }}>
                {p.creek ?? 'Watershed Corridor'} · {p.jurisdiction} · {p.id}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                role="button"
                accessibilityRole="button"
                accessibilityLabel={language === 'es' ? 'Leer estado del cruce' : 'Speak crossing state'}
                onPress={speakCrossingSummary}
                style={{
                  minHeight: 38,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  backgroundColor: SURFACES.dark.elevated2,
                  borderWidth: 1,
                  borderColor: SURFACES.dark.borderSubtle,
                  justifyContent: 'center',
                }}
              >
                <AppText style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                  {language === 'es' ? 'Leer estado' : 'Read state'}
                </AppText>
              </Pressable>
              <Pressable
                role="button"
                accessibilityRole="button"
                accessibilityLabel={t(isSaved ? 'crossing.remove' : 'crossing.save')}
                onPress={() => toggleSaved(p.id)}
                style={{
                  minHeight: 38,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  backgroundColor: SURFACES.dark.elevated2,
                  borderWidth: 1,
                  borderColor: isSaved ? LOCKED_STATE_HEX.watch : SURFACES.dark.borderSubtle,
                  justifyContent: 'center',
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    color: isSaved ? LOCKED_STATE_HEX.watch : '#F8FAFC',
                    fontFamily: 'Inter_600SemiBold',
                  }}
                >
                  {isSaved ? (language === 'es' ? 'Guardado' : 'Saved') : language === 'es' ? 'Guardar' : 'Save'}
                </AppText>
              </Pressable>
              <Pressable
                role="button"
                accessibilityRole="button"
                accessibilityLabel={language === 'es' ? `Abrir detalle de ${p.name}` : `Open full detail page for ${p.name}`}
                onPress={() =>
                  router.push({ pathname: '/crossing/[id]', params: { id: p.id } })
                }
                style={{
                  minHeight: 38,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  backgroundColor: SURFACES.dark.elevated2,
                  borderWidth: 1,
                  borderColor: '#5294FF',
                  justifyContent: 'center',
                }}
              >
                <AppText style={{ fontSize: 12, color: '#5294FF', fontFamily: 'Inter_600SemiBold' }}>
                  Full Page ↗
                </AppText>
              </Pressable>
            </View>
          </View>

          {/* Full-Width Triple-Redundancy State Pill */}
          <StateBadge
            state={selectedCrossingSlice.state}
            size={24}
            unmonitored={isUnmonitored}
          />

          {(p.tier === 'A' || p.tier === 'B') && (
            <Button
              compact
              secondary={!isWatchOn}
              accentColor={LOCKED_STATE_HEX.watch}
              title={t(isWatchOn ? 'crossing.watch_enabled' : 'crossing.watch_opt_in')}
              onPress={() => toggleWatch(p.id)}
            />
          )}
        </View>

        {/* 2. Discrete 7-Bucket Arrival Strip & Zero-Lower-Bound Alert */}
        <ArrivalBucketStrip
          state={selectedCrossingSlice.state}
          window={selectedCrossingSlice.window}
        />

        {/* 3. Upstream-to-Downstream Propagation Bar (Shown in Full Forensic or Desktop) */}
        {(expandLevel === 'full' || isDesktopCockpit) && (
          <CorridorPropagationBar
            crossingId={p.id}
            upstreamStageFt={latestUp?.stageFt ?? null}
            upstreamSlopeFtHr={upSlopeFtHr}
            downstreamStageFt={latestDn?.stageFt ?? null}
            state={selectedCrossingSlice.state}
          />
        )}

        {/* 4. Stacked Single-Axis Causal Hydrograph */}
        <CausalHydrograph
          crossingId={p.id}
          replay={replay}
          tSim={simT}
          upstreamGaugeId={upstreamGauge.id}
          downstreamGaugeId={downstreamGauge.id}
          state={selectedCrossingSlice.state}
          arrivalWindow={selectedCrossingSlice.window}
        />

        {/* 5. Truth Provenance Passport & LOSO Scorecard Card */}
        {(expandLevel === 'full' || isDesktopCockpit) && (
          <ProvenanceCard crossing={selectedCrossing} defaultExpandedScorecard={mode === 'replay'} />
        )}
      </View>
    );
  };

  // Persistent Causal Replay Dock (88dp height)
  const renderPersistentReplayDock = () => (
    <View
      testID="persistent-replay-dock"
      style={{
        minHeight: 88,
        backgroundColor: SURFACES.dark.glassHud,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: SURFACES.dark.borderSubtle,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        {/* Transport Controls: [-15m] [PLAY/PAUSE] [+15m] + Speed */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Pressable
            role="button"
            accessibilityRole="button"
            accessibilityLabel={language === 'es' ? 'Retroceder 15 minutos' : 'Back 15 minutes'}
            disabled={stepIdx === 0}
            onPress={() => stepByMinutes(-15)}
            style={{
              minHeight: 44,
              paddingHorizontal: 10,
              borderRadius: 8,
              backgroundColor: SURFACES.dark.elevated2,
              borderWidth: 1,
              borderColor: SURFACES.dark.borderSubtle,
              justifyContent: 'center',
              opacity: stepIdx === 0 ? 0.4 : 1,
            }}
          >
            <AppText style={[TYPOGRAPHY.chartAxis, { color: '#F8FAFC', fontWeight: '700' }]}>
              ⏮ -15m
            </AppText>
          </Pressable>

          <Pressable
            role="button"
            accessibilityRole="button"
            accessibilityLabel={t(playing ? 'replay.pause' : 'replay.play')}
            onPress={() => {
              if (stepIdx >= totalSteps - 1) setStepIdx(0);
              setPlaying(!playing);
            }}
            style={{
              minHeight: 44,
              paddingHorizontal: 14,
              borderRadius: 8,
              backgroundColor: HYDROGRAPH_TOKENS.dark.downstreamStroke,
              justifyContent: 'center',
            }}
          >
            <AppText style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#F8FAFC' }}>
              {playing ? `⏸ ${t('replay.pause')}` : `▶ ${t('replay.play')}`}
            </AppText>
          </Pressable>

          <Pressable
            role="button"
            accessibilityRole="button"
            accessibilityLabel={language === 'es' ? 'Avanzar 15 minutos' : 'Forward 15 minutes'}
            disabled={stepIdx >= totalSteps - 1}
            onPress={() => stepByMinutes(15)}
            style={{
              minHeight: 44,
              paddingHorizontal: 10,
              borderRadius: 8,
              backgroundColor: SURFACES.dark.elevated2,
              borderWidth: 1,
              borderColor: SURFACES.dark.borderSubtle,
              justifyContent: 'center',
              opacity: stepIdx >= totalSteps - 1 ? 0.4 : 1,
            }}
          >
            <AppText style={[TYPOGRAPHY.chartAxis, { color: '#F8FAFC', fontWeight: '700' }]}>
              +15m ⏭
            </AppText>
          </Pressable>

          <Pressable
            role="button"
            accessibilityRole="button"
            accessibilityLabel={t('replay.prev_event')}
            onPress={() => {
              setPlaying(false);
              const prev = [...eventSteps].reverse().find((s) => s < stepIdx) ?? 0;
              setStepIdx(prev);
            }}
            style={{
              minHeight: 44,
              paddingHorizontal: 9,
              borderRadius: 8,
              backgroundColor: SURFACES.dark.elevated1,
              borderWidth: 1,
              borderColor: SURFACES.dark.borderSubtle,
              justifyContent: 'center',
            }}
          >
            <AppText style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter_600SemiBold' }}>
              {t('replay.prev_event')}
            </AppText>
          </Pressable>

          <Pressable
            role="button"
            accessibilityRole="button"
            accessibilityLabel={t('replay.next_event')}
            onPress={() => {
              setPlaying(false);
              const next = eventSteps.find((s) => s > stepIdx) ?? totalSteps - 1;
              setStepIdx(next);
            }}
            style={{
              minHeight: 44,
              paddingHorizontal: 9,
              borderRadius: 8,
              backgroundColor: SURFACES.dark.elevated1,
              borderWidth: 1,
              borderColor: SURFACES.dark.borderSubtle,
              justifyContent: 'center',
            }}
          >
            <AppText style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter_600SemiBold' }}>
              {t('replay.next_event')}
            </AppText>
          </Pressable>

          <Pressable
            role="button"
            accessibilityRole="button"
            accessibilityLabel={t('replay.restart')}
            onPress={() => {
              setPlaying(false);
              setStepIdx(0);
            }}
            style={{
              minHeight: 44,
              paddingHorizontal: 9,
              borderRadius: 8,
              backgroundColor: SURFACES.dark.elevated1,
              borderWidth: 1,
              borderColor: SURFACES.dark.borderSubtle,
              justifyContent: 'center',
            }}
          >
            <AppText style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter_600SemiBold' }}>
              ↺ {t('replay.restart')}
            </AppText>
          </Pressable>
        </View>

        {/* Speed Multipliers */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {SPEEDS.map((s) => (
            <Pressable
              key={s}
              role="button"
              accessibilityRole="button"
              accessibilityLabel={`${s}×`}
              onPress={() => setSpeed(s)}
              style={{
                minHeight: 44,
                paddingHorizontal: 8,
                borderRadius: 6,
                backgroundColor:
                  speed === s ? HYDROGRAPH_TOKENS.dark.downstreamStroke : SURFACES.dark.elevated1,
                borderWidth: 1,
                borderColor:
                  speed === s ? HYDROGRAPH_TOKENS.dark.downstreamStroke : SURFACES.dark.borderSubtle,
                justifyContent: 'center',
              }}
            >
              <AppText
                style={[
                  TYPOGRAPHY.chartAxis,
                  { color: speed === s ? '#F8FAFC' : '#94A3B8', fontWeight: '700' },
                ]}
              >
                {s}×
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* Simulated Clock Readout: t_sim + Wire <= t_sim - 60m */}
        <View style={{ alignItems: 'flex-end' }}>
          <AppText
            accessibilityLiveRegion="polite"
            style={[
              TYPOGRAPHY.chartAxis,
              { color: '#F8FAFC', fontSize: 13, fontWeight: '700' },
            ]}
          >
            {stamp(simT)} CDT
          </AppText>
          <AppText
            style={[
              TYPOGRAPHY.chartAxis,
              { color: '#F5A623', fontSize: 10 },
            ]}
          >
            Wire ≤ {shortClock(wireT)} (-{replay.assumptions.default_delay_min}m) · Pulses:{' '}
            {pulses.length}
          </AppText>
        </View>
      </View>

      {/* Stepped 15m Scrubber Track with 60m Latency Curtain Bracket Behind Thumb */}
      <View style={{ gap: 4 }}>
        <View
          style={{
            height: 10,
            borderRadius: 6,
            backgroundColor: SURFACES.dark.primary,
            borderWidth: 1,
            borderColor: SURFACES.dark.borderSubtle,
            overflow: 'hidden',
            flexDirection: 'row',
          }}
        >
          <View
            style={{
              width: `${Math.max(0, progressPct - latencyPct)}%`,
              height: '100%',
              backgroundColor: HYDROGRAPH_TOKENS.dark.upstreamStroke,
            }}
          />
          <View
            style={{
              width: `${latencyPct}%`,
              height: '100%',
              backgroundColor: '#F5A623',
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <AppText style={[TYPOGRAPHY.chartAxis, { color: SURFACES.dark.textSecondary, fontSize: 10 }]}>
            {t('replay.reading', { index: stepIdx + 1, count: totalSteps, time: stamp(simT) })}
          </AppText>
          <AppText style={[TYPOGRAPHY.chartAxis, { color: SURFACES.dark.textSecondary, fontSize: 10 }]}>
            {language === 'es'
              ? `${summaryCounts.avoidCount} Evite · ${summaryCounts.watchCount} Precaución · ${summaryCounts.unknownCount} Sin datos`
              : `${summaryCounts.avoidCount} Avoid · ${summaryCounts.watchCount} Watch · ${summaryCounts.unknownCount} Unknown`}
          </AppText>
        </View>
      </View>
    </View>
  );

  // ============================================================================
  // DESKTOP / LAPTOP WEB VIEWPORT (width >= 1024px):
  // 3-Column Synchronized "Congressional Judge" Split-Screen Tactical Cockpit
  // ============================================================================
  if (isDesktopCockpit) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: SURFACES.dark.primary }}
        contentContainerStyle={{ padding: 16, gap: 14 }}
      >
        {/* Top Judge Command Strip + Guided Demo Samples */}
        <View
          style={{
            backgroundColor: SURFACES.dark.elevated1,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: SURFACES.dark.borderSubtle,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Dip size={38} />
            <View>
              <AppText style={{ fontSize: 11, letterSpacing: 1.4, color: '#38BDF8', fontFamily: 'Inter_600SemiBold' }}>
                {t('map.region')} · 3-COLUMN TACTICAL COCKPIT
              </AppText>
              <AppText style={TYPOGRAPHY.sheetTitle}>{t('map.title')}</AppText>
            </View>
          </View>

          {/* 3 Guided Demo Sample Buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Button
              compact
              accentColor={HYDROGRAPH_TOKENS.dark.downstreamStroke}
              title={t('demo.sample1')}
              onPress={() => {
                triggerSampleReplay('halloween-2013');
                setSelectedCrossingId('atx-7');
              }}
            />
            <Button
              compact
              secondary
              title={t('demo.sample2')}
              onPress={() => {
                setActiveStormId(replayIndex.hero_storm_id ?? 'halloween-2013');
                setSimDriveActive(true);
                router.push('/drive');
              }}
            />
            <Button
              compact
              secondary
              title={t('demo.sample3')}
              onPress={() => {
                setSelectedCrossingId('atx-7');
                router.push({ pathname: '/crossing/[id]', params: { id: 'atx-7' } });
              }}
            />
            <Button
              compact
              secondary
              title={language === 'es' ? 'Resultados LOSO' : 'LOSO scorecard'}
              onPress={() => setShowScorecardModal((v) => !v)}
            />
            <Button
              compact
              secondary
              title={t('map.legend')}
              onPress={() => router.push('/legend')}
            />
          </View>
        </View>

        {showScorecardModal && (
          <ValidationScorecardModal onClose={() => setShowScorecardModal(false)} />
        )}

        {/* 3-Column Synchronized Tactical Cockpit */}
        <View
          testID="desktop-3col-cockpit"
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          {/* LEFT COLUMN (width: 340px Fixed Dock): Storm Bundle Selector, Storyboard Beats, Crossing Directory */}
          <View
            style={{
              width: 340,
              gap: 12,
            }}
          >
            {/* Storm Bundle Selector */}
            <View
              style={{
                backgroundColor: SURFACES.dark.elevated1,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: SURFACES.dark.borderSubtle,
                padding: 14,
                gap: 8,
              }}
            >
              <AppText
                style={{
                  fontSize: 10,
                  letterSpacing: 1.2,
                  color: SURFACES.dark.textSecondary,
                  fontFamily: 'Inter_600SemiBold',
                }}
              >
                {t('replay.select_storm')}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {replayIndex.storms.map((s) => (
                  <Chip
                    key={s.id}
                    active={s.id === activeStormId}
                    accentColor={HYDROGRAPH_TOKENS.dark.downstreamStroke}
                    title={language === 'es' ? s.name_es : s.name_en}
                    onPress={() => setActiveStormId(s.id)}
                  />
                ))}
              </View>
            </View>

            {/* Vertical Interactive Storyboard Documentary Beats */}
            <View
              style={{
                backgroundColor: SURFACES.dark.elevated1,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: SURFACES.dark.borderSubtle,
                padding: 14,
                gap: 8,
              }}
            >
              <AppText
                style={{
                  fontSize: 10,
                  letterSpacing: 1.2,
                  color: HYDROGRAPH_TOKENS.dark.downstreamStroke,
                  fontFamily: 'Inter_600SemiBold',
                }}
              >
                {t('replay.storyboard_title')}
              </AppText>
              {replay.storyboard.map((sb, idx) => {
                const sbMs = Date.parse(sb.t);
                const isCurrent = Math.abs(simT - sbMs) < stepMs;
                const beatState: State =
                  sb.kind === 'first_avoid' || sb.kind === 'crest'
                    ? 'avoid'
                    : sb.kind === 'gauge_silent'
                      ? 'unknown'
                      : 'watch';
                return (
                  <Pressable
                    key={`${sb.t}-${idx}`}
                    role="button"
                    accessibilityRole="button"
                    onPress={() => {
                      setPlaying(false);
                      setStepIdx(
                        Math.max(
                          0,
                          Math.min(totalSteps - 1, Math.round((sbMs - startMs) / stepMs)),
                        ),
                      );
                      const evAtT = replay.events.find((e) => e.t === sb.t);
                      if (evAtT?.crossing_id) setSelectedCrossingId(evAtT.crossing_id);
                    }}
                    style={{
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isCurrent
                        ? HYDROGRAPH_TOKENS.dark.downstreamStroke
                        : SURFACES.dark.borderSubtle,
                      backgroundColor: isCurrent
                        ? 'rgba(168, 85, 247, 0.16)'
                        : SURFACES.dark.elevated2,
                      padding: 10,
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 6,
                      }}
                    >
                      <AppText
                        style={[
                          TYPOGRAPHY.chartAxis,
                          { color: '#F8FAFC', fontWeight: '700' },
                        ]}
                      >
                        BEAT 0{idx + 1} • {shortClock(sbMs)} CDT
                      </AppText>
                      <StateBadge state={beatState} size={16} compactMapPill={true} />
                    </View>
                    <AppText style={[TYPOGRAPHY.bodyCompact, { fontSize: 12, lineHeight: 17 }]}>
                      {language === 'es' ? sb.es : sb.en}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Filterable Crossing Directory (Grouped by Monitored Tier B vs Unmonitored Tier C) */}
            <View
              style={{
                backgroundColor: SURFACES.dark.elevated1,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: SURFACES.dark.borderSubtle,
                padding: 14,
                gap: 10,
              }}
            >
              <AppText
                style={{
                  fontSize: 10,
                  letterSpacing: 1.2,
                  color: SURFACES.dark.textSecondary,
                  fontFamily: 'Inter_600SemiBold',
                }}
              >
                {t('map.records', { count: filteredCrossings.length })}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(['monitored', 'tier_a', 'tier_b', 'saved', 'all'] as const).map((m) => (
                  <Chip
                    key={m}
                    active={filterMode === m}
                    title={t(`map.filter.${m}`)}
                    onPress={() => setFilterMode(m)}
                  />
                ))}
              </View>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('map.search')}
                accessibilityLabel={t('map.search')}
                placeholderTextColor={SURFACES.dark.textMuted}
                style={{
                  minHeight: 40,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: SURFACES.dark.borderSubtle,
                  color: '#F8FAFC',
                  backgroundColor: SURFACES.dark.primary,
                  paddingHorizontal: 12,
                  fontSize: 13,
                }}
              />
              <View style={{ maxHeight: 540 }}>
                <ScrollView nestedScrollEnabled>
                  {filteredCrossings.length ? (
                    filteredCrossings.map((f) => {
                      const sl =
                        f.properties.tier === 'B' || f.properties.tier === 'A'
                          ? stateAt(replay, f.properties.id, simT)
                          : null;
                      return (
                        <CrossingRow
                          key={f.properties.id}
                          crossing={f}
                          stateOverride={sl?.state}
                          windowOverride={sl?.window}
                          onSelectCrossing={(id) => setSelectedCrossingId(id)}
                        />
                      );
                    })
                  ) : (
                    <AppText style={{ paddingVertical: 12, color: SURFACES.dark.textSecondary }}>
                      {t('map.empty')}
                    </AppText>
                  )}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* CENTER COLUMN (flex: 1, minWidth: 420px): Interactive Corridor Map + Stepped Causal Replay Scrubber */}
          <View style={{ flex: 1, minWidth: 420, gap: 12 }}>
            <MapSurface
              features={filteredCrossings.length ? filteredCrossings : crossings}
              replayOverride={replay}
              simTOverride={simT}
              selectedCrossingId={selectedCrossing.properties.id}
              onSelect={(id) => setSelectedCrossingId(id)}
            />

            {renderPersistentReplayDock()}

            {/* Gauge Telemetry Selector & Hero Summary Strip */}
            <View
              style={{
                backgroundColor: SURFACES.dark.elevated1,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: SURFACES.dark.borderSubtle,
                padding: 14,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <AppText style={{ fontSize: 11, letterSpacing: 1.1, color: SURFACES.dark.textSecondary, fontFamily: 'Inter_600SemiBold' }}>
                  {t('replay.select_gauge')} · {selectedGauge.name} ({selectedGauge.id})
                </AppText>
                <AppText
                  style={[
                    TYPOGRAPHY.metricValue,
                    {
                      fontSize: 20,
                      color: isGaugeInOutage ? LOCKED_STATE_HEX.unknown : LOCKED_STATE_HEX.no_rise,
                    },
                  ]}
                >
                  {isGaugeInOutage
                    ? t('replay.outage_active')
                    : gaugeSamples[gaugeSamples.length - 1]?.stageFt != null
                      ? `${gaugeSamples[gaugeSamples.length - 1]!.stageFt!.toFixed(2)} ft`
                      : '—'}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {replay.gauges.map((g) => (
                  <Chip
                    key={g.id}
                    active={g.id === selectedGauge.id}
                    title={g.id.replace('USGS-', '')}
                    onPress={() => setSelectedGaugeId(g.id)}
                  />
                ))}
              </View>
              {replay.hero && (
                <AppText style={{ fontSize: 12, color: LOCKED_STATE_HEX.watch }}>
                  {t('replay.result', {
                    lead: replay.hero.lead_min == null ? '—' : Math.round(replay.hero.lead_min),
                  })}{' '}
                  ({replay.hero.crossing_id}) ·{' '}
                  {t('replay.honesty', {
                    n: results.storms.length,
                    m: results.storms[0]?.n_crossings ?? 0,
                    med: pooledUp.median_lead_min ?? '—',
                    false_alarms: pooledUp.F,
                    missed: pooledUp.M,
                  })}
                </AppText>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <AppText style={styles.footer}>{t('replay.caveat')}</AppText>
                <Button
                  compact
                  secondary
                  title={t(showTable ? 'replay.hide_table' : 'replay.table')}
                  onPress={() => setShowTable((v) => !v)}
                />
              </View>
              {showTable && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {gaugeSamples.slice(-16).map((s, idx) => (
                    <AppText
                      key={`${s.iso}-${idx}`}
                      style={[TYPOGRAPHY.chartAxis, { color: SURFACES.dark.textSecondary }]}
                    >
                      {shortClock(s.t)}:{' '}
                      {s.inOutage
                        ? t('replay.outage_active')
                        : s.stageFt != null
                          ? `${s.stageFt.toFixed(2)}ft`
                          : '—'}
                    </AppText>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* RIGHT COLUMN (width: 440px Inspector Dock): Permanently Docked Crossing Detail & Causal Hydrograph */}
          <View style={{ width: 440, gap: 12 }}>{renderCrossingInspector('full')}</View>
        </View>

        <Footer />
      </ScrollView>
    );
  }

  // ============================================================================
  // PHONE VIEWPORT (width < 1024px):
  // 3-Layer Z-Axis Mobile Cockpit (Top Glass Bar + Storyboard Bar + Map + 3-Snap Sheet + Replay Dock)
  // ============================================================================
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: SURFACES.dark.primary }}
      contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 32 }}
    >
      {/* ZONE 1: Top Glass Header Bar (48dp height) */}
      <View
        testID="mobile-top-glass-header"
        style={{
          minHeight: 48,
          backgroundColor: SURFACES.dark.elevated1,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: SURFACES.dark.borderSubtle,
          paddingHorizontal: 12,
          paddingVertical: 8,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        {/* Left: Storm Selector Pill */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: '100%' }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {replayIndex.storms.map((s) => (
              <Chip
                key={s.id}
                active={s.id === activeStormId}
                accentColor={HYDROGRAPH_TOKENS.dark.downstreamStroke}
                title={language === 'es' ? s.name_es : s.name_en}
                onPress={() => setActiveStormId(s.id)}
              />
            ))}
          </View>
        </ScrollView>

        {/* Center: Language Toggle (width: 68dp) */}
        <Pressable
          role="button"
          accessibilityRole="button"
          accessibilityLabel={language === 'en' ? 'Español' : 'English'}
          onPress={() => setLanguage(language === 'en' ? 'es' : 'en')}
          style={{
            width: 68,
            minHeight: 44,
            borderRadius: 10,
            backgroundColor: SURFACES.dark.elevated2,
            borderWidth: 1,
            borderColor: SURFACES.dark.borderSubtle,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <AppText style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#F8FAFC' }}>
            {language === 'en' ? 'EN | ES' : 'ES | EN'}
          </AppText>
        </Pressable>

        {/* Right: Driver HUD Launch Pill (width: 86dp) */}
        <Pressable
          role="button"
          accessibilityRole="button"
          accessibilityLabel={t('replay.drive_cta')}
          onPress={() => {
            setPlaying(false);
            setSimDriveActive(true);
            router.push('/drive');
          }}
          style={{
            width: 86,
            minHeight: 44,
            borderRadius: 10,
            backgroundColor: SURFACES.dark.elevated2,
            borderWidth: 1.5,
            borderColor: '#5294FF',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <AppText style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#F8FAFC' }}>
            {language === 'es' ? 'Manejar' : 'Drive'}
          </AppText>
        </Pressable>
      </View>

      {/* ZONE 2: Storyboard Documentary Bar (44dp height, Horizontal Scroll) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {replay.storyboard.map((sb, idx) => {
          const sbMs = Date.parse(sb.t);
          const isCurrent = Math.abs(simT - sbMs) < stepMs;
          const beatState: State =
            sb.kind === 'first_avoid' || sb.kind === 'crest'
              ? 'avoid'
              : sb.kind === 'gauge_silent'
                ? 'unknown'
                : 'watch';
          return (
            <Pressable
              key={`${sb.t}-${idx}`}
              role="button"
              accessibilityRole="button"
              onPress={() => {
                setPlaying(false);
                setStepIdx(
                  Math.max(
                    0,
                    Math.min(totalSteps - 1, Math.round((sbMs - startMs) / stepMs)),
                  ),
                );
                const evAtT = replay.events.find((e) => e.t === sb.t);
                if (evAtT?.crossing_id) setSelectedCrossingId(evAtT.crossing_id);
              }}
              style={{
                minHeight: 44,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isCurrent
                  ? HYDROGRAPH_TOKENS.dark.downstreamStroke
                  : SURFACES.dark.borderSubtle,
                backgroundColor: isCurrent
                  ? 'rgba(168, 85, 247, 0.18)'
                  : SURFACES.dark.elevated2,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <StateGlyphSvg state={beatState} size={16} />
              <View>
                <AppText style={[TYPOGRAPHY.chartAxis, { color: '#F8FAFC', fontWeight: '700' }]}>
                  {idx + 1} • {shortClock(sbMs)}
                </AppText>
                <AppText numberOfLines={1} style={{ fontSize: 11, color: '#94A3B8', maxWidth: 190 }}>
                  {language === 'es' ? sb.es : sb.en}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Guided Demo Samples Strip */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Button
          compact
          accentColor={HYDROGRAPH_TOKENS.dark.downstreamStroke}
          title={t('demo.sample1')}
          onPress={() => {
            triggerSampleReplay('halloween-2013');
            setSelectedCrossingId('atx-7');
            setMobileSnap('full');
          }}
        />
        <Button
          compact
          secondary
          title={t('demo.sample2')}
          onPress={() => {
            setActiveStormId(replayIndex.hero_storm_id ?? 'halloween-2013');
            setSimDriveActive(true);
            router.push('/drive');
          }}
        />
        <Button
          compact
          secondary
          title={t('demo.sample3')}
          onPress={() => router.push({ pathname: '/crossing/[id]', params: { id: 'atx-7' } })}
        />
      </View>

      {/* ZONE 3: Interactive Corridor Map Canvas */}
      <MapSurface
        features={filteredCrossings.length ? filteredCrossings : crossings}
        replayOverride={replay}
        simTOverride={simT}
        selectedCrossingId={selectedCrossing.properties.id}
        onSelect={(id) => {
          setSelectedCrossingId(id);
          if (mobileSnap === 'collapsed') setMobileSnap('half');
        }}
      />

      {/* ZONE 4: 3-Snap-Point Crossing Detail Sheet Seated Above Persistent Replay Dock */}
      <View
        accessibilityViewIsModal={false}
        style={{
          backgroundColor: SURFACES.dark.primary,
          borderRadius: 18,
          borderWidth: 1.5,
          borderColor: SURFACES.dark.borderSubtle,
          padding: 16,
          gap: 12,
        }}
      >
        {/* Sheet Grabber & Snap Point Selector (Collapsed 12% / Half 48% / Full 88% / All 141 Directory) */}
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 42,
              height: 4,
              borderRadius: 2,
              backgroundColor: SURFACES.dark.textMuted,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <AppText style={[TYPOGRAPHY.chartAxis, { color: SURFACES.dark.textSecondary, fontSize: 12, lineHeight: 17 }]}>
              {language === 'es'
                ? `30 candidatos de investigación · 111 sin sensor · ${summaryCounts.avoidCount} Evite · ${summaryCounts.watchCount} Precaución`
                : `30 research candidates · 111 without sensors · ${summaryCounts.avoidCount} Avoid · ${summaryCounts.watchCount} Watch`}
            </AppText>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {(
                [
                  { id: 'collapsed', label: language === 'es' ? 'Resumen' : 'Summary' },
                  { id: 'half', label: language === 'es' ? 'Detalles' : 'Details' },
                  { id: 'full', label: language === 'es' ? 'Evidencia' : 'Evidence' },
                  { id: 'directory', label: language === 'es' ? 'Todos los 141' : 'All 141' },
                ] as const
              ).map((sp) => (
                <Pressable
                  key={sp.id}
                  role="button"
                  accessibilityRole="button"
                  onPress={() => setMobileSnap(sp.id)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 10,
                    backgroundColor:
                      mobileSnap === sp.id ? SURFACES.dark.elevated2 : SURFACES.dark.elevated1,
                    borderWidth: 1,
                    borderColor:
                      mobileSnap === sp.id ? '#5294FF' : SURFACES.dark.borderSubtle,
                  }}
                >
                  <AppText style={{ fontSize: 11.5, fontFamily: 'Inter_600SemiBold', color: '#F8FAFC' }}>
                    {sp.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {mobileSnap === 'collapsed' && (
          <Pressable
            role="button"
            accessibilityRole="button"
            onPress={() => setMobileSnap('half')}
            style={{
              padding: 10,
              borderRadius: 12,
              backgroundColor: SURFACES.dark.elevated1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
              {selectedCrossing.properties.name}
            </AppText>
            <StateBadge state={selectedCrossingSlice.state} size={16} compactMapPill={true} />
          </Pressable>
        )}

        {(mobileSnap === 'half' || mobileSnap === 'full') &&
          renderCrossingInspector(mobileSnap)}

        {mobileSnap === 'directory' && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {(['monitored', 'tier_a', 'tier_b', 'saved', 'all'] as const).map((m) => (
                <Chip
                  key={m}
                  active={filterMode === m}
                  title={t(`map.filter.${m}`)}
                  onPress={() => setFilterMode(m)}
                />
              ))}
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('map.search')}
              accessibilityLabel={t('map.search')}
              placeholderTextColor={SURFACES.dark.textMuted}
              style={{
                minHeight: 42,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: SURFACES.dark.borderSubtle,
                color: '#F8FAFC',
                backgroundColor: SURFACES.dark.elevated1,
                paddingHorizontal: 12,
                fontSize: 14,
              }}
            />
            {filteredCrossings.map((f) => (
              <CrossingRow
                key={f.properties.id}
                crossing={f}
                onSelectCrossing={(id) => {
                  setSelectedCrossingId(id);
                  setMobileSnap('half');
                }}
              />
            ))}
          </View>
        )}
      </View>

      {/* ZONE 5: Persistent Causal Replay Dock (88dp height) */}
      {renderPersistentReplayDock()}

      <Footer />
    </ScrollView>
  );
}
