import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  Pattern,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { AppText } from '@/components/fordcast/UI';
import { visibleSamples, type ReplayDocument, type ReplayGauge } from '@/lib/data';
import { usePreferences } from '@/lib/preferences';
import { gaugeInterruptionActive } from '@/lib/replay-controls';
import {
  HYDROGRAPH_TOKENS,
  LOCKED_STATE_HEX,
  SURFACES,
  TYPOGRAPHY,
  type CrossingStateKey,
} from '@/theme/tokens';

export interface NwpsCategories {
  nwsLid: string;
  action?: number;
  minor?: number;
  mod?: number;
  maj?: number;
}

export const CACHED_NWPS_CATEGORIES_BY_GAUGE: Record<string, NwpsCategories> = {
  'USGS-08158930': {
    nwsLid: 'AAIT2',
    minor: 13,
    mod: 14,
    maj: 18,
  },
  'USGS-08159000': {
    nwsLid: 'ATIT2',
    action: 15,
    minor: 17,
    mod: 23,
    maj: 27,
  },
  'USGS-08155300': {
    nwsLid: 'ABTT2',
    action: 6,
    minor: 8,
    mod: 11,
    maj: 12,
  },
};

export const EQUIPPED_NWPS_CROSSING_IDS = new Set([
  'atx-15',
  'atx-16',
  'atx-19',
  'atx-20',
  'atx-21',
  'tc-167',
]);

/**
 * Pure deterministic linear scale transforms (~20 lines, zero external charting dependencies).
 */
export function scaleTime(
  domainStartMs: number,
  domainEndMs: number,
  rangeStartPx: number,
  rangeEndPx: number,
) {
  const span = Math.max(1, domainEndMs - domainStartMs);
  const width = rangeEndPx - rangeStartPx;
  return (tMs: number) =>
    Math.max(
      rangeStartPx,
      Math.min(rangeEndPx, rangeStartPx + ((tMs - domainStartMs) / span) * width),
    );
}

export function scaleLinear(
  domainMin: number,
  domainMax: number,
  rangeTopPx: number,
  rangeBottomPx: number,
) {
  const span = Math.max(1, domainMax - domainMin);
  const height = rangeBottomPx - rangeTopPx;
  return (val: number) =>
    Math.max(
      rangeTopPx,
      Math.min(rangeBottomPx, rangeBottomPx - ((val - domainMin) / span) * height),
    );
}

function buildSteppedCausalSegments(
  samples: ReturnType<typeof visibleSamples>,
  xScale: (ms: number) => number,
  yScale: (ft: number) => number,
  maxGapMs = 35 * 60_000,
) {
  const pathParts: string[] = [];
  const vertices: { x: number; y: number; stageFt: number; t: number }[] = [];

  let prevSample: { x: number; y: number; t: number } | null = null;
  for (const s of samples) {
    if (s.stageFt === null || s.inOutage) {
      prevSample = null;
      continue;
    }
    const x = xScale(s.t);
    const y = yScale(s.stageFt);
    vertices.push({ x, y, stageFt: s.stageFt, t: s.t });

    if (!prevSample || s.t - prevSample.t > maxGapMs) {
      pathParts.push(`M${x.toFixed(1)},${y.toFixed(1)}`);
    } else {
      // Stepped-linear transition: never extrapolate across dropout gaps
      pathParts.push(`L${x.toFixed(1)},${prevSample.y.toFixed(1)} L${x.toFixed(1)},${y.toFixed(1)}`);
    }
    prevSample = { x, y, t: s.t };
  }

  return {
    pathD: pathParts.join(' '),
    vertices,
    lastVertex: vertices[vertices.length - 1] ?? null,
  };
}

export default function CausalHydrograph({
  crossingId,
  replay,
  tSim,
  upstreamGaugeId,
  downstreamGaugeId,
  state = 'unknown',
  arrivalWindow = null,
}: {
  crossingId: string;
  replay: ReplayDocument;
  tSim: number;
  upstreamGaugeId?: string;
  downstreamGaugeId?: string;
  state?: CrossingStateKey;
  arrivalWindow?: [number, number] | null;
}) {
  const { language } = usePreferences();
  const isEs = language === 'es';

  const upstreamGauge: ReplayGauge = useMemo(
    () =>
      replay.gauges.find((g) => g.id === upstreamGaugeId) ??
      replay.gauges.find((g) => g.id === 'USGS-08158700') ??
      replay.gauges.find((g) => g.id === 'USGS-08158840') ??
      replay.gauges[0]!,
    [replay.gauges, upstreamGaugeId],
  );

  const downstreamGauge: ReplayGauge = useMemo(
    () =>
      replay.gauges.find((g) => g.id === downstreamGaugeId) ??
      replay.gauges.find((g) => g.id === 'USGS-08159000') ??
      replay.gauges.find((g) => g.id === 'USGS-08158970') ??
      replay.gauges[Math.min(1, replay.gauges.length - 1)]!,
    [replay.gauges, downstreamGaugeId],
  );

  const startMs = Date.parse(replay.storm.start);
  const endMs = Date.parse(replay.storm.end);
  const delayMs = (upstreamGauge.avail_delay_s ?? 3600) * 1000;
  const wireCutoffMs = Math.max(startMs, tSim - delayMs);

  const chartData = useMemo(() => {
    const plotLeft = 44;
    const plotRight = 664;
    const xScale = scaleTime(startMs, endMs, plotLeft, plotRight);

    const upSamples = visibleSamples(upstreamGauge, tSim);
    const dnSamples = visibleSamples(downstreamGauge, tSim);

    const upVals = upstreamGauge.stage_ft.filter((v): v is number => v !== null);
    const dnVals = downstreamGauge.stage_ft.filter((v): v is number => v !== null);
    const nwps = EQUIPPED_NWPS_CROSSING_IDS.has(crossingId)
      ? CACHED_NWPS_CATEGORIES_BY_GAUGE[downstreamGauge.id]
      : undefined;

    const upMax = Math.max(
      15,
      Math.ceil(Math.max(...upVals, upstreamGauge.trigger_ft ?? 12) / 5) * 5,
    );
    const dnMax = Math.max(
      20,
      Math.ceil(
        Math.max(
          ...dnVals,
          downstreamGauge.trigger_ft ?? 15,
          nwps?.maj ?? 0,
        ) / 5,
      ) * 5,
    );

    // Subplot A: y in [18, 118] (100px plot inside 125dp band)
    const yUp = scaleLinear(0, upMax, 18, 118);
    // Subplot B: y in [145, 245] (100px plot inside 125dp band)
    const yDn = scaleLinear(0, dnMax, 145, 245);

    const upTrace = buildSteppedCausalSegments(upSamples, xScale, yUp);
    const dnTrace = buildSteppedCausalSegments(dnSamples, xScale, yDn);

    const xWire = xScale(wireCutoffMs);
    const xNow = xScale(tSim);

    const upInBlackout = gaugeInterruptionActive(upstreamGauge, tSim);
    const dnInBlackout = gaugeInterruptionActive(downstreamGauge, tSim);

    return {
      plotLeft,
      plotRight,
      xScale,
      yUp,
      yDn,
      upMax,
      dnMax,
      upTrace,
      dnTrace,
      xWire,
      xNow,
      upInBlackout,
      dnInBlackout,
      nwps,
    };
  }, [
    crossingId,
    tSim,
    startMs,
    endMs,
    wireCutoffMs,
    upstreamGauge,
    downstreamGauge,
  ]);

  const {
    plotLeft,
    plotRight,
    xScale,
    yUp,
    yDn,
    upMax,
    dnMax,
    upTrace,
    dnTrace,
    xWire,
    xNow,
    upInBlackout,
    dnInBlackout,
    nwps,
  } = chartData;

  const latencyBadgeLabel = isEs
    ? 'BUFFER DE RETRASO DE 60M'
    : '60M TELEMETRY DELAY BUFFER (NO LOOKAHEAD)';

  const formatTimeTick = (ms: number) =>
    new Date(ms).toLocaleTimeString(isEs ? 'es-US' : 'en-US', {
      timeZone: 'America/Chicago',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const summaryA11yLabel = `Causal hydrograph for ${crossingId}. Upstream gauge ${upstreamGauge.id} stage ${
    upTrace.lastVertex ? `${upTrace.lastVertex.stageFt.toFixed(2)} ft` : 'offline'
  }. Downstream reference gauge ${downstreamGauge.id} stage ${
    dnTrace.lastVertex ? `${dnTrace.lastVertex.stageFt.toFixed(2)} ft` : 'offline'
  }. 60 minute causal telemetry latency curtain enforced.`;

  return (
    <View style={{ gap: 8 }}>
      {/* Comparative Blackout Annotation Banner (mounts when downstream gauge drops out) */}
      {(dnInBlackout || upInBlackout) && (
        <View
          testID="telemetry-blackout-comparative-banner"
          role="alert"
          accessibilityRole="alert"
          aria-live="polite"
          accessibilityLiveRegion="polite"
          style={{
            backgroundColor: '#380D1A',
            borderRadius: 10,
            borderWidth: 1.5,
            borderColor: '#FF5470',
            paddingHorizontal: 12,
            paddingVertical: 8,
            gap: 2,
          }}
        >
          <AppText
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontWeight: '700',
              fontSize: 11,
              lineHeight: 15,
              color: '#FF5470',
              fontVariant: ['tabular-nums'],
            }}
          >
            TELEMETRY BLACKOUT (GAUGE OFFLINE) ·{' '}
            {dnInBlackout ? downstreamGauge.id : upstreamGauge.id}
          </AppText>
          <AppText style={[TYPOGRAPHY.bodyCompact, { fontSize: 12, lineHeight: 17, color: '#F8FAFC' }]}>
            {isEs
              ? `Mientras un portal de sensor único queda sin señal durante el apagón de ${downstreamGauge.id}, FordCast mantiene el pronóstico vía el sensor aguas arriba (${upstreamGauge.id}) o degrada honestamente a Desconocido.`
              : `Whereas a single-gauge portal goes blind when ${downstreamGauge.id} drops offline, FordCast leverages upstream gauge ${upstreamGauge.id} across the empirical lag window or degrades honestly to Unknown.`}
          </AppText>
        </View>
      )}

      {/* Dual-Subplot Stacked Single-Axis SVG Canvas */}
      <View
        accessible={true}
        role="img"
        accessibilityRole="image"
        accessibilityLabel={summaryA11yLabel}
        testID="causal-hydrograph"
        style={{
          backgroundColor: SURFACES.dark.elevated1,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: SURFACES.dark.borderSubtle,
          paddingVertical: 8,
          paddingHorizontal: 6,
        }}
      >
        {/* Top Legend & Latency Curtain Callout Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            paddingHorizontal: 8,
            paddingBottom: 6,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <AppText
              style={[
                TYPOGRAPHY.chartAxis,
                { color: HYDROGRAPH_TOKENS.dark.upstreamStroke, fontWeight: '700' },
              ]}
            >
              ■ A: UPSTREAM {upstreamGauge.id} (
              {upTrace.lastVertex && !upInBlackout
                ? `${upTrace.lastVertex.stageFt.toFixed(2)} ft`
                : 'OFFLINE'}
              )
            </AppText>
            <AppText
              style={[
                TYPOGRAPHY.chartAxis,
                { color: HYDROGRAPH_TOKENS.dark.downstreamStroke, fontWeight: '700' },
              ]}
            >
              ■ B: DOWNSTREAM {downstreamGauge.id} (
              {dnTrace.lastVertex && !dnInBlackout
                ? `${dnTrace.lastVertex.stageFt.toFixed(2)} ft`
                : 'OFFLINE'}
              )
            </AppText>
          </View>
          <View
            style={{
              backgroundColor: 'rgba(245, 166, 35, 0.16)',
              borderRadius: 6,
              borderWidth: 1,
              borderColor: '#F5A623',
              paddingHorizontal: 7,
              paddingVertical: 2,
            }}
          >
            <AppText
              style={[
                TYPOGRAPHY.chartAxis,
                { color: '#F5A623', fontSize: 10, fontWeight: '700' },
              ]}
            >
              {latencyBadgeLabel}
            </AppText>
          </View>
        </View>

        <Svg width="100%" height={270} viewBox="0 0 680 270">
          <Defs>
            {/* Zone 2: 45-degree Amber Diagonal Hatch Pattern for 60m Latency Curtain */}
            <Pattern
              id="latencyHatch"
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
              patternTransform="rotate(45)"
            >
              <Rect width="8" height="8" fill={HYDROGRAPH_TOKENS.dark.latencyCurtain} />
              <Line x1="0" y1="0" x2="0" y2="8" stroke="#F5A623" strokeOpacity="0.38" strokeWidth="2" />
            </Pattern>

            {/* Zone 4: Crimson Cross-Hatch Pattern for Telemetry Blackout */}
            <Pattern
              id="blackoutHatch"
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
              patternTransform="rotate(45)"
            >
              <Rect width="8" height="8" fill={HYDROGRAPH_TOKENS.dark.blackoutZone} />
              <Line x1="0" y1="0" x2="0" y2="8" stroke="#FF5470" strokeOpacity="0.45" strokeWidth="1.8" />
              <Line x1="0" y1="0" x2="8" y2="0" stroke="#FF5470" strokeOpacity="0.45" strokeWidth="1.8" />
            </Pattern>
          </Defs>

          {/* ================= SUBPLOT A: UPSTREAM GAUGE (y: 18..118) ================= */}
          {/* Zone 1: Confirmed Wire History Background */}
          <Rect
            x={plotLeft}
            y={18}
            width={Math.max(0, xWire - plotLeft)}
            height={100}
            fill={SURFACES.dark.elevated1}
          />
          {/* Zone 2: 60-Min Causal Latency Curtain */}
          {xNow > xWire && (
            <Rect
              x={xWire}
              y={18}
              width={Math.max(2, xNow - xWire)}
              height={100}
              fill="url(#latencyHatch)"
            />
          )}
          {/* Zone 3: Locked Future Timeline (t > t_sim) */}
          {plotRight > xNow && (
            <Rect
              x={xNow}
              y={18}
              width={Math.max(0, plotRight - xNow)}
              height={100}
              fill={SURFACES.dark.lockedFuture}
            />
          )}

          {/* Subplot A Horizontal Stage Rules */}
          {[0, 0.5, 1].map((frac) => {
            const val = Math.round(upMax * frac);
            const y = yUp(val);
            return (
              <G key={`up-grid-${frac}`}>
                <Line
                  x1={plotLeft}
                  y1={y}
                  x2={plotRight}
                  y2={y}
                  stroke={SURFACES.dark.borderSubtle}
                  strokeWidth={1}
                />
                <SvgText x={6} y={y + 4} fill={SURFACES.dark.textSecondary} fontSize={10}>
                  {val}ft
                </SvgText>
              </G>
            );
          })}

          {/* Zone 4: Upstream Outage Overlay */}
          {upstreamGauge.outages.map((o, idx) => {
            const ox1 = Math.max(plotLeft, xScale(Date.parse(o.start)));
            const ox2 = Math.min(plotRight, xScale(Date.parse(o.end)));
            return (
              <G key={`up-outage-${idx}`}>
                <Rect
                  x={ox1}
                  y={18}
                  width={Math.max(4, ox2 - ox1)}
                  height={100}
                  fill="url(#blackoutHatch)"
                />
                <SvgText x={ox1 + 6} y={32} fill="#FF5470" fontSize={9} fontWeight="bold">
                  TELEMETRY BLACKOUT (GAUGE OFFLINE)
                </SvgText>
              </G>
            );
          })}

          {/* Upstream Empirical Trigger Threshold Line */}
          {upstreamGauge.trigger_ft != null && (
            <G>
              <Line
                x1={plotLeft}
                y1={yUp(upstreamGauge.trigger_ft)}
                x2={plotRight}
                y2={yUp(upstreamGauge.trigger_ft)}
                stroke={LOCKED_STATE_HEX.watch}
                strokeWidth={1.5}
                strokeDasharray="6, 4"
              />
              <SvgText
                x={plotLeft + 6}
                y={Math.max(28, yUp(upstreamGauge.trigger_ft) - 4)}
                fill={LOCKED_STATE_HEX.watch}
                fontSize={9}
                fontWeight="bold"
              >
                TRIGGER {upstreamGauge.trigger_ft.toFixed(1)} FT
              </SvgText>
            </G>
          )}

          {/* Upstream Confirmed Stepped Curve & 3.5px Vertices */}
          {upTrace.pathD ? (
            <Path
              d={upTrace.pathD}
              stroke={HYDROGRAPH_TOKENS.dark.upstreamStroke}
              strokeWidth={2.5}
              fill="none"
            />
          ) : null}
          {upTrace.vertices.map((pt, idx) => (
            <Circle
              key={`up-pt-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={3.5}
              fill={HYDROGRAPH_TOKENS.dark.upstreamStroke}
            />
          ))}
          {upTrace.lastVertex && !upInBlackout && (
            <G>
              <Circle
                cx={upTrace.lastVertex.x}
                cy={upTrace.lastVertex.y}
                r={6}
                fill="none"
                stroke={HYDROGRAPH_TOKENS.dark.upstreamStroke}
                strokeWidth={2}
              />
              <SvgText
                x={Math.min(plotRight - 72, Math.max(plotLeft + 4, upTrace.lastVertex.x - 32))}
                y={Math.max(28, upTrace.lastVertex.y - 8)}
                fill={HYDROGRAPH_TOKENS.dark.upstreamStroke}
                fontSize={9}
                fontWeight="bold"
              >
                LAST ON WIRE
              </SvgText>
            </G>
          )}

          {/* ================= SUBPLOT B: DOWNSTREAM GAUGE (y: 145..245) ================= */}
          {/* Zone 1: Confirmed Wire History Background */}
          <Rect
            x={plotLeft}
            y={145}
            width={Math.max(0, xWire - plotLeft)}
            height={100}
            fill={SURFACES.dark.elevated1}
          />
          {/* Zone 2: 60-Min Causal Latency Curtain */}
          {xNow > xWire && (
            <Rect
              x={xWire}
              y={145}
              width={Math.max(2, xNow - xWire)}
              height={100}
              fill="url(#latencyHatch)"
            />
          )}
          {/* Zone 3: Locked Future Timeline (t > t_sim) */}
          {plotRight > xNow && (
            <Rect
              x={xNow}
              y={145}
              width={Math.max(0, plotRight - xNow)}
              height={100}
              fill={SURFACES.dark.lockedFuture}
            />
          )}

          {/* Forward Arrival Window Projection Box in Zone 3 when Watch or Avoid */}
          {(state === 'watch' || state === 'avoid') && arrivalWindow && (
            <Rect
              x={xScale(tSim + arrivalWindow[0] * 60_000)}
              y={145}
              width={Math.max(
                6,
                xScale(tSim + arrivalWindow[1] * 60_000) -
                  xScale(tSim + arrivalWindow[0] * 60_000),
              )}
              height={100}
              fill={state === 'avoid' ? 'rgba(255, 84, 112, 0.18)' : 'rgba(245, 166, 35, 0.18)'}
              stroke={state === 'avoid' ? '#FF5470' : '#F5A623'}
              strokeWidth={1.2}
              strokeDasharray="4, 3"
            />
          )}

          {/* Subplot B Horizontal Stage Rules */}
          {[0, 0.5, 1].map((frac) => {
            const val = Math.round(dnMax * frac);
            const y = yDn(val);
            return (
              <G key={`dn-grid-${frac}`}>
                <Line
                  x1={plotLeft}
                  y1={y}
                  x2={plotRight}
                  y2={y}
                  stroke={SURFACES.dark.borderSubtle}
                  strokeWidth={1}
                />
                <SvgText x={6} y={y + 4} fill={SURFACES.dark.textSecondary} fontSize={10}>
                  {val}ft
                </SvgText>
              </G>
            );
          })}

          {/* Cached NOAA NWPS Proxy Category Horizontals (6 Equipped Tier B Crossings) */}
          {nwps?.action != null && (
            <Line
              x1={plotLeft}
              y1={yDn(nwps.action)}
              x2={plotRight}
              y2={yDn(nwps.action)}
              stroke={HYDROGRAPH_TOKENS.dark.nwps.action}
              strokeWidth={1.5}
              strokeDasharray="6, 4"
            />
          )}
          {nwps?.minor != null && (
            <Line
              x1={plotLeft}
              y1={yDn(nwps.minor)}
              x2={plotRight}
              y2={yDn(nwps.minor)}
              stroke={HYDROGRAPH_TOKENS.dark.nwps.minor}
              strokeWidth={1.5}
              strokeDasharray="6, 4"
            />
          )}
          {nwps?.mod != null && (
            <Line
              x1={plotLeft}
              y1={yDn(nwps.mod)}
              x2={plotRight}
              y2={yDn(nwps.mod)}
              stroke={HYDROGRAPH_TOKENS.dark.nwps.mod}
              strokeWidth={1.5}
              strokeDasharray="6, 4"
            />
          )}
          {nwps?.maj != null && (
            <Line
              x1={plotLeft}
              y1={yDn(nwps.maj)}
              x2={plotRight}
              y2={yDn(nwps.maj)}
              stroke={HYDROGRAPH_TOKENS.dark.nwps.maj}
              strokeWidth={1.5}
              strokeDasharray="6, 4"
            />
          )}

          {/* Zone 4: Downstream Outage Overlay */}
          {downstreamGauge.outages.map((o, idx) => {
            const ox1 = Math.max(plotLeft, xScale(Date.parse(o.start)));
            const ox2 = Math.min(plotRight, xScale(Date.parse(o.end)));
            return (
              <G key={`dn-outage-${idx}`}>
                <Rect
                  x={ox1}
                  y={145}
                  width={Math.max(4, ox2 - ox1)}
                  height={100}
                  fill="url(#blackoutHatch)"
                />
                <SvgText x={ox1 + 6} y={160} fill="#FF5470" fontSize={9} fontWeight="bold">
                  TELEMETRY BLACKOUT (GAUGE OFFLINE)
                </SvgText>
              </G>
            );
          })}

          {/* Downstream Confirmed Stepped Curve & 3.5px Vertices */}
          {dnTrace.pathD ? (
            <Path
              d={dnTrace.pathD}
              stroke={HYDROGRAPH_TOKENS.dark.downstreamStroke}
              strokeWidth={2.5}
              fill="none"
            />
          ) : null}
          {dnTrace.vertices.map((pt, idx) => (
            <Circle
              key={`dn-pt-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={3.5}
              fill={HYDROGRAPH_TOKENS.dark.downstreamStroke}
            />
          ))}
          {dnTrace.lastVertex && !dnInBlackout && (
            <G>
              <Circle
                cx={dnTrace.lastVertex.x}
                cy={dnTrace.lastVertex.y}
                r={6}
                fill="none"
                stroke={HYDROGRAPH_TOKENS.dark.downstreamStroke}
                strokeWidth={2}
              />
              <SvgText
                x={Math.min(plotRight - 72, Math.max(plotLeft + 4, dnTrace.lastVertex.x - 32))}
                y={Math.max(155, dnTrace.lastVertex.y - 8)}
                fill={HYDROGRAPH_TOKENS.dark.downstreamStroke}
                fontSize={9}
                fontWeight="bold"
              >
                LAST ON WIRE
              </SvgText>
            </G>
          )}

          {/* Shared Vertical Wire Cutoff & NOW (t_sim) Cursors */}
          <Line
            x1={xWire}
            y1={14}
            x2={xWire}
            y2={248}
            stroke="#F5A623"
            strokeWidth={1.2}
            strokeDasharray="3, 3"
          />
          <Line
            x1={xNow}
            y1={14}
            x2={xNow}
            y2={248}
            stroke="#F8FAFC"
            strokeWidth={2}
          />
          <SvgText
            x={Math.min(plotRight - 65, Math.max(plotLeft, xNow - 24))}
            y={12}
            fill="#F8FAFC"
            fontSize={9}
            fontWeight="bold"
          >
            NOW ({formatTimeTick(tSim)})
          </SvgText>

          {/* Shared Bottom Time Axis (20dp band: y 250..270) */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const tickMs = startMs + (endMs - startMs) * frac;
            const x = plotLeft + (plotRight - plotLeft) * frac;
            const isFuture = tickMs > tSim;
            return (
              <SvgText
                key={`t-tick-${frac}`}
                x={Math.max(plotLeft, Math.min(plotRight - 34, x - 14))}
                y={264}
                fill={isFuture ? '#475569' : SURFACES.dark.textSecondary}
                fontSize={10}
              >
                {formatTimeTick(tickMs)}
              </SvgText>
            );
          })}
        </Svg>

        {/* NOAA NWPS Proxy Stage Callout Pill (for the 6 equipped Tier B crossings) */}
        {nwps && (
          <View
            testID="nwps-proxy-callout"
            style={{
              marginTop: 6,
              backgroundColor: SURFACES.dark.elevated2,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: SURFACES.dark.borderSubtle,
              paddingHorizontal: 10,
              paddingVertical: 8,
              gap: 4,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <AppText
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontWeight: '700',
                  fontSize: 10,
                  lineHeight: 14,
                  color: '#EAB308',
                }}
              >
                NOAA NWPS PROXY STAGES (CACHED REFERENCE · {nwps.nwsLid})
              </AppText>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {nwps.action != null && (
                  <AppText style={[TYPOGRAPHY.chartAxis, { color: '#EAB308', fontSize: 10 }]}>
                    Action {nwps.action}ft
                  </AppText>
                )}
                {nwps.minor != null && (
                  <AppText style={[TYPOGRAPHY.chartAxis, { color: '#F97316', fontSize: 10 }]}>
                    Minor {nwps.minor}ft
                  </AppText>
                )}
                {nwps.mod != null && (
                  <AppText style={[TYPOGRAPHY.chartAxis, { color: '#EF4444', fontSize: 10 }]}>
                    Mod {nwps.mod}ft
                  </AppText>
                )}
                {nwps.maj != null && (
                  <AppText style={[TYPOGRAPHY.chartAxis, { color: '#C084FC', fontSize: 10 }]}>
                    Maj {nwps.maj}ft
                  </AppText>
                )}
              </View>
            </View>
            <AppText style={{ fontSize: 11, lineHeight: 15, color: SURFACES.dark.textSecondary }}>
              {isEs
                ? 'Las líneas discontinuas muestran las categorías oficiales del Servicio Meteorológico Nacional (Acción, Menor, Moderada, Mayor) en el sensor de referencia. Los cruces viales pueden inundarse antes de alcanzar la etapa Menor.'
                : 'Dashed horizontal lines show official National Weather Service river reach categories (Action, Minor, Moderate, Major) at the reference gauge. Low-water road decks may flood before a river gauge reaches official Minor Flood stage.'}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}
