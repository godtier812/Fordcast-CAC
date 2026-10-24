import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AppText, styles, type State } from '@/components/fordcast/UI';
import StateBadge from '@/components/StateBadge';
import type { Crossing } from '@/lib/data';
import { usePreferences } from '@/lib/preferences';
import { theme as c } from '@/lib/theme';
import { LOCKED_STATE_HEX, TYPOGRAPHY } from '@/theme/tokens';

export default function CrossingRow({
  crossing,
  stateOverride,
  windowOverride,
  onSelectCrossing,
}: {
  crossing: Crossing;
  stateOverride?: State;
  windowOverride?: [number, number] | null;
  onSelectCrossing?: (id: string) => void;
}) {
  const { t, saved } = usePreferences();
  const p = crossing.properties;
  const tierKey = p.tier === 'A' ? 'tier.a' : p.tier === 'B' ? 'tier.b' : 'tier.c';
  const displayState: State = stateOverride ?? 'unknown';
  const isUnmonitored = p.tier === 'C' && displayState === 'unknown';
  const stateLabel = isUnmonitored ? t('state.unmonitored') : t(`state.${displayState}`);
  const tierColor = p.tier === 'A' ? c.water : p.tier === 'B' ? c.link : c.subtle;
  const isSaved = saved.includes(p.id);

  return (
    <Pressable
      role="button"
      accessibilityRole="button"
      accessibilityLabel={`${p.name}. ${t(tierKey)}. ${stateLabel}.${windowOverride ? ` ${t('state.range', { lo: windowOverride[0], hi: windowOverride[1] })}.` : ''} ${isSaved ? t('crossing.saved') : ''}`}
      onPress={() => {
        if (onSelectCrossing) {
          onSelectCrossing(p.id);
        } else {
          router.push({ pathname: '/crossing/[id]', params: { id: p.id } });
        }
      }}
      style={({ pressed }) => [
        styles.row,
        {
          paddingVertical: 12,
          paddingHorizontal: 14,
          marginBottom: 8,
          borderRadius: 14,
          borderWidth: 1,
          borderColor:
            displayState === 'avoid' || displayState === 'closed'
              ? LOCKED_STATE_HEX.avoid
              : displayState === 'watch'
                ? LOCKED_STATE_HEX.watch
                : c.border,
          backgroundColor: c.surface,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <AppText style={[TYPOGRAPHY.sheetTitle, { fontSize: 16, lineHeight: 22, flexShrink: 1 }]}>
            {p.name}
          </AppText>
          <StateBadge
            state={displayState}
            size={24}
            unmonitored={isUnmonitored}
            labelOverride={stateLabel}
          />
        </View>

        <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
          <AppText style={[styles.footer, { color: tierColor, fontFamily: 'Inter_600SemiBold' }]}>
            {t(tierKey)}
          </AppText>
          {p.creek ? <AppText style={styles.footer}>· {p.creek}</AppText> : null}
          {p.jurisdiction ? <AppText style={styles.footer}>· {p.jurisdiction}</AppText> : null}
          {windowOverride ? (
            <AppText
              style={[
                styles.footer,
                {
                  color: LOCKED_STATE_HEX.watch,
                  fontFamily: 'Inter_600SemiBold',
                  fontVariant: ['tabular-nums'],
                },
              ]}
            >
              · [{windowOverride[0]}–{windowOverride[1]} min] ·{' '}
              {t('state.range', { lo: windowOverride[0], hi: windowOverride[1] })}
            </AppText>
          ) : null}
        </View>
      </View>

      <AppText style={{ color: isSaved ? c.watch : c.subtle, fontSize: 20, paddingLeft: 4 }}>
        {isSaved ? '★' : '›'}
      </AppText>
    </Pressable>
  );
}
