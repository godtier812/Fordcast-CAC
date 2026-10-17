import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { AppState, Pressable, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import {
  AppText,
  Button,
  Card,
  Eyebrow,
  Footer,
  Page,
  StatusGlyph,
  Title,
  styles,
  type State,
} from '@/components/fordcast/UI';
import { activePulsesAt, replayIndex, replays, results, stateAt, visibleSamples } from '@/lib/data';
import { theme as c } from '@/lib/theme';
import { usePreferences } from '@/lib/preferences';

const SPEEDS = [1, 10, 30, 60, 120] as const;

export default function Replay() {
  const { t, language, activeStormId, setActiveStormId, setSimDriveActive } = usePreferences();
  const replay = replays[activeStormId] ?? replays['halloween-2013']!;
  const startMs = Date.parse(replay.storm.start);
  const endMs = Date.parse(replay.storm.end);
  const stepMs = replay.step_s * 1000;
  const totalSteps = Math.floor((endMs - startMs) / stepMs) + 1;

  // Start default cursor at first storyboard moment or step 0
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
  const [selectedGaugeId, setSelectedGaugeId] = useState<string>(
    replay.gauges.find((g) => g.id === 'USGS-08159000')?.id ?? replay.gauges[0]?.id ?? '',
  );
  const [table, setTable] = useState(false);

  const selectStorm = (stormId: string) => {
    const nextReplay = replays[stormId] ?? replays['halloween-2013']!;
    const nStart = Date.parse(nextReplay.storm.start);
    const nEnd = Date.parse(nextReplay.storm.end);
    const nStep = nextReplay.step_s * 1000;
    const nTotal = Math.floor((nEnd - nStart) / nStep) + 1;
    const firstSb = nextReplay.storyboard[0]?.t;
    const nextInit = firstSb
      ? Math.max(0, Math.min(nTotal - 1, Math.round((Date.parse(firstSb) - nStart) / nStep)))
      : 0;
    setActiveStormId(stormId);
    setPlaying(false);
    setStepIdx(nextInit);
    setSelectedGaugeId(
      nextReplay.gauges.find((g) => g.id === 'USGS-08159000')?.id ?? nextReplay.gauges[0]?.id ?? '',
    );
  };

  useFocusEffect(useCallback(() => () => setPlaying(false), []));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setPlaying(false);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const intervalMs = Math.max(80, Math.round(12_000 / speed));
    const timer = setTimeout(() => {
      if (stepIdx >= totalSteps - 2) setPlaying(false);
      setStepIdx((i) => Math.min(totalSteps - 1, i + 1));
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [playing, stepIdx, totalSteps, speed]);

  const clampedStepIdx = Math.min(totalSteps - 1, Math.max(0, stepIdx));
  const simT = startMs + clampedStepIdx * stepMs;
  const selectedGauge = replay.gauges.find((g) => g.id === selectedGaugeId) ?? replay.gauges[0]!;
  const samples = useMemo(() => visibleSamples(selectedGauge, simT), [selectedGauge, simT]);
  const pulses = useMemo(() => activePulsesAt(replay, simT), [replay, simT]);

  const stamp = (msOrIso: number | string) =>
    new Date(msOrIso).toLocaleString(language === 'es' ? 'es-US' : 'en-US', {
      timeZone: 'America/Chicago',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const nonNullVals = selectedGauge.stage_ft.filter((v): v is number => v !== null);
  const maxStage = Math.max(
    10,
    Math.ceil(Math.max(...nonNullVals, selectedGauge.trigger_ft ?? 10) / 5) * 5,
  );
  const xForMs = (ms: number) => 44 + ((ms - startMs) / Math.max(1, endMs - startMs)) * 606;
  const yForStage = (val: number) => 205 - (val / maxStage) * 175;

  const validSamples = samples.filter(
    (s): s is typeof s & { stageFt: number } => s.stageFt !== null,
  );
  const latestSample = validSamples[validSamples.length - 1] ?? null;
  const isGaugeInOutage = samples.length > 0 && samples[samples.length - 1]?.inOutage === true;

  const pathD = samples
    .map((s, idx) => {
      if (s.stageFt === null) return '';
      const prev = idx > 0 ? samples[idx - 1] : null;
      const cmd = !prev || prev.stageFt === null ? 'M' : 'L';
      return `${cmd}${xForMs(s.t).toFixed(1)},${yForStage(s.stageFt).toFixed(1)}`;
    })
    .filter(Boolean)
    .join(' ');

  const crossingSlices = useMemo(
    () =>
      replay.crossings
        .map((c) => ({ meta: c, slice: stateAt(replay, c.id, simT) }))
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

  const pooledUp = results.methods.upstream_rule.avoid.pooled;
  const pooledNg = results.methods.nearest_gauge.avoid.pooled;
  const pooledWatch = results.methods.upstream_rule.watch.pooled;

  return (
    <Page>
      <Eyebrow color={c.replay}>{t('replay.eyebrow')}</Eyebrow>
      <Title>{t('replay.title')}</Title>
      <AppText style={styles.muted}>{t('replay.body')}</AppText>

      <View style={{ gap: 8 }}>
        <Eyebrow>{t('replay.select_storm')}</Eyebrow>
        <View style={[styles.row, { flexWrap: 'wrap', gap: 8 }]}>
          {replayIndex.storms.map((s) => (
            <Button
              key={s.id}
              secondary={s.id !== activeStormId}
              title={language === 'es' ? s.name_es : s.name_en}
              onPress={() => selectStorm(s.id)}
            />
          ))}
        </View>
      </View>

      <Card style={{ borderColor: c.replay }}>
        <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
          <Eyebrow color={c.replay}>{t('replay.banner')}</Eyebrow>
          <AppText style={styles.footer}>
            {t('replay.assumes_delay', { delay: replay.assumptions.default_delay_min })}
          </AppText>
        </View>
        <AppText style={styles.heading}>
          {language === 'es' ? replay.storm.name_es : replay.storm.name_en}
        </AppText>

        {replay.hero && (
          <View
            style={{
              backgroundColor: c.raised,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: c.watch,
              gap: 4,
            }}
          >
            <AppText style={{ fontFamily: 'Inter_600SemiBold', color: c.watch }}>
              {t('replay.result', { lead: Math.round(replay.hero.lead_min ?? 70) })} (
              {replay.hero.crossing_id})
            </AppText>
            <AppText style={styles.footer}>
              {t('replay.honesty', {
                n: results.storms.length,
                m: results.storms[0]?.n_crossings ?? 12,
                med: pooledUp.median_lead_min ?? 70,
                false_alarms: pooledUp.F,
                missed: pooledUp.M,
              })}
            </AppText>
          </View>
        )}

        <Button
          title={t('replay.drive_cta')}
          onPress={() => {
            setPlaying(false);
            setSimDriveActive(true);
            router.push('/drive');
          }}
        />

        <View style={{ gap: 8 }}>
          <Eyebrow>{t('replay.storyboard_title')}</Eyebrow>
          {replay.storyboard.map((sb, idx) => {
            const sbMs = Date.parse(sb.t);
            const isCurrent = Math.abs(simT - sbMs) < stepMs;
            return (
              <Pressable
                key={`${sb.t}-${idx}`}
                accessibilityRole="button"
                onPress={() => {
                  setPlaying(false);
                  setStepIdx(
                    Math.max(0, Math.min(totalSteps - 1, Math.round((sbMs - startMs) / stepMs))),
                  );
                }}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isCurrent ? c.replay : c.border,
                  backgroundColor: isCurrent ? c.raised : c.bg,
                  gap: 2,
                }}
              >
                <AppText style={[styles.footer, { color: c.replay }]}>
                  {stamp(sb.t)} · {sb.kind}
                </AppText>
                <AppText style={{ fontSize: 14, lineHeight: 20 }}>
                  {language === 'es' ? sb.es : sb.en}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 8 }}>
          <Eyebrow>{t('replay.select_gauge')}</Eyebrow>
          <View style={[styles.row, { flexWrap: 'wrap', gap: 6 }]}>
            {replay.gauges.map((g) => (
              <Button
                key={g.id}
                secondary={g.id !== selectedGauge.id}
                title={g.id.replace('USGS-', '')}
                onPress={() => setSelectedGaugeId(g.id)}
              />
            ))}
          </View>
          <AppText style={styles.muted}>
            {selectedGauge.name} ({selectedGauge.id})
          </AppText>
        </View>

        <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
          <AppText
            style={{
              fontSize: 40,
              lineHeight: 48,
              color: isGaugeInOutage ? c.unknown : c.water,
              fontFamily: 'Inter_600SemiBold',
              fontVariant: ['tabular-nums'],
            }}
          >
            {isGaugeInOutage ? '—' : latestSample ? latestSample.stageFt.toFixed(2) : '—'}{' '}
            <AppText style={styles.footer}>ft</AppText>
          </AppText>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText style={{ fontFamily: 'Inter_600SemiBold', color: c.replay }}>
              {stamp(simT)}
            </AppText>
            {isGaugeInOutage && (
              <AppText style={[styles.footer, { color: c.watch }]}>
                {t('replay.outage_active')}
              </AppText>
            )}
          </View>
        </View>

        <Svg
          width="100%"
          height={235}
          viewBox="0 0 680 235"
          accessibilityLabel={t('replay.chart_label')}
          accessible
        >
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <Line
              key={`line-${v}`}
              x1={44}
              y1={205 - v * 175}
              x2={650}
              y2={205 - v * 175}
              stroke={c.border}
              strokeDasharray="3 5"
            />
          ))}
          {[0, 0.5, 1].map((v) => (
            <SvgText key={`label-${v}`} x={4} y={209 - v * 175} fill={c.subtle} fontSize={11}>
              {Math.round(maxStage * v)}
            </SvgText>
          ))}
          {selectedGauge.outages.map((o, idx) => {
            const ox1 = Math.max(44, xForMs(Date.parse(o.start)));
            const ox2 = Math.min(650, xForMs(Date.parse(o.end)));
            return (
              <Rect
                key={`outage-${idx}`}
                x={ox1}
                y={28}
                width={Math.max(4, ox2 - ox1)}
                height={177}
                fill={c.unknown}
                fillOpacity={0.22}
              />
            );
          })}
          {selectedGauge.trigger_ft != null && (
            <Line
              x1={44}
              y1={yForStage(selectedGauge.trigger_ft)}
              x2={650}
              y2={yForStage(selectedGauge.trigger_ft)}
              stroke={c.avoid}
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
          )}
          <Path d={pathD} stroke={c.water} fill="none" strokeWidth={3} />
          {latestSample && !isGaugeInOutage && (
            <Circle
              cx={xForMs(latestSample.t)}
              cy={yForStage(latestSample.stageFt)}
              r={5}
              fill={c.water}
            />
          )}
          <Line
            x1={xForMs(simT)}
            y1={25}
            x2={xForMs(simT)}
            y2={210}
            stroke={c.replay}
            strokeWidth={2}
            strokeDasharray="2 4"
          />
        </Svg>

        <AppText style={styles.footer}>
          {t('replay.caption')} · Active river pulses: {pulses.length}
        </AppText>
        <AppText accessibilityLiveRegion="polite">
          {t('replay.reading', { index: stepIdx + 1, count: totalSteps, time: stamp(simT) })}
        </AppText>

        <View style={[styles.row, { flexWrap: 'wrap', gap: 8 }]}>
          {SPEEDS.map((s) => (
            <Button key={s} secondary={speed !== s} title={`${s}×`} onPress={() => setSpeed(s)} />
          ))}
        </View>

        <Button
          title={t(playing ? 'replay.pause' : 'replay.play')}
          onPress={() => {
            if (stepIdx >= totalSteps - 1) setStepIdx(0);
            setPlaying(!playing);
          }}
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              title={t('replay.previous')}
              disabled={stepIdx === 0}
              onPress={() => {
                setPlaying(false);
                setStepIdx((i) => Math.max(0, i - 1));
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              title={t('replay.next')}
              disabled={stepIdx >= totalSteps - 1}
              onPress={() => {
                setPlaying(false);
                setStepIdx((i) => Math.min(totalSteps - 1, i + 1));
              }}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              title={t('replay.prev_event')}
              onPress={() => {
                setPlaying(false);
                const prev = [...eventSteps].reverse().find((s) => s < stepIdx) ?? 0;
                setStepIdx(prev);
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              title={t('replay.next_event')}
              onPress={() => {
                setPlaying(false);
                const next = eventSteps.find((s) => s > stepIdx) ?? totalSteps - 1;
                setStepIdx(next);
              }}
            />
          </View>
        </View>
        <Button
          secondary
          title={t('replay.restart')}
          onPress={() => {
            setPlaying(false);
            setStepIdx(0);
          }}
        />
        <AppText style={styles.footer}>{t('replay.caveat')}</AppText>
      </Card>

      <Button
        secondary
        title={t(table ? 'replay.hide_table' : 'replay.table')}
        onPress={() => setTable(!table)}
      />
      {table && (
        <Card>
          {samples.slice(-24).map((s, i) => (
            <AppText key={`${s.iso}-${i}`} style={styles.footer}>
              {stamp(s.iso)} ·{' '}
              {s.inOutage
                ? t('replay.outage_active')
                : s.stageFt !== null
                  ? `${s.stageFt.toFixed(2)} ft`
                  : '—'}
            </AppText>
          ))}
        </Card>
      )}

      <Card>
        <AppText style={styles.heading}>{t('replay.crossings_at_t')}</AppText>
        {crossingSlices.slice(0, 12).map(({ meta, slice }) => (
          <Pressable
            key={meta.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/crossing/[id]', params: { id: meta.id } })}
            style={[
              styles.row,
              {
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
              },
            ]}
          >
            <StatusGlyph state={slice.state} size={32} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={{ fontFamily: 'Inter_600SemiBold' }}>
                {language === 'es' ? meta.name_es : meta.name}
              </AppText>
              <AppText style={styles.footer}>
                {t(`state.${slice.state}`)}
                {slice.window
                  ? ` · ${t('state.range', { lo: slice.window[0], hi: slice.window[1] })}`
                  : ''}
                {` · Tier ${meta.tier}`}
              </AppText>
            </View>
          </Pressable>
        ))}
      </Card>

      <Card>
        <AppText style={styles.heading}>{t('replay.comparison_title')}</AppText>
        <AppText style={styles.muted}>{t('replay.pending_body')}</AppText>
        <View style={{ gap: 8, paddingTop: 6 }}>
          <View>
            <AppText style={{ fontFamily: 'Inter_600SemiBold', color: c.water }}>
              {t('replay.method_upstream')}
            </AppText>
            <AppText style={styles.footer}>
              {t('replay.metrics_row', {
                pod: ((pooledUp.pod ?? 0) * 100).toFixed(1),
                far: ((pooledUp.far ?? 0) * 100).toFixed(1),
                csi: (pooledUp.csi ?? 0).toFixed(3),
                lead: pooledUp.median_lead_min ?? 70,
              })}
            </AppText>
          </View>
          <View>
            <AppText style={{ fontFamily: 'Inter_600SemiBold', color: c.muted }}>
              {t('replay.method_nearest')}
            </AppText>
            <AppText style={styles.footer}>
              {t('replay.metrics_row', {
                pod: ((pooledNg.pod ?? 0) * 100).toFixed(1),
                far: ((pooledNg.far ?? 0) * 100).toFixed(1),
                csi: (pooledNg.csi ?? 0).toFixed(3),
                lead: pooledNg.median_lead_min ?? 150,
              })}
            </AppText>
          </View>
          <View>
            <AppText style={{ fontFamily: 'Inter_600SemiBold', color: c.watch }}>
              {t('replay.method_watch')}
            </AppText>
            <AppText style={styles.footer}>
              {t('replay.metrics_row', {
                pod: ((pooledWatch.pod ?? 0) * 100).toFixed(1),
                far: ((pooledWatch.far ?? 0) * 100).toFixed(1),
                csi: (pooledWatch.csi ?? 0).toFixed(3),
                lead: pooledWatch.median_lead_min ?? 110,
              })}
            </AppText>
          </View>
        </View>
      </Card>

      <AppText style={styles.footer}>
        {t('common.source')}: {t('replay.archive')}
      </AppText>
      <Footer />
    </Page>
  );
}
