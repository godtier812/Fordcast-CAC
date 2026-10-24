/** Shared building blocks for the redesigned phone + web screens (100% vector SVG icons, zero emojis). */
import { memo, useState, type PropsWithChildren } from 'react';
import { Linking, Platform, Pressable, Share, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Polyline, Text as SvgText } from 'react-native-svg';
import { AppText } from '@/components/fordcast/UI';
import StateBadge, { StateGlyphSvg } from '@/components/StateBadge';
import { FcIcon, type FcIconName } from '@/components/fc/Icons';
import { REASON_KEY, EXPLAIN_KEY, cleanPhysicalCrossingName } from '@/lib/danger';
import { formatMiles } from '@/lib/geo';
import type { GaugeReading } from '@/lib/live';
import { useMonitorOptional, type CrossingStatus } from '@/lib/monitor-context';
import { usePreferences, type CopyKey } from '@/lib/preferences';
import { LOCKED_STATE_HEX, STATE_TOKENS, SURFACES } from '@/theme/tokens';

export const ACCENT = '#60A5FA';
export const ACCENT_DIM = 'rgba(96, 165, 250, 0.14)';
const S = SURFACES.dark;

/** Formats raw road/sensor names into clean, readable street names without database or hardware shorthand. */
export function cleanName(raw: string): string {
  return raw
    .replace(
      /\s*\b(?:Master Standpipe|Master Arm|Slave Arm|Standpipe|Flasher\s*#?\d*|Barrier\s*#?\d*)(?:\s*\([^)]+\))?/gi,
      '',
    )
    .replace(/\s*@\s*/g, ' at ')
    .replace(/\s*\((?:W|E|N|S|West|East|North|South)\)/gi, '')
    .replace(/\bCk\b/g, 'Creek')
    .replace(/\bRv\b/g, 'River')
    .replace(/\bnr\b/gi, 'near')
    .replace(/,\s*TX\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+at\s*$/i, '')
    .trim();
}

export function agoText(
  t: (k: CopyKey, v?: Record<string, string | number>) => string,
  ms: number | null,
  refNow = Date.now(),
) {
  if (ms == null) return '—';
  const min = Math.max(0, Math.round(((refNow > 0 ? refNow : Date.now()) - ms) / 60_000));
  return min < 1 ? t('home.just_now') : t('home.min_ago', { n: min });
}

/** Plain status label: the most serious hazard, else the sensor state, else why FordCast can't say. */
export function statusLabel(t: (k: CopyKey) => string, s: CrossingStatus): string {
  if (s.danger && s.reasons[0]) return t(REASON_KEY[s.reasons[0]]);
  if (s.monitored) return t(`state.${s.state}`);
  if (s.coverage === 'official') return t('state.official_crossing');
  return s.coverage === 'uncalibrated' ? t('state.uncalibrated') : t('state.unmonitored');
}

function explainKey(s: CrossingStatus): CopyKey {
  if (s.danger && s.reasons[0]) return EXPLAIN_KEY[s.reasons[0]];
  if (s.monitored) return `explain.${s.state}`;
  return s.coverage === 'uncalibrated' ? 'explain.uncalibrated' : 'explain.unmonitored';
}

/** Small factual chips: flood history, rain, active warning. */
export function HazardChips({ status }: { status: CrossingStatus }) {
  const { t } = usePreferences();
  const chips: { text: string; color: string }[] = [];
  if (status.alert) chips.push({ text: status.alert.event, color: LOCKED_STATE_HEX.avoid });
  if (status.rain && status.rain.past3hIn >= 0.1)
    chips.push({
      text: t('chip.rain', { inches: status.rain.past3hIn.toFixed(1) }),
      color: status.rain.heavy ? LOCKED_STATE_HEX.watch : '#38BDF8',
    });
  if (status.history && status.history.tier !== 'none')
    chips.push({
      text: t(status.history.deaths > 0 ? 'chip.history_deaths' : 'chip.history', {
        reports: status.history.reports,
        deaths: status.history.deaths,
      }),
      color: status.history.tier === 'high' ? LOCKED_STATE_HEX.watch : S.textSecondary,
    });
  if (!chips.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {chips.map((c) => (
        <View
          key={c.text}
          style={{ borderRadius: 999, borderWidth: 1, borderColor: c.color, paddingHorizontal: 9, paddingVertical: 3 }}
        >
          <AppText style={{ fontSize: 11.5, lineHeight: 15, color: c.color, fontFamily: 'Inter_600SemiBold' }}>
            {c.text}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: S.primary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: S.borderSubtle,
        padding: 3,
        gap: 3,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              minHeight: 38,
              borderRadius: 9,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? ACCENT : 'transparent',
            }}
          >
            <AppText
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 14,
                lineHeight: 18,
                color: active ? '#06101F' : S.textSecondary,
              }}
            >
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color = ACCENT,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
  icon?: FcIconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 13,
        minHeight: 34,
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? color : S.borderSubtle,
        backgroundColor: active ? ACCENT_DIM : S.elevated1,
      }}
    >
      {icon ? <FcIcon name={icon} size={13} color={active ? color : S.textSecondary} /> : null}
      <AppText
        style={{
          fontSize: 13,
          lineHeight: 17,
          fontFamily: 'Inter_600SemiBold',
          color: active ? S.textPrimary : S.textSecondary,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export function ActionButton({
  label,
  onPress,
  kind = 'primary',
  icon,
  style,
  compact,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  icon?: FcIconName;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const bg = kind === 'primary' ? ACCENT : kind === 'danger' ? LOCKED_STATE_HEX.avoid : S.elevated2;
  const fg = kind === 'secondary' ? S.textPrimary : '#06101F';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: compact ? 40 : 48,
          paddingHorizontal: compact ? 14 : 18,
          borderRadius: 12,
          backgroundColor: bg,
          borderWidth: kind === 'secondary' ? 1 : 0,
          borderColor: S.borderSubtle,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {icon ? <FcIcon name={icon} size={compact ? 14 : 16} color={fg} /> : null}
      <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: compact ? 14 : 15, lineHeight: 19, color: fg }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Panel({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <View
      style={[
        {
          backgroundColor: S.elevated1,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: S.borderSubtle,
          padding: 16,
          gap: 10,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionLabel({ children }: PropsWithChildren) {
  return (
    <AppText
      style={{
        fontSize: 12,
        letterSpacing: 1,
        textTransform: 'uppercase',
        fontFamily: 'Inter_600SemiBold',
        color: S.textMuted,
      }}
    >
      {children}
    </AppText>
  );
}

/** Share a plain-text status summary via native share sheet or web clipboard/navigator.share. */
export async function shareText(title: string, message: string): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, text: message });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${title}\n${message}`);
        return;
      }
    }
    await Share.share({ title, message });
  } catch {
    // User cancelled or share unavailable.
  }
}

/** One crossing in a list: glyph, name, creek + distance, plain-language status. */
export const NearbyRow = memo(function NearbyRow({
  status,
  onPress,
  selected,
}: {
  status: CrossingStatus;
  onPress?: () => void;
  selected?: boolean;
}) {
  const { t, saved } = usePreferences();
  const isSaved = saved.includes(status.id);
  const ds = status.displayState;
  const color = ds ? LOCKED_STATE_HEX[ds] : S.borderSubtle;
  const label = statusLabel(t, status);
  // Show the road name people recognize, not municipal hardware labels (Master Arm, Slave Arm…).
  const displayName = cleanPhysicalCrossingName(cleanName(status.name)) || cleanName(status.name);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${displayName}. ${label}. ${t('home.away', { dist: formatMiles(status.distanceKm) })}`}
      onPress={onPress ?? (() => router.push({ pathname: '/crossing/[id]', params: { id: status.id } }))}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? ACCENT : ds && ds !== 'no_rise' ? color : S.borderSubtle,
        backgroundColor: ds === 'avoid' || ds === 'closed' ? STATE_TOKENS.avoid.darkBg : S.elevated1,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {ds ? (
        <StateGlyphSvg state={ds} size={30} />
      ) : (
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: S.textMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ fontSize: 12, color: S.textMuted }}>—</AppText>
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isSaved ? <FcIcon name="star" size={14} color={ACCENT} /> : null}
          <AppText numberOfLines={2} style={{ flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 15, lineHeight: 20 }}>
            {displayName}
          </AppText>
        </View>
        <AppText numberOfLines={1} style={{ fontSize: 12.5, lineHeight: 17, color: S.textSecondary }}>
          {status.creek ? `${cleanName(status.creek)} · ` : ''}
          {formatMiles(status.distanceKm)}
        </AppText>
        <AppText
          numberOfLines={2}
          style={{
            fontSize: 13,
            lineHeight: 17,
            fontFamily: 'Inter_600SemiBold',
            color: ds ? color : S.textMuted,
          }}
        >
          {label}
          {status.monitored && status.window ? ` · ${t('state.range', { lo: status.window[0], hi: status.window[1] })}` : ''}
        </AppText>
        {status.history?.tier === 'high' && !status.danger ? (
          <AppText style={{ fontSize: 11.5, lineHeight: 15, color: S.textMuted }}>
            {t('chip.history', { reports: status.history.reports, deaths: status.history.deaths })}
          </AppText>
        ) : null}
      </View>
      <FcIcon name="chevron-right" size={18} color={S.textMuted} />
    </Pressable>
  );
});

export function BigStatus({ status }: { status: CrossingStatus }) {
  const { t } = usePreferences();
  const ds = status.displayState;
  const state = ds ?? 'unknown';
  const key = explainKey(status);
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 2,
        borderColor: ds ? LOCKED_STATE_HEX[state] : S.borderSubtle,
        backgroundColor: ds ? STATE_TOKENS[state].darkBg : S.elevated1,
        padding: 16,
        gap: 10,
      }}
    >
      <StateBadge state={state} size={24} unmonitored={!ds} labelOverride={statusLabel(t, status)} />
      {status.monitored && status.window ? (
        <AppText
          accessibilityRole={status.window[0] === 0 ? 'alert' : undefined}
          style={{ fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 24, color: S.textPrimary }}
        >
          {status.window[0] === 0 ? t('state.now') : t('state.range', { lo: status.window[0], hi: status.window[1] })}
        </AppText>
      ) : null}
      <AppText style={{ fontSize: 15, lineHeight: 22, color: S.textPrimary }}>{t(key)}</AppText>
      {status.danger && status.reasons.length > 1 ? (
        <AppText style={{ fontSize: 13, lineHeight: 18, color: S.textSecondary }}>
          {t('detail.also')} {status.reasons.slice(1).map((r) => t(REASON_KEY[r])).join(' · ')}
        </AppText>
      ) : null}
      <HazardChips status={status} />
    </View>
  );
}

/** Concise NWS-sourced floodwater depth illustration (Turn Around, Don't Drown). */
export function FloodPhysicsCard() {
  const { t, language } = usePreferences();
  const [depthIn, setDepthIn] = useState<6 | 12 | 24>(12);

  const depthData = {
    6: {
      badgeColor: LOCKED_STATE_HEX.watch,
      sedan: t('physics.d6_sedan'),
      suv: t('physics.d6_suv'),
      person: t('physics.d6_person'),
    },
    12: {
      badgeColor: LOCKED_STATE_HEX.avoid,
      sedan: t('physics.d12_sedan'),
      suv: t('physics.d12_suv'),
      person: t('physics.d12_person'),
    },
    24: {
      badgeColor: LOCKED_STATE_HEX.closed,
      sedan: t('physics.d24_sedan'),
      suv: t('physics.d24_suv'),
      person: t('physics.d24_person'),
    },
  }[depthIn];

  return (
    <Panel style={{ borderColor: depthData.badgeColor, borderLeftWidth: 4, gap: 12 }}>
      <View style={{ gap: 4 }}>
        <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 17, lineHeight: 22 }}>
          {t('physics.title')}
        </AppText>
        <AppText style={{ fontSize: 13, lineHeight: 18, color: S.textSecondary }}>
          {t('physics.subtitle')}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {([6, 12, 24] as const).map((d) => (
          <Chip
            key={d}
            label={t(`physics.depth_${d}` as CopyKey)}
            active={depthIn === d}
            color={d === 6 ? LOCKED_STATE_HEX.watch : LOCKED_STATE_HEX.avoid}
            onPress={() => setDepthIn(d)}
          />
        ))}
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <FcIcon name="car" size={16} color={depthData.badgeColor} />
          <AppText style={{ flex: 1, fontSize: 13.5, lineHeight: 19, color: S.textPrimary }}>{depthData.sedan}</AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <FcIcon name="shield" size={16} color={depthData.badgeColor} />
          <AppText style={{ flex: 1, fontSize: 13.5, lineHeight: 19, color: S.textPrimary }}>{depthData.suv}</AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <FcIcon name="alert" size={16} color={LOCKED_STATE_HEX.watch} />
          <AppText style={{ flex: 1, fontSize: 13, lineHeight: 18, color: S.textSecondary }}>{depthData.person}</AppText>
        </View>
      </View>

      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL('https://www.weather.gov/safety/flood-turn-around-dont-drown')}
      >
        <AppText style={{ fontSize: 12, color: ACCENT, fontFamily: 'Inter_600SemiBold' }}>
          {language === 'es'
            ? 'Fuente: Guía de seguridad ante inundaciones del Servicio Meteorológico Nacional (NWS) →'
            : 'Source: National Weather Service — Turn Around, Don’t Drown® Safety Guide →'}
        </AppText>
      </Pressable>
    </Panel>
  );
}

/** Simple water-height line with watch / avoid reference lines. */
export function Sparkline({
  rows,
  watchFt,
  triggerFt,
  height = 120,
}: {
  rows: GaugeReading[];
  watchFt?: number | null;
  triggerFt?: number | null;
  height?: number;
}) {
  const [w, setW] = useState(0);
  const pad = { l: 34, r: 8, t: 8, b: 18 };
  const vals = rows.map((r) => r.v);
  const lines = [watchFt, triggerFt].filter((v): v is number => typeof v === 'number');
  const min = Math.min(...vals, ...lines);
  const max = Math.max(...vals, ...lines);
  const span = Math.max(0.5, max - min);
  const lo = min - span * 0.1;
  const hi = max + span * 0.1;
  const t0 = rows[0]?.t ?? 0;
  const t1 = rows[rows.length - 1]?.t ?? 1;
  const x = (t: number) => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (height - pad.t - pad.b);
  const pts = rows.map((r) => `${x(r.t).toFixed(1)},${y(r.v).toFixed(1)}`).join(' ');
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {w > 0 && rows.length > 1 ? (
        <Svg width={w} height={height}>
          {typeof watchFt === 'number' ? (
            <>
              <Line
                x1={pad.l}
                x2={w - pad.r}
                y1={y(watchFt)}
                y2={y(watchFt)}
                stroke={LOCKED_STATE_HEX.watch}
                strokeDasharray="5 4"
                strokeWidth={1.5}
              />
              <SvgText x={pad.l + 4} y={y(watchFt) - 4} fill={LOCKED_STATE_HEX.watch} fontSize={10}>
                Watch
              </SvgText>
            </>
          ) : null}
          {typeof triggerFt === 'number' ? (
            <>
              <Line
                x1={pad.l}
                x2={w - pad.r}
                y1={y(triggerFt)}
                y2={y(triggerFt)}
                stroke={LOCKED_STATE_HEX.avoid}
                strokeDasharray="5 4"
                strokeWidth={1.5}
              />
              <SvgText x={pad.l + 4} y={y(triggerFt) - 4} fill={LOCKED_STATE_HEX.avoid} fontSize={10}>
                Avoid
              </SvgText>
            </>
          ) : null}
          <Polyline points={pts} fill="none" stroke="#38BDF8" strokeWidth={2.5} strokeLinejoin="round" />
          <SvgText x={2} y={pad.t + 8} fill={S.textMuted} fontSize={10}>
            {hi.toFixed(1)}
          </SvgText>
          <SvgText x={2} y={height - pad.b} fill={S.textMuted} fontSize={10}>
            {lo.toFixed(1)}
          </SvgText>
          <SvgText x={pad.l} y={height - 4} fill={S.textMuted} fontSize={10}>
            −3h
          </SvgText>
          <SvgText x={w - pad.r - 22} y={height - 4} fill={S.textMuted} fontSize={10}>
            now
          </SvgText>
        </Svg>
      ) : null}
    </View>
  );
}

/** Slide-down banner shown at the top of every screen when an alert fires. */
export function AlertBanner() {
  const monitor = useMonitorOptional();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const banner = monitor?.banner;
  if (!monitor || !banner) return null;
  const color = banner.test ? ACCENT : LOCKED_STATE_HEX[banner.state];
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + (wide ? 58 : 118),
        left: wide ? 446 : 12,
        right: wide ? 76 : 12,
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      <Pressable
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        onPress={() => {
          monitor.dismissBanner();
          if (banner.crossingId) router.push({ pathname: '/crossing/[id]', params: { id: banner.crossingId } });
        }}
        style={{
          width: '100%',
          maxWidth: 560,
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
          padding: 14,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: color,
          backgroundColor: S.primary,
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 12,
        }}
      >
        <StateGlyphSvg state={banner.test ? 'watch' : banner.state} size={34} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, lineHeight: 20, color }}>{banner.title}</AppText>
          <AppText style={{ fontSize: 13.5, lineHeight: 19, color: S.textPrimary }}>{banner.body}</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={12} onPress={monitor.dismissBanner}>
          <FcIcon name="close" size={18} color={S.textSecondary} />
        </Pressable>
      </Pressable>
    </View>
  );
}
