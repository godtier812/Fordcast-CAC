/**
 * Storms: Replay archived Austin floods under today's experimental rule, launch the
 * 45-second moving-car reroute illustration, inspect the LOSO backtest study results
 * (including hits, misses, and false alarms), and review grouped NOAA flood hotspots.
 */
import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/fordcast/UI';
import { FcIcon } from '@/components/fc/Icons';
import { ACCENT, ActionButton, Chip, cleanName, FloodPhysicsCard, NearbyRow, Panel, SectionLabel } from '@/components/fc/Kit';
import { tripFor } from '@/features/demo/useTripDemo';
import { floodHistory, replayIndex, replays, results } from '@/lib/data';
import { groupPhysicalCrossings } from '@/lib/danger';
import { useMonitor } from '@/lib/monitor-context';
import { usePreferences, type CopyKey } from '@/lib/preferences';
import { LOCKED_STATE_HEX, SURFACES } from '@/theme/tokens';

const S = SURFACES.dark;

export default function StormsScreen() {
  const { t, language, triggerSampleReplay } = usePreferences();
  const m = useMonitor();
  const h = results.methods.upstream_rule.avoid.pooled;
  const nearBase = results.methods.nearest_gauge.avoid.pooled;
  const [selectedStormId, setSelectedStormId] = useState<string>('memorial-day-2015');

  const hotspots = useMemo(() => {
    const withHistory = m.statuses.filter((s) => s.history && s.history.reports > 0);
    const grouped = groupPhysicalCrossings(withHistory.map((status) => ({ status })));
    return grouped
      .sort(
        (a, b) =>
          (b.primary.history?.deaths ?? 0) - (a.primary.history?.deaths ?? 0) ||
          (b.primary.history?.vehicleRelated ?? 0) - (a.primary.history?.vehicleRelated ?? 0) ||
          (b.primary.history?.reports ?? 0) - (a.primary.history?.reports ?? 0),
      )
      .slice(0, 8);
  }, [m.statuses]);

  const activeEntry =
    replayIndex.storms.find((s) => s.id === selectedStormId) ?? replayIndex.storms[1] ?? replayIndex.storms[0]!;
  const doc = replays[activeEntry.id]!;
  const stormName = language === 'es' ? doc.storm.name_es : doc.storm.name_en;
  const stormDate = new Date(doc.storm.start).toLocaleDateString(language === 'es' ? 'es-US' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Chicago',
  });
  const avoidCount = new Set(doc.events.filter((e) => e.state === 'avoid').map((e) => e.crossing_id)).size;
  const blurbKey = `storms.blurb.${activeEntry.id}` as CopyKey;
  const demo = tripFor(activeEntry.id);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: S.primary }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          gap: 14,
          paddingBottom: 48,
          width: '100%',
          maxWidth: 820,
          alignSelf: 'center',
        }}
      >
        <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 28, lineHeight: 34 }}>{t('storms.title')}</AppText>
        <AppText style={{ fontSize: 15, lineHeight: 22, color: S.textSecondary }}>{t('storms.body')}</AppText>

        {/* Honest Study Scorecard & Regional Context Side-by-Side */}
        <Panel style={{ borderColor: ACCENT, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FcIcon name="shield" size={18} color={ACCENT} />
            <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 17 }}>{t('storms.track_title')}</AppText>
          </View>
          <AppText style={{ fontSize: 13.5, lineHeight: 20, color: S.textSecondary }}>
            {t('storms.track_body', {
              storms: results.headline.n_storms,
              hits: h.H,
              total: h.H + h.M,
              lead: h.median_lead_min ?? '—',
              missed: h.M,
              fa: h.F,
            })}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <StatCell
              value={`${h.H}/${h.H + h.M}`}
              label={language === 'es' ? 'Eventos detectados (8 omitidos)' : 'Detected events (8 missed)'}
              color={ACCENT}
            />
            <StatCell
              value={`${h.median_lead_min ?? '—'} min`}
              label={t('storms.stat_lead')}
              color={LOCKED_STATE_HEX.watch}
            />
            <StatCell
              value={`${h.F}`}
              label={language === 'es' ? 'Falsas alarmas (regla aguas arriba)' : 'False alarms (upstream rule)'}
              color={LOCKED_STATE_HEX.avoid}
            />
            <StatCell
              value={`${floodHistory.total_events_in_area}`}
              label={t('storms.stat_events')}
              color="#38BDF8"
            />
          </View>
          <View
            style={{
              padding: 10,
              borderRadius: 10,
              backgroundColor: S.primary,
              borderWidth: 1,
              borderColor: S.borderSubtle,
              gap: 4,
            }}
          >
            <AppText style={{ fontSize: 11.5, fontFamily: 'Inter_700Bold', color: S.textSecondary, letterSpacing: 0.4 }}>
              {language === 'es'
                ? 'COMPARACIÓN CON LÍNEA BASE DE SENSOR MÁS CERCANO (LOSO)'
                : 'BASELINE COMPARISON: UPSTREAM RULE VS. NEAREST GAUGE (LOSO)'}
            </AppText>
            <AppText style={{ fontSize: 12.5, lineHeight: 18, color: S.textSecondary, fontVariant: ['tabular-nums'] }}>
              {language === 'es'
                ? `Regla aguas arriba: ${h.H}/${h.H + h.M} aciertos · ${h.median_lead_min ?? '—'} min anticipación mediana · ${h.F} falsa(s) alarma(s).\nLínea base (sensor más cercano): ${nearBase.H}/${nearBase.H + nearBase.M} aciertos · ${nearBase.median_lead_min ?? '—'} min anticipación mediana · ${nearBase.F} falsas alarmas.\nResultado: En este conjunto pequeño de 12 eventos proxy, el emparejamiento aguas arriba no superó al sensor más cercano.`
                : `Upstream rule: ${h.H}/${h.H + h.M} hits · ${h.median_lead_min ?? '—'} min median lead · ${h.F} false alarm.\nNearest-gauge baseline: ${nearBase.H}/${nearBase.H + nearBase.M} hits · ${nearBase.median_lead_min ?? '—'} min median lead · ${nearBase.F} false alarms.\nTakeaway: On this small 12-event proxy sample, upstream pairing did not outperform the nearest-gauge baseline.`}
            </AppText>
          </View>
          <AppText style={{ fontSize: 12.5, lineHeight: 18, color: S.textMuted }}>{t('storms.track_note')}</AppText>
        </Panel>

        {/* Compact Storm Selector + Focused Active Storm Card */}
        <SectionLabel>
          {language === 'es' ? 'SELECCIONA UNA TORMENTA ARCHIVADA' : 'SELECT AN ARCHIVED STORM'}
        </SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {replayIndex.storms.map((entry) => {
            const d = replays[entry.id];
            if (!d) return null;
            const label = language === 'es' ? d.storm.name_es : d.storm.name_en;
            const isRecommended = entry.id === 'memorial-day-2015';
            return (
              <Chip
                key={entry.id}
                icon={isRecommended ? 'star' : 'creeks'}
                label={label}
                active={activeEntry.id === entry.id}
                onPress={() => setSelectedStormId(entry.id)}
              />
            );
          })}
        </View>

        <Panel style={{ borderColor: ACCENT, borderLeftWidth: 4, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 19, lineHeight: 25 }}>{stormName}</AppText>
              <AppText style={{ fontSize: 13, color: S.textMuted }}>
                {stormDate} · {language === 'es' ? 'Observaciones USGS archivadas' : 'Archived USGS observations'}
              </AppText>
            </View>
            <AppText
              style={{
                alignSelf: 'flex-start',
                fontSize: 12.5,
                fontFamily: 'Inter_600SemiBold',
                color: avoidCount ? LOCKED_STATE_HEX.avoid : S.textSecondary,
              }}
            >
              {t('storms.alerts_seen', { count: avoidCount })}
            </AppText>
          </View>
          <AppText style={{ fontSize: 14.5, lineHeight: 21 }}>{t(blurbKey)}</AppText>
          {demo ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FcIcon name="car" size={15} color="#7DD3FC" />
              <AppText style={{ flex: 1, fontSize: 12.5, lineHeight: 18, color: '#7DD3FC', fontFamily: 'Inter_600SemiBold' }}>
                {t('trip.body', { name: cleanName(demo.crossingName) })}
              </AppText>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <ActionButton
              icon="car"
              label={t('storms.car_demo')}
              onPress={() => {
                m.requestTripDemo(activeEntry.id);
                router.navigate('/');
              }}
            />
            <ActionButton
              kind="secondary"
              icon="play"
              label={t('storms.run')}
              onPress={() => {
                m.startDrill(activeEntry.id);
                router.navigate('/');
              }}
            />
            <ActionButton
              kind="secondary"
              icon="flask"
              label={t('storms.science')}
              onPress={() => {
                triggerSampleReplay(activeEntry.id);
                router.push('/lab');
              }}
            />
          </View>
        </Panel>

        <SectionLabel>{t('storms.hotspots_title')}</SectionLabel>
        <AppText style={{ fontSize: 13.5, lineHeight: 19, color: S.textSecondary }}>{t('storms.hotspots_body')}</AppText>
        <View style={{ gap: 8 }}>
          {hotspots.map((g) => (
            <NearbyRow
              key={g.id}
              status={g.primary}
              onPress={() => router.push({ pathname: '/crossing/[id]', params: { id: g.id } })}
            />
          ))}
        </View>

        <SectionLabel>{t('physics.section')}</SectionLabel>
        <FloodPhysicsCard />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCell({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 135,
        padding: 12,
        borderRadius: 12,
        backgroundColor: S.primary,
        borderWidth: 1,
        borderColor: S.borderSubtle,
        gap: 2,
      }}
    >
      <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 21, color, fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
      <AppText style={{ fontSize: 12, lineHeight: 16, color: S.textSecondary }}>{label}</AppText>
    </View>
  );
}
