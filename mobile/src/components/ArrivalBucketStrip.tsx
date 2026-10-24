import { View } from 'react-native';
import { AppText } from '@/components/fordcast/UI';
import { StateGlyphSvg } from '@/components/StateBadge';
import { usePreferences } from '@/lib/preferences';
import {
  LOCKED_STATE_HEX,
  SURFACES,
  TYPOGRAPHY,
  type CrossingStateKey,
} from '@/theme/tokens';

export type ArrivalBucketKey =
  | '[0, 15]'
  | '[15, 30]'
  | '[30, 45]'
  | '[45, 60]'
  | '[60, 90]'
  | '[90, 120]'
  | '[120, 180]';

export interface ArrivalBucketSpec {
  key: ArrivalBucketKey;
  lo: number;
  hi: number;
  label: string;
  flex: number;
}

export const ARRIVAL_BUCKETS: readonly ArrivalBucketSpec[] = [
  { key: '[0, 15]', lo: 0, hi: 15, label: '0–15m', flex: 1.0 },
  { key: '[15, 30]', lo: 15, hi: 30, label: '15–30m', flex: 1.0 },
  { key: '[30, 45]', lo: 30, hi: 45, label: '30–45m', flex: 1.0 },
  { key: '[45, 60]', lo: 45, hi: 60, label: '45–60m', flex: 1.0 },
  { key: '[60, 90]', lo: 60, hi: 90, label: '60–90m', flex: 1.25 },
  { key: '[90, 120]', lo: 90, hi: 120, label: '90–120m', flex: 1.25 },
  { key: '[120, 180]', lo: 120, hi: 180, label: '120–180m', flex: 1.5 },
] as const;

const MULTI_BUCKET_MAP: Record<string, ArrivalBucketKey> = {
  '[0, 30]': '[0, 15]',
  '[15, 60]': '[15, 30]',
  '[30, 60]': '[30, 45]',
  '[30, 90]': '[30, 45]',
  '[60, 120]': '[60, 90]',
  '[60, 180]': '[60, 90]',
  '[90, 180]': '[90, 120]',
};

export function toArrivalBucketKey(window?: [number, number] | null): ArrivalBucketKey | null {
  if (!window) return null;
  const candidate = `[${window[0]}, ${window[1]}]`;
  const match = ARRIVAL_BUCKETS.find((b) => b.key === candidate);
  if (match) return match.key;
  return MULTI_BUCKET_MAP[candidate] ?? null;
}

export function isBucketActiveForWindow(
  bucket: ArrivalBucketSpec | ArrivalBucketKey,
  window?: [number, number] | null,
): boolean {
  if (!window || !toArrivalBucketKey(window)) return false;
  const spec = typeof bucket === 'string' ? ARRIVAL_BUCKETS.find((b) => b.key === bucket) : bucket;
  if (!spec) return false;
  return spec.lo >= window[0] && spec.hi <= window[1];
}

export default function ArrivalBucketStrip({
  state,
  window,
}: {
  state: CrossingStateKey;
  window?: [number, number] | null;
}) {
  const { t, language } = usePreferences();
  const isActiveWarning = (state === 'watch' || state === 'avoid' || state === 'closed') && window != null;
  const activeBucket = isActiveWarning ? toArrivalBucketKey(window) : null;
  const isZeroLowerBound = activeBucket === '[0, 15]';
  const activeColor =
    state === 'watch' ? LOCKED_STATE_HEX.watch : LOCKED_STATE_HEX.avoid;

  const sectionLabel =
    language === 'es'
      ? 'DESFASE EXPERIMENTAL DE SENSOR (NO NIVEL EN VÍA)'
      : 'EXPERIMENTAL GAUGE LAG WINDOW (NOT ROAD DEPTH)';

  return (
    <View
      testID="arrival-bucket-strip"
      style={{
        minHeight: 78,
        backgroundColor: SURFACES.dark.elevated2,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: SURFACES.dark.borderSubtle,
        padding: 12,
        gap: 10,
      }}
    >
      {/* Zero-Lower-Bound Escalation Banner ([0, 15] active) */}
      {isZeroLowerBound && (
        <View
          testID="zero-lower-bound-alert"
          role="alert"
          accessibilityRole="alert"
          aria-live="assertive"
          accessibilityLiveRegion="assertive"
          style={{
            backgroundColor: '#380D1A',
            borderWidth: 2,
            borderColor: '#FF5470',
            borderRadius: 12,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <StateGlyphSvg state="avoid" size={24} />
          <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <View
                style={{
                  backgroundColor: '#FF5470',
                  borderRadius: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <AppText
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontWeight: '700',
                    fontSize: 11,
                    lineHeight: 14,
                    color: '#070B12',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  [0–15 MIN]
                </AppText>
              </View>
              <AppText
                style={{
                  fontSize: 11,
                  lineHeight: 14,
                  color: '#FF5470',
                  fontFamily: 'Inter_600SemiBold',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {t('state.range', { lo: 0, hi: 15 })}
              </AppText>
            </View>
            <AppText
              numberOfLines={2}
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontWeight: '700',
                fontSize: 18,
                lineHeight: 23,
                color: '#F8FAFC',
                flexShrink: 1,
              }}
            >
              {t('state.now')}
            </AppText>
          </View>
        </View>
      )}

      {/* Primary Window Readout Header */}
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
            lineHeight: 15,
            letterSpacing: 1.1,
            color: SURFACES.dark.textSecondary,
            fontFamily: 'Inter_600SemiBold',
          }}
        >
          {sectionLabel}
        </AppText>
        <View
          style={{
            backgroundColor: activeBucket ? activeColor : SURFACES.dark.elevated1,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: activeBucket ? activeColor : SURFACES.dark.borderSubtle,
          }}
        >
          <AppText
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontWeight: '700',
              fontSize: 12,
              lineHeight: 16,
              color: activeBucket ? '#070B12' : SURFACES.dark.textMuted,
              fontVariant: ['tabular-nums'],
            }}
          >
            {activeBucket && window
              ? `[${window[0]}–${window[1]} MIN] · ${t('state.range', { lo: window[0], hi: window[1] })}`
              : '—'}
          </AppText>
        </View>
      </View>

      {/* 7-Cell Stepped Uncertainty Horizon Grid */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: 4,
        }}
      >
        {ARRIVAL_BUCKETS.map((bucket) => {
          const isActive = isActiveWarning && isBucketActiveForWindow(bucket, window);
          const isZeroCell = bucket.key === '[0, 15]' && isActive;
          return (
            <View
              key={bucket.key}
              testID={`arrival-cell-${bucket.lo}-${bucket.hi}`}
              accessibilityState={{ selected: isActive }}
              style={{
                flex: bucket.flex,
                minHeight: 34,
                borderRadius: 8,
                backgroundColor: isZeroCell
                  ? '#380D1A'
                  : isActive
                    ? activeColor
                    : '#131B2E',
                borderWidth: isZeroCell ? 2.5 : 1,
                borderColor: isZeroCell
                  ? '#FF5470'
                  : isActive
                    ? activeColor
                    : '#23304D',
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 3,
              }}
            >
              <AppText
                style={[
                  TYPOGRAPHY.chartAxis,
                  {
                    fontSize: 10,
                    lineHeight: 13,
                    fontWeight: isActive ? '700' : '500',
                    color: isZeroCell
                      ? '#F8FAFC'
                      : isActive
                        ? '#070B12'
                        : '#64748B',
                    fontVariant: ['tabular-nums'],
                  },
                ]}
              >
                {isActive ? `[${bucket.label}]` : bucket.label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}
