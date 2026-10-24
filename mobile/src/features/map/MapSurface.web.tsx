import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { AppText, styles } from '@/components/fordcast/UI';
import StateBadge from '@/components/StateBadge';
import {
  creeks,
  gauges,
  links,
  replays,
  stateAt,
  type Crossing,
  type ReplayDocument,
} from '@/lib/data';
import { usePreferences } from '@/lib/preferences';
import { gaugeInterruptionActive } from '@/lib/replay-controls';
import {
  HYDROGRAPH_TOKENS,
  LOCKED_STATE_HEX,
  SURFACES,
  TYPOGRAPHY,
  type CrossingStateKey,
} from '@/theme/tokens';

const toX = (lon: number) => ((lon + 98.15) / 0.65) * 680 + 20;
const toY = (lat: number) => ((30.55 - lat) / 0.5) * 290 + 20;

export default function MapSurface({
  features,
  onSelect,
  replayOverride,
  simTOverride,
  selectedCrossingId,
}: {
  features: Crossing[];
  onSelect: (id: string) => void;
  replayOverride?: ReplayDocument;
  simTOverride?: number;
  selectedCrossingId?: string;
}) {
  const { t, language, activeStormId } = usePreferences();
  const replay = replayOverride ?? replays[activeStormId] ?? replays['halloween-2013']!;
  const simT =
    simTOverride ??
    (replay.hero?.first_alert_at
      ? Date.parse(replay.hero.first_alert_at)
      : Date.parse(replay.storm.start) + 6 * 3600_000);

  const [tierCMode, setTierCMode] = useState<'compact' | 'full'>('compact');
  const [internalSelectedId, setInternalSelectedId] = useState<string>(
    selectedCrossingId ?? features[0]?.properties.id ?? 'atx-7',
  );
  const activeId = selectedCrossingId ?? internalSelectedId;
  const activeFeature =
    features.find((f) => f.properties.id === activeId) ?? features[0] ?? null;

  const tierBFeatures = useMemo(
    () => features.filter((f) => f.properties.tier === 'B' || f.properties.tier === 'A'),
    [features],
  );
  const tierCFeatures = useMemo(
    () => features.filter((f) => f.properties.tier === 'C'),
    [features],
  );

  const activeLinks = useMemo(
    () => (activeFeature ? links.filter((l) => l.crossing_id === activeFeature.properties.id) : []),
    [activeFeature],
  );

  // Representative spiderfied Tier B callouts on canvas so pins never cluster into generic numbers
  const mapPillFeatures = useMemo(() => {
    const base = tierBFeatures.slice(0, 8);
    if (
      activeFeature &&
      activeFeature.properties.tier !== 'C' &&
      !base.some((f) => f.properties.id === activeFeature.properties.id)
    ) {
      return [activeFeature, ...base.slice(0, 7)];
    }
    return base;
  }, [tierBFeatures, activeFeature]);

  return (
    <View
      testID="tactical-map-surface"
      style={{
        backgroundColor: SURFACES.dark.canvasMap,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: SURFACES.dark.borderSubtle,
      }}
    >
      {/* Top Map Layer Control Strip */}
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: SURFACES.dark.borderSubtle,
          backgroundColor: SURFACES.dark.elevated1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <View style={{ gap: 1 }}>
          <AppText style={{ fontFamily: 'Inter_600SemiBold', fontWeight: '700', fontSize: 13 }}>
            {t('map.preview')}
          </AppText>
          <AppText style={{ fontSize: 11, color: SURFACES.dark.textSecondary }}>
            {t('map.preview_body')}
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Pressable
            testID="tier-c-layer-toggle"
            role="button"
            accessibilityRole="button"
            accessibilityLabel={`${language === 'es' ? 'Cruces sin sensor' : 'Crossings without sensors'} (${tierCFeatures.length}) · ${tierCMode === 'compact' ? (language === 'es' ? 'Resumen' : 'Compact') : (language === 'es' ? 'Detalle' : 'Full')}`}
            onPress={() => setTierCMode((m) => (m === 'compact' ? 'full' : 'compact'))}
            style={{
              height: 28,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: SURFACES.dark.elevated2,
              borderWidth: 1,
              borderColor: LOCKED_STATE_HEX.unknown,
              justifyContent: 'center',
            }}
          >
            <AppText
              style={[
                TYPOGRAPHY.chartAxis,
                { color: SURFACES.dark.textPrimary, fontSize: 10, fontWeight: '700' },
              ]}
            >
              {`${language === 'es' ? 'Cruces sin sensor' : 'Crossings without sensors'} (${tierCFeatures.length}) · ${tierCMode === 'compact' ? (language === 'es' ? 'Resumen' : 'Compact') : (language === 'es' ? 'Detalle' : 'Full')}`}
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* Vector Watershed Canvas (#070B12 land, #0D192B water corridors) */}
      <Svg width="100%" height={310} viewBox="0 0 720 310" accessibilityLabel={t('map.preview')}>
        <Rect x={0} y={0} width={720} height={310} fill={SURFACES.dark.canvasMap} />

        {/* Subtle Topographic Radar Grid */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Line
            key={`v${i}`}
            x1={i * 90}
            y1={0}
            x2={i * 90}
            y2={310}
            stroke={SURFACES.dark.borderSubtle}
            strokeOpacity={0.55}
            strokeDasharray="2, 6"
          />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <Line
            key={`h${i}`}
            x1={0}
            y1={i * 85}
            x2={720}
            y2={i * 85}
            stroke={SURFACES.dark.borderSubtle}
            strokeOpacity={0.55}
            strokeDasharray="2, 6"
          />
        ))}

        {/* Basin Watermarks */}
        <SvgText x={465} y={48} fill="#64748B" fillOpacity={0.55} fontSize={10} fontWeight="bold">
          BULL / SHOAL BASINS
        </SvgText>
        <SvgText x={380} y={175} fill="#64748B" fillOpacity={0.55} fontSize={10} fontWeight="bold">
          WILLIAMSON CREEK
        </SvgText>
        <SvgText x={300} y={248} fill="#2BD9D9" fillOpacity={0.55} fontSize={10} fontWeight="bold">
          ONION CREEK CORRIDOR
        </SvgText>

        {/* Creek Corridors (#0D192B water channel + cyan schematic flowline) */}
        {creeks.map((reach) => {
          const pts = reach.geometry.coordinates;
          const d = pts
            .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${toX(pt[0] ?? 0)},${toY(pt[1] ?? 0)}`)
            .join(' ');
          return (
            <G key={reach.properties.reach_id}>
              <Path
                d={d}
                stroke={SURFACES.dark.canvasWater}
                strokeWidth={9}
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d={d}
                stroke={HYDROGRAPH_TOKENS.dark.upstreamStroke}
                strokeOpacity={0.5}
                strokeWidth={2}
                strokeDasharray="5, 3"
                fill="none"
              />
            </G>
          );
        })}

        {/* Active Crossing-to-Gauge Hydrological Linkage Vector + X Break on Outage */}
        {activeFeature &&
          activeLinks.map((lnk) => {
            const gFeat = gauges.find((g) => g.properties.id === lnk.gauge_id);
            if (!gFeat) return null;
            const [cLon = 0, cLat = 0] = activeFeature.geometry.coordinates;
            const [gLon = 0, gLat = 0] = gFeat.geometry.coordinates;
            const cx = toX(cLon);
            const cy = toY(cLat);
            const gx = toX(gLon);
            const gy = toY(gLat);
            const replayGauge = replay.gauges.find((rg) => rg.id === lnk.gauge_id);
            const isOutage = replayGauge ? gaugeInterruptionActive(replayGauge, simT) : false;

            return (
              <G key={`link-vec-${lnk.crossing_id}-${lnk.gauge_id}`}>
                <Line
                  x1={gx}
                  y1={gy}
                  x2={cx}
                  y2={cy}
                  stroke={isOutage ? '#FF5470' : '#38BDF8'}
                  strokeWidth={2.2}
                  strokeDasharray="6, 4"
                />
                {isOutage && (
                  <G>
                    <Circle
                      cx={(gx + cx) / 2}
                      cy={(gy + cy) / 2}
                      r={9}
                      fill="#380D1A"
                      stroke="#FF5470"
                      strokeWidth={1.8}
                    />
                    <Path
                      d={`M${(gx + cx) / 2 - 4},${(gy + cy) / 2 - 4} L${(gx + cx) / 2 + 4},${(gy + cy) / 2 + 4} M${(gx + cx) / 2 + 4},${(gy + cy) / 2 - 4} L${(gx + cx) / 2 - 4},${(gy + cy) / 2 + 4}`}
                      stroke="#FF5470"
                      strokeWidth={2}
                    />
                  </G>
                )}
              </G>
            );
          })}

        {/* LAYER 1 (zIndex 10): 111 Tier C Unmonitored Crossings (8px dashed slate micro-nodes) */}
        {tierCFeatures.map((feature) => {
          const [lon = 0, lat = 0] = feature.geometry.coordinates;
          const cx = toX(lon);
          const cy = toY(lat);
          const isSelected = activeFeature?.properties.id === feature.properties.id;
          return (
            <Circle
              key={feature.properties.id}
              cx={cx}
              cy={cy}
              r={isSelected ? 7 : tierCMode === 'full' ? 5.5 : 4}
              fill="#1A2232"
              fillOpacity={isSelected ? 1 : 0.55}
              stroke={isSelected ? '#5294FF' : '#7A879C'}
              strokeWidth={isSelected ? 2 : 1.2}
              strokeDasharray="2.5, 2"
            />
          );
        })}

        {/* LAYER 2: 19 USGS Stream Gauge Diamond Telemetry Nodes */}
        {gauges.map((g) => {
          const [lon = 0, lat = 0] = g.geometry.coordinates;
          const gx = toX(lon);
          const gy = toY(lat);
          const rg = replay.gauges.find((item) => item.id === g.properties.id);
          const inOutage = rg ? gaugeInterruptionActive(rg, simT) : false;
          return (
            <G key={g.properties.id}>
              <Polygon
                points={`${gx},${gy - 6} ${gx + 6},${gy} ${gx},${gy + 6} ${gx - 6},${gy}`}
                fill={inOutage ? '#380D1A' : '#0D192B'}
                stroke={inOutage ? '#FF5470' : '#38BDF8'}
                strokeWidth={1.6}
              />
              {inOutage && (
                <Path
                  d={`M${gx - 4},${gy - 4} L${gx + 4},${gy + 4} M${gx + 4},${gy - 4} L${gx - 4},${gy + 4}`}
                  stroke="#FF5470"
                  strokeWidth={1.8}
                />
              )}
            </G>
          );
        })}

        {/* LAYER 3 (zIndex 80-100): 30 Tier B Monitored Corridor Crossings */}
        {tierBFeatures.map((feature) => {
          const [lon = 0, lat = 0] = feature.geometry.coordinates;
          const cx = toX(lon);
          const cy = toY(lat);
          const slice = stateAt(replay, feature.properties.id, simT);
          const st: CrossingStateKey = slice.state;
          const hex = LOCKED_STATE_HEX[st];
          const isSelected = activeFeature?.properties.id === feature.properties.id;
          const isDropout = st === 'unknown';

          return (
            <G key={feature.properties.id}>
              {/* Pulsing amber/slate dropout or focus halo */}
              {(isSelected || isDropout) && (
                <Circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 12 : 9.5}
                  fill="none"
                  stroke={isSelected ? '#5294FF' : '#F5A623'}
                  strokeOpacity={isSelected ? 0.9 : 0.55}
                  strokeWidth={isSelected ? 2 : 1.4}
                  strokeDasharray={isDropout && !isSelected ? '3, 2' : undefined}
                />
              )}
              <Circle
                cx={cx}
                cy={cy}
                r={isSelected ? 7.5 : 6}
                fill="#0B101B"
                stroke={hex}
                strokeWidth={2.2}
              />
            </G>
          );
        })}

        <SvgText x={14} y={298} fill="#64748B" fontSize={10}>
          {t('map.coordinate_caption')}
        </SvgText>
        <SvgText x={520} y={298} fill="#64748B" fontSize={10}>
          {t('map.catalog_caption', { gauges: gauges.length, count: features.length })}
        </SvgText>
      </Svg>

      {/* Tier B Compact Tactical Pills Strip (26px height, 16px SVG State Shape + Locked Hex + Word) */}
      <View
        testID="tier-b-tactical-pills-bar"
        style={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: SURFACES.dark.primary,
          borderTopWidth: 1,
          borderTopColor: SURFACES.dark.borderSubtle,
          gap: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <AppText style={[TYPOGRAPHY.chartAxis, { color: SURFACES.dark.textSecondary, fontSize: 10 }]}>
            TIER B MONITORED CORRIDOR PILLS (26PX TRIPLE-REDUNDANCY) · TAP TO INSPECT
          </AppText>
          {tierCMode === 'full' && tierCFeatures[0] && (
            <StateBadge
              state="unknown"
              size={16}
              unmonitored={true}
              compactMapPill={true}
            />
          )}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {mapPillFeatures.map((f) => {
            const slice = stateAt(replay, f.properties.id, simT);
            const isSel = activeFeature?.properties.id === f.properties.id;
            const shortRoad = f.properties.name.split(' at ')[0] ?? f.properties.name;
            return (
              <Pressable
                key={f.properties.id}
                role="button"
                accessibilityRole="button"
                accessibilityLabel={`${f.properties.name} ${t(`state.${slice.state}`)}`}
                onPress={() => {
                  setInternalSelectedId(f.properties.id);
                  onSelect(f.properties.id);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingRight: 8,
                  borderRadius: 14,
                  backgroundColor: isSel ? '#1C2740' : '#131B2E',
                  borderWidth: isSel ? 1.5 : 1,
                  borderColor: isSel ? '#5294FF' : '#23304D',
                }}
              >
                <StateBadge state={slice.state} size={16} compactMapPill={true} />
                <AppText
                  numberOfLines={1}
                  style={{
                    fontSize: 11,
                    lineHeight: 14,
                    color: isSel ? '#F8FAFC' : '#94A3B8',
                    fontFamily: 'Inter_600SemiBold',
                  }}
                >
                  {shortRoad}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Active Crossing / Upstream Telemetry Footer Bar */}
      {activeFeature && (
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: SURFACES.dark.elevated1,
            borderTopWidth: 1,
            borderTopColor: SURFACES.dark.borderSubtle,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#F8FAFC' }}>
              {activeFeature.properties.name}{' '}
              <AppText style={[TYPOGRAPHY.chartAxis, { color: '#38BDF8' }]}>
                ({activeFeature.properties.id} · Tier {activeFeature.properties.tier})
              </AppText>
            </AppText>
            <AppText style={styles.footer}>
              {activeFeature.properties.creek ?? 'Watershed crossing'} · {t('map.attribution')}
            </AppText>
          </View>
          <Pressable
            role="button"
            accessibilityRole="button"
            accessibilityLabel={language === 'es' ? `Ver ${activeFeature.properties.name}` : `Inspect ${activeFeature.properties.name}`}
            onPress={() => onSelect(activeFeature.properties.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: SURFACES.dark.elevated2,
              borderWidth: 1,
              borderColor: '#5294FF',
            }}
          >
            <AppText style={{ fontSize: 12, color: '#F8FAFC', fontFamily: 'Inter_600SemiBold' }}>
              {language === 'es' ? 'Ver ficha →' : 'Inspect Sheet →'}
            </AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}
