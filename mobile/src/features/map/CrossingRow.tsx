import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AppText, StatusGlyph, styles, type State } from '@/components/fordcast/UI';
import type { Crossing } from '@/lib/data';
import { usePreferences } from '@/lib/preferences';
import { theme } from '@/lib/theme';

export default function CrossingRow({
  crossing,
  stateOverride,
  windowOverride,
}: {
  crossing: Crossing;
  stateOverride?: State;
  windowOverride?: [number, number] | null;
}) {
  const { t, saved } = usePreferences();
  const p = crossing.properties;
  const tierKey = p.tier === 'A' ? 'tier.a' : p.tier === 'B' ? 'tier.b' : 'tier.c';
  const displayState: State = stateOverride ?? 'unknown';
  const stateLabel = t(`state.${displayState}`);
  const tierColor = p.tier === 'A' ? theme.water : p.tier === 'B' ? theme.link : theme.subtle;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.name}. ${t(tierKey)}. ${stateLabel}. ${saved.includes(p.id) ? t('crossing.saved') : ''}`}
      onPress={() => router.push({ pathname: '/crossing/[id]', params: { id: p.id } })}
      style={({ pressed }) => [
        styles.row,
        {
          paddingVertical: 18,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <StatusGlyph state={displayState} />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText style={{ fontFamily: 'Inter_600SemiBold' }}>{p.name}</AppText>
        <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
          <AppText style={[styles.footer, { color: tierColor, fontFamily: 'Inter_600SemiBold' }]}>
            {t(tierKey)}
          </AppText>
          {p.creek ? <AppText style={styles.footer}>· {p.creek}</AppText> : null}
          {windowOverride ? (
            <AppText style={[styles.footer, { color: theme.watch }]}>
              · {t('state.range', { lo: windowOverride[0], hi: windowOverride[1] })}
            </AppText>
          ) : null}
        </View>
      </View>
      <AppText style={{ color: saved.includes(p.id) ? theme.watch : theme.subtle, fontSize: 24 }}>
        {saved.includes(p.id) ? '★' : '›'}
      </AppText>
    </Pressable>
  );
}
