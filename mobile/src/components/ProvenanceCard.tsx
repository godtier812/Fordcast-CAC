import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import Svg, { Line, Path, Polygon } from 'react-native-svg';
import { AppText } from '@/components/fordcast/UI';
import ValidationScorecardModal from '@/components/ValidationScorecardModal';
import { crossings, gauges, links, type Crossing } from '@/lib/data';
import { usePreferences } from '@/lib/preferences';
import {
  HYDROGRAPH_TOKENS,
  LOCKED_STATE_HEX,
  SURFACES,
  TYPOGRAPHY,
  type CrossingStateKey,
} from '@/theme/tokens';

export const PROVENANCE_LADDER_COPY = {
  en: {
    passportTitle: 'EVIDENCE & LIMITATIONS (TIER LADDER)',
    tierATitle: 'TIER A (0 Crossings) · Surveyed Road-Deck + Field Validation',
    tierATelemetry: 'calibration_kind: "surveyed_overtop" • requires road-surface validation',
    tierABody:
      'Requires surveyed road-deck overtop elevation AND field-verified road inundation observations. Currently 0 crossings in the public dataset.',
    tierBTitle: 'TIER B (30 Crossings) · Research Candidates (6 Live Calibrated Links)',
    tierBTelemetry: 'calibration_kind: "empirical_gauge_lag" • road_forecast_verified: false',
    tierBBody:
      '30 research candidates paired with upstream/downstream USGS stream gauges (6 with live calibrated links). Triggers reflect gauge-to-gauge propagation proxies, not road-surface depth.',
    tierCTitle: 'TIER C (111 Crossings) · Unmonitored Municipal Catalog',
    tierCTelemetry: 'calibration_kind: "none" • State locked to unknown ("Not monitored")',
    tierCBody:
      'Cataloged Travis County low-water crossing without a verified upstream USGS gauge pairing. Displayed as Unknown to prevent false reassurance.',
    lagLabel: 'Gauge-to-gauge lag proxy (road unverified)',
    scorecardCta: 'View LOSO Backtest Scorecard (10/12 detected, 83.3% POD)',
    hideScorecardCta: 'Hide LOSO Backtest Scorecard',
  },
  es: {
    passportTitle: 'EVIDENCIA Y LIMITACIONES (ESCALA DE NIVELES)',
    tierATitle: 'NIVEL A (0 Cruces) · Elevación Vial + Validación en Campo',
    tierATelemetry: 'calibration_kind: "surveyed_overtop" • requiere validación en pavimento',
    tierABody:
      'Requiere elevación topográfica de desborde vial Y observaciones verificadas de inundación en el camino. Actualmente 0 cruces en el catálogo público.',
    tierBTitle: 'NIVEL B (30 Cruces) · Candidatos de Investigación (6 Vínculos En Vivo)',
    tierBTelemetry: 'calibration_kind: "empirical_gauge_lag" • road_forecast_verified: false',
    tierBBody:
      '30 candidatos de investigación asociados a sensores USGS (6 con vínculo calibrado en vivo). Los umbrales reflejan desfases entre sensores, no nivel de agua sobre el pavimento.',
    tierCTitle: 'NIVEL C (111 Cruces) · Catálogo Municipal Sin Monitoreo',
    tierCTelemetry: 'calibration_kind: "none" • Estado bloqueado en desconocido ("Sin monitoreo")',
    tierCBody:
      'Cruce catalogado del Condado de Travis sin vinculación verificada con un sensor USGS aguas arriba. Se muestra como Desconocido para evitar falsa tranquilidad.',
    lagLabel: 'Desfase entre sensores (vía no verificada)',
    scorecardCta: 'Ver Tarjeta de Validación LOSO (10/12 detectados, 83.3% POD)',
    hideScorecardCta: 'Ocultar Tarjeta de Validación LOSO',
  },
} as const;

export function CorridorPropagationBar({
  crossingId,
  upstreamStageFt,
  upstreamSlopeFtHr,
  downstreamStageFt,
  state = 'unknown',
}: {
  crossingId: string;
  upstreamStageFt?: number | null;
  upstreamSlopeFtHr?: number | null;
  downstreamStageFt?: number | null;
  state?: CrossingStateKey;
}) {
  const { language } = usePreferences();
  const copy = language === 'es' ? PROVENANCE_LADDER_COPY.es : PROVENANCE_LADDER_COPY.en;
  const crossing = crossings.find((c) => c.properties.id === crossingId);
  const cLinks = links.filter((l) => l.crossing_id === crossingId);
  const primaryLink = cLinks[0];
  const upGauge = gauges.find((g) => g.properties.id === primaryLink?.gauge_id);
  const targetGaugeId = crossing?.properties.target_gauge_id ?? 'USGS-08159000';

  const isEscalated = state === 'watch' || state === 'avoid' || state === 'closed';
  const nodeColor =
    state === 'avoid' || state === 'closed'
      ? LOCKED_STATE_HEX.avoid
      : state === 'watch'
        ? LOCKED_STATE_HEX.watch
        : HYDROGRAPH_TOKENS.dark.upstreamStroke;

  const tauLo = primaryLink?.tau_lo_min ?? 60;
  const tauHi = primaryLink?.tau_hi_min ?? 120;
  const distKm = primaryLink?.channel_dist_km ?? 8.5;

  return (
    <View
      testID="corridor-propagation-bar"
      style={{
        minHeight: 68,
        borderRadius: 10,
        backgroundColor: SURFACES.dark.elevated2,
        borderWidth: 1,
        borderColor: isEscalated ? nodeColor : SURFACES.dark.borderSubtle,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
      }}
    >
      {/* Left Node: Upstream Trigger Gauge */}
      <View style={{ flex: 1, minWidth: 150, gap: 2 }}>
        <AppText
          style={[
            TYPOGRAPHY.chartAxis,
            { color: HYDROGRAPH_TOKENS.dark.upstreamStroke, fontWeight: '700' },
          ]}
        >
          ◆ {primaryLink?.gauge_id ?? 'USGS-08158700'} · {upGauge?.properties.name ?? 'Upstream'}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <AppText
            style={[
              TYPOGRAPHY.metricValue,
              {
                fontSize: 16,
                lineHeight: 20,
                color: HYDROGRAPH_TOKENS.dark.upstreamStroke,
              },
            ]}
          >
            h_u = {upstreamStageFt != null ? `${upstreamStageFt.toFixed(2)} ft` : '—'}
          </AppText>
          {upstreamSlopeFtHr != null && (
            <View
              style={{
                backgroundColor: isEscalated ? 'rgba(245, 166, 35, 0.18)' : SURFACES.dark.elevated1,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: isEscalated ? nodeColor : SURFACES.dark.borderSubtle,
                paddingHorizontal: 6,
                paddingVertical: 1,
              }}
            >
              <AppText
                style={[
                  TYPOGRAPHY.chartAxis,
                  {
                    color: isEscalated ? nodeColor : SURFACES.dark.textSecondary,
                    fontWeight: '700',
                  },
                ]}
              >
                {upstreamSlopeFtHr >= 0 ? '▲ +' : '▼ '}
                {upstreamSlopeFtHr.toFixed(1)} ft/hr
              </AppText>
            </View>
          )}
        </View>
      </View>

      {/* Center Lag Conduit */}
      <View style={{ alignItems: 'center', minWidth: 135, gap: 2 }}>
        <AppText
          style={[
            TYPOGRAPHY.chartAxis,
            {
              color: LOCKED_STATE_HEX.watch,
              fontWeight: '700',
              fontSize: 11,
            },
          ]}
        >
          [τ = {tauLo}–{tauHi}m · {distKm.toFixed(1)} km]
        </AppText>
        <Svg width={128} height={14} viewBox="0 0 128 14">
          <Line
            x1={4}
            y1={7}
            x2={114}
            y2={7}
            stroke={nodeColor}
            strokeWidth={2}
            strokeDasharray="5, 3"
          />
          <Polygon points="114,3 124,7 114,11" fill={nodeColor} />
        </Svg>
        <AppText style={{ fontSize: 10, lineHeight: 13, color: SURFACES.dark.textSecondary }}>
          {copy.lagLabel}
        </AppText>
      </View>

      {/* Right Node: Target Crossing & Downstream Reference Gauge */}
      <View style={{ flex: 1, minWidth: 150, alignItems: 'flex-end', gap: 2 }}>
        <AppText
          style={[
            TYPOGRAPHY.chartAxis,
            { color: HYDROGRAPH_TOKENS.dark.downstreamStroke, fontWeight: '700' },
          ]}
        >
          ● {crossing?.properties.name ?? crossingId}
        </AppText>
        <AppText
          style={[
            TYPOGRAPHY.chartAxis,
            { color: SURFACES.dark.textSecondary },
          ]}
        >
          Ref {targetGaugeId}{' '}
          {downstreamStageFt != null ? `(${downstreamStageFt.toFixed(2)} ft)` : ''}
        </AppText>
      </View>
    </View>
  );
}

export default function ProvenanceCard({
  crossing,
  defaultExpandedScorecard = false,
}: {
  crossing: Crossing;
  defaultExpandedScorecard?: boolean;
}) {
  const { language, t } = usePreferences();
  const copy = language === 'es' ? PROVENANCE_LADDER_COPY.es : PROVENANCE_LADDER_COPY.en;
  const [showScorecard, setShowScorecard] = useState(defaultExpandedScorecard);

  const p = crossing.properties;
  const activeTier = p.tier;
  const cLinks = links.filter((l) => l.crossing_id === p.id);
  const referenceUrl =
    'reference_source_url' in p && typeof p.reference_source_url === 'string'
      ? p.reference_source_url
      : null;

  const tierACount = crossings.filter((c) => c.properties.tier === 'A').length;
  const tierBCount = crossings.filter((c) => c.properties.tier === 'B').length;
  const tierCCount = crossings.filter((c) => c.properties.tier === 'C').length;

  return (
    <View
      testID="provenance-card"
      style={{
        minHeight: 96,
        backgroundColor: SURFACES.dark.elevated2,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SURFACES.dark.borderSubtle,
        padding: 14,
        gap: 12,
      }}
    >
      {/* Header Row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <AppText
          style={{
            fontSize: 11,
            letterSpacing: 1.1,
            color: SURFACES.dark.textSecondary,
            fontFamily: 'Inter_600SemiBold',
          }}
        >
          {copy.passportTitle}
        </AppText>
        <View
          style={{
            backgroundColor:
              activeTier === 'B' ? '#0D192B' : '#1A2232',
            borderColor:
              activeTier === 'B' ? '#38BDF8' : '#7A879C',
            borderWidth: 1.5,
            borderRadius: 8,
            paddingHorizontal: 9,
            paddingVertical: 3,
          }}
        >
          <AppText
            style={[
              TYPOGRAPHY.chartAxis,
              {
                color: activeTier === 'B' ? '#38BDF8' : '#7A879C',
                fontWeight: '700',
              },
            ]}
          >
            {activeTier === 'B'
              ? `⬡ TIER B • EMPIRICAL GAUGE LAG (${tierBCount})`
              : activeTier === 'A'
                ? `TIER A • SURVEYED (${tierACount})`
                : `TIER C • UNMONITORED (${tierCCount})`}
          </AppText>
        </View>
      </View>

      {/* 3-Rung Evidence Tier Ladder */}
      <View style={{ gap: 8 }}>
        {[
          {
            tier: 'A' as const,
            title: copy.tierATitle,
            telemetry: copy.tierATelemetry,
            body: copy.tierABody,
            accent: '#64748B',
            bg: '#0B101B',
            dashed: true,
          },
          {
            tier: 'B' as const,
            title: copy.tierBTitle,
            telemetry: `${copy.tierBTelemetry}${
              cLinks[0]
                ? ` • ${cLinks[0].gauge_id} → ${p.target_gauge_id ?? 'corridor'} [τ=${cLinks[0].tau_lo_min}–${cLinks[0].tau_hi_min}m]`
                : ''
            }`,
            body: copy.tierBBody,
            accent: '#38BDF8',
            bg: '#0D192B',
            dashed: false,
          },
          {
            tier: 'C' as const,
            title: copy.tierCTitle,
            telemetry: copy.tierCTelemetry,
            body: copy.tierCBody,
            accent: '#7A879C',
            bg: '#1A2232',
            dashed: true,
          },
        ].map((rung) => {
          const isCurrent = activeTier === rung.tier;
          return (
            <View
              key={rung.tier}
              testID={`provenance-rung-${rung.tier}`}
              style={{
                backgroundColor: isCurrent ? rung.bg : SURFACES.dark.elevated1,
                borderRadius: 12,
                borderWidth: isCurrent ? 1.5 : 1,
                borderStyle: rung.dashed && !isCurrent ? 'dashed' : 'solid',
                borderColor: isCurrent ? rung.accent : SURFACES.dark.borderSubtle,
                padding: 10,
                gap: 4,
                opacity: isCurrent ? 1 : 0.72,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
                  <Svg width={14} height={14} viewBox="0 0 16 16">
                    <Path
                      d="M8 1.5L14 4.5V11.5L8 14.5L2 11.5V4.5L8 1.5Z"
                      fill={isCurrent ? rung.accent : 'none'}
                      fillOpacity={0.22}
                      stroke={rung.accent}
                      strokeWidth={1.5}
                      strokeDasharray={rung.dashed ? '2, 2' : undefined}
                    />
                  </Svg>
                  <AppText
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontWeight: '700',
                      fontSize: 12,
                      flexShrink: 1,
                      lineHeight: 16,
                      color: isCurrent ? '#F8FAFC' : SURFACES.dark.textSecondary,
                    }}
                  >
                    {rung.title}
                  </AppText>
                </View>
                {isCurrent && (
                  <AppText
                    style={[
                      TYPOGRAPHY.chartAxis,
                      { color: rung.accent, fontSize: 10, fontWeight: '700' },
                    ]}
                  >
                    {language === 'es' ? 'NIVEL DEL CRUCE SELECCIONADO' : 'SELECTED CROSSING TIER'}
                  </AppText>
                )}
              </View>
              <AppText style={[TYPOGRAPHY.chartAxis, { color: rung.accent, fontSize: 10 }]}>
                {rung.telemetry}
              </AppText>
              <AppText style={[TYPOGRAPHY.bodyCompact, { fontSize: 12, lineHeight: 17, color: SURFACES.dark.textSecondary }]}>
                {rung.body}
              </AppText>
            </View>
          );
        })}
      </View>

      {/* Reference Stage Citation & Source Link */}
      {'reference_stage_ft' in p && typeof p.reference_stage_ft === 'number' && (
        <View
          style={{
            backgroundColor: SURFACES.dark.elevated1,
            borderRadius: 10,
            padding: 10,
            borderWidth: 1,
            borderColor: SURFACES.dark.borderSubtle,
            gap: 4,
          }}
        >
          <AppText style={[TYPOGRAPHY.chartAxis, { color: LOCKED_STATE_HEX.watch, fontWeight: '700' }]}>
            {t('crossing.reference', { stage: p.reference_stage_ft })}
          </AppText>
          {p.truth_source ? (
            <AppText style={{ fontSize: 11, lineHeight: 15, color: SURFACES.dark.textSecondary }}>
              {p.truth_source}
            </AppText>
          ) : null}
          {referenceUrl && (
            <Pressable
              role="button"
              accessibilityRole="button"
              onPress={() => void Linking.openURL(referenceUrl)}
              style={{ alignSelf: 'flex-start', paddingTop: 2 }}
            >
              <AppText style={{ fontSize: 11, color: '#38BDF8', fontFamily: 'Inter_600SemiBold' }}>
                {t('crossing.reference_source')} ↗
              </AppText>
            </Pressable>
          )}
        </View>
      )}

      {/* Validation & LOSO Backtest Scorecard Drawer Trigger */}
      <Pressable
        role="button"
        accessibilityRole="button"
        accessibilityLabel={showScorecard ? copy.hideScorecardCta : copy.scorecardCta}
        onPress={() => setShowScorecard((v) => !v)}
        style={{
          minHeight: 40,
          borderRadius: 10,
          backgroundColor: SURFACES.dark.elevated1,
          borderWidth: 1,
          borderColor: HYDROGRAPH_TOKENS.dark.upstreamStroke,
          paddingHorizontal: 12,
          paddingVertical: 8,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <AppText
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontWeight: '700',
            fontSize: 12,
            lineHeight: 16,
            color: HYDROGRAPH_TOKENS.dark.upstreamStroke,
          }}
        >
          {showScorecard ? copy.hideScorecardCta : copy.scorecardCta}
        </AppText>
      </Pressable>

      {showScorecard && <ValidationScorecardModal onClose={() => setShowScorecard(false)} />}
    </View>
  );
}
