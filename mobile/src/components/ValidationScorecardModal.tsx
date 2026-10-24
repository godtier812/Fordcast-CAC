import { Pressable, View } from 'react-native';
import { AppText } from '@/components/fordcast/UI';
import { results } from '@/lib/data';
import { usePreferences } from '@/lib/preferences';
import { HYDROGRAPH_TOKENS, LOCKED_STATE_HEX, SURFACES, TYPOGRAPHY } from '@/theme/tokens';

export const SCORECARD_COPY = {
  en: {
    badge: '📊 LOSO VALIDATION',
    title: 'Leave-One-Storm-Out (LOSO) Cross-Validation Scorecard',
    subtitle:
      'Empirical gauge-lag parameters for each storm fold are calibrated strictly on the remaining historical storms to prevent in-sample overfitting.',
    matrixTitle: '2×2 CONTINGENCY & CONFUSION MATRIX (POOLED PROXY ONSETS)',
    tpLabel: 'TRUE POSITIVES (TP / H)',
    fpLabel: 'FALSE POSITIVES (FP / F)',
    fnLabel: 'FALSE NEGATIVES (FN / M)',
    tnLabel: 'CALM CONTROL (36H SMOKE)',
    leadStripTitle: 'EMPIRICAL WARNING LEAD-TIME DISTRIBUTION (MINUTES)',
    caveatsTitle: 'EXPLICIT SCIENTIFIC CAVEATS & CAUSAL PENALTIES',
    caveat1:
      '1. 60-Minute Causal Telemetry Penalty: All replay forecasts enforce Δt_delay = 60 min (t_avail = t_obs + 60m ≤ t_sim) so zero future gauge readings leak into warnings.',
    caveat2:
      '2. Proxy Reference Stages: Evaluated onsets (12 events across 6 reference crossings and 5 storms) measure NOAA NWPS downstream gauge flood categories, not surveyed road-deck overtopping (Tier A = 0).',
    caveat3:
      '3. Comparator Parity: Against the true WGS84 geodesic nearest gauge, both the upstream rule and nearest-gauge comparator achieve a 65.0 min median lead time (POD 33.3%).',
  },
  es: {
    badge: '📊 VALIDACIÓN LOSO',
    title: 'Tarjeta de Validación Cruzada Leave-One-Storm-Out (LOSO)',
    subtitle:
      'Los parámetros empíricos de desfase para cada tormenta se calibran estrictamente con las tormentas históricas restantes para evitar el sobreajuste.',
    matrixTitle: 'MATRIZ DE CONTINGENCIA Y CONFUSIÓN 2×2 (EVENTOS PROXY)',
    tpLabel: 'VERDADEROS POSITIVOS (TP / H)',
    fpLabel: 'FALSOS POSITIVOS (FP / F)',
    fnLabel: 'FALSOS NEGATIVOS (FN / M)',
    tnLabel: 'CONTROL SECO (36H PRUEBA)',
    leadStripTitle: 'DISTRIBUCIÓN EMPÍRICA DE TIEMPO DE ANTICIPACIÓN (MINUTOS)',
    caveatsTitle: 'ADVERTENCIAS CIENTÍFICAS EXPLÍCITAS Y PENALIZACIÓN CAUSAL',
    caveat1:
      '1. Penalización Causal de 60 Minutos: Todos los pronósticos aplican Δt_delay = 60 min (t_avail = t_obs + 60m ≤ t_sim) sin filtración de datos futuros.',
    caveat2:
      '2. Etapas Proxy de Referencia: Los 12 inicios evaluados miden categorías de inundación NOAA NWPS en el sensor aguas abajo, no elevaciones topográficas de la carpeta asfáltica (Nivel A = 0).',
    caveat3:
      '3. Paridad del Comparador: Frente al sensor geodésico más cercano (WGS84), la regla aguas arriba y el sensor más cercano empatan con una mediana de 65.0 min de anticipación (POD 33.3%).',
  },
} as const;

export default function ValidationScorecardModal({
  onClose,
}: {
  onClose?: () => void;
}) {
  const { language } = usePreferences();
  const copy = language === 'es' ? SCORECARD_COPY.es : SCORECARD_COPY.en;

  const upAvoid = results.methods.upstream_rule.avoid.pooled;
  const ngAvoid = results.methods.nearest_gauge.avoid.pooled;
  const upWatch = results.methods.upstream_rule.watch.pooled;

  const fmtPct = (v: number | null | undefined) =>
    v == null ? '—' : `${(v * 100).toFixed(1)}%`;
  const fmtDec = (v: number | null | undefined) =>
    v == null ? '—' : v.toFixed(3);

  return (
    <View
      testID="validation-scorecard"
      style={{
        backgroundColor: SURFACES.dark.elevated1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SURFACES.dark.borderSubtle,
        padding: 16,
        gap: 14,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: 'rgba(56, 189, 248, 0.14)',
              borderColor: HYDROGRAPH_TOKENS.dark.upstreamStroke,
              borderWidth: 1,
              borderRadius: 999,
              paddingHorizontal: 9,
              paddingVertical: 2,
            }}
          >
            <AppText
              style={{
                fontSize: 10,
                lineHeight: 14,
                fontFamily: 'Inter_600SemiBold',
                fontWeight: '700',
                color: HYDROGRAPH_TOKENS.dark.upstreamStroke,
              }}
            >
              {copy.badge}
            </AppText>
          </View>
          <AppText style={[TYPOGRAPHY.sheetTitle, { fontSize: 17, lineHeight: 22 }]}>
            {copy.title}
          </AppText>
          <AppText style={[TYPOGRAPHY.bodyCompact, { color: SURFACES.dark.textSecondary, fontSize: 12, lineHeight: 17 }]}>
            {copy.subtitle}
          </AppText>
        </View>
        {onClose && (
          <Pressable
            role="button"
            accessibilityRole="button"
            accessibilityLabel="Close scorecard"
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: SURFACES.dark.elevated2,
              borderWidth: 1,
              borderColor: SURFACES.dark.borderSubtle,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <AppText style={{ fontSize: 14, color: SURFACES.dark.textPrimary }}>✕</AppText>
          </Pressable>
        )}
      </View>

      {/* 2x2 Bento Contingency & Confusion Matrix Grid */}
      <View style={{ gap: 8 }}>
        <AppText
          style={{
            fontSize: 10,
            letterSpacing: 1.1,
            color: SURFACES.dark.textSecondary,
            fontFamily: 'Inter_600SemiBold',
          }}
        >
          {copy.matrixTitle}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            {
              label: copy.tpLabel,
              value: `${upAvoid.H}`,
              sub: `WATCH H: ${upWatch.H} · NG H: ${ngAvoid.H}`,
              color: LOCKED_STATE_HEX.no_rise,
            },
            {
              label: copy.fpLabel,
              value: `${upAvoid.F}`,
              sub: `WATCH F: ${upWatch.F} · NG F: ${ngAvoid.F}`,
              color: LOCKED_STATE_HEX.watch,
            },
            {
              label: copy.fnLabel,
              value: `${upAvoid.M}`,
              sub: `WATCH M: ${upWatch.M} · NG M: ${ngAvoid.M}`,
              color: LOCKED_STATE_HEX.avoid,
            },
            {
              label: copy.tnLabel,
              value: `${results.methods.upstream_rule.calm_fa_per_crossing_per_100d.avoid}/100d`,
              sub: `${results.assumptions.calm_days}d (${results.assumptions.calm_days * 24}h) window`,
              color: HYDROGRAPH_TOKENS.dark.upstreamStroke,
            },
          ].map((cell) => (
            <View
              key={cell.label}
              style={{
                flex: 1,
                minWidth: 140,
                backgroundColor: SURFACES.dark.elevated2,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: SURFACES.dark.borderSubtle,
                padding: 10,
                gap: 2,
              }}
            >
              <AppText style={{ fontSize: 9, color: SURFACES.dark.textSecondary, fontFamily: 'Inter_600SemiBold' }}>
                {cell.label}
              </AppText>
              <AppText style={[TYPOGRAPHY.metricValue, { color: cell.color, fontSize: 20 }]}>
                {cell.value}
              </AppText>
              <AppText style={[TYPOGRAPHY.chartAxis, { color: SURFACES.dark.textMuted, fontSize: 10 }]}>
                {cell.sub}
              </AppText>
            </View>
          ))}
        </View>

        {/* POD / FAR / CSI Tabular Summary Row */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            backgroundColor: SURFACES.dark.primary,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: SURFACES.dark.borderSubtle,
            padding: 10,
            justifyContent: 'space-between',
          }}
        >
          <AppText style={[TYPOGRAPHY.chartAxis, { color: LOCKED_STATE_HEX.no_rise }]}>
            UPSTREAM AVOID · POD {fmtPct(upAvoid.pod)} · FAR {fmtPct(upAvoid.far)} · CSI {fmtDec(upAvoid.csi)}
          </AppText>
          <AppText style={[TYPOGRAPHY.chartAxis, { color: SURFACES.dark.textSecondary }]}>
            NEAREST GAUGE · POD {fmtPct(ngAvoid.pod)} · FAR {fmtPct(ngAvoid.far)} · CSI {fmtDec(ngAvoid.csi)}
          </AppText>
        </View>
      </View>

      {/* Lead-Time Distribution Strip */}
      <View
        style={{
          backgroundColor: SURFACES.dark.elevated2,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: SURFACES.dark.borderSubtle,
          padding: 12,
          gap: 8,
        }}
      >
        <AppText
          style={{
            fontSize: 10,
            letterSpacing: 1.1,
            color: SURFACES.dark.textSecondary,
            fontFamily: 'Inter_600SemiBold',
          }}
        >
          {copy.leadStripTitle}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
          <View>
            <AppText style={{ fontSize: 10, color: SURFACES.dark.textMuted }}>
              AVOID MEDIAN LEAD
            </AppText>
            <AppText style={[TYPOGRAPHY.metricValue, { color: LOCKED_STATE_HEX.watch, fontSize: 18 }]}>
              {upAvoid.median_lead_min ?? '—'} min
            </AppText>
          </View>
          <View>
            <AppText style={{ fontSize: 10, color: SURFACES.dark.textMuted }}>
              AVOID IQR (Q25–Q75)
            </AppText>
            <AppText style={[TYPOGRAPHY.metricValue, { color: SURFACES.dark.textPrimary, fontSize: 18 }]}>
              {upAvoid.lead_iqr_min ? `${upAvoid.lead_iqr_min[0]}–${upAvoid.lead_iqr_min[1]} min` : '—'}
            </AppText>
          </View>
          <View>
            <AppText style={{ fontSize: 10, color: SURFACES.dark.textMuted }}>
              WATCH MEDIAN LEAD
            </AppText>
            <AppText style={[TYPOGRAPHY.metricValue, { color: HYDROGRAPH_TOKENS.dark.upstreamStroke, fontSize: 18 }]}>
              {upWatch.median_lead_min ?? '—'} min
            </AppText>
          </View>
          <View>
            <AppText style={{ fontSize: 10, color: SURFACES.dark.textMuted }}>
              REF EXAMPLE (tc-167)
            </AppText>
            <AppText style={[TYPOGRAPHY.metricValue, { color: HYDROGRAPH_TOKENS.dark.downstreamStroke, fontSize: 18 }]}>
              {results.hero.lead_min ?? 90} min
            </AppText>
          </View>
        </View>
      </View>

      {/* Explicit Scientific Caveats Panel */}
      <View
        style={{
          backgroundColor: SURFACES.dark.primary,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: SURFACES.dark.borderSubtle,
          padding: 12,
          gap: 6,
        }}
      >
        <AppText
          style={{
            fontSize: 10,
            letterSpacing: 1.1,
            color: LOCKED_STATE_HEX.watch,
            fontFamily: 'Inter_600SemiBold',
          }}
        >
          {copy.caveatsTitle}
        </AppText>
        <AppText style={[TYPOGRAPHY.bodyCompact, { fontSize: 12, lineHeight: 17, color: SURFACES.dark.textSecondary }]}>
          {copy.caveat1}
        </AppText>
        <AppText style={[TYPOGRAPHY.bodyCompact, { fontSize: 12, lineHeight: 17, color: SURFACES.dark.textSecondary }]}>
          {copy.caveat2}
        </AppText>
        <AppText style={[TYPOGRAPHY.bodyCompact, { fontSize: 12, lineHeight: 17, color: SURFACES.dark.textSecondary }]}>
          {copy.caveat3}
        </AppText>
      </View>
    </View>
  );
}
