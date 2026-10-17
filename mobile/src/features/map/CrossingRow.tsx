import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AppText, StatusGlyph, styles } from '@/components/fordcast/UI';
import type { Crossing } from '@/lib/data';
import { usePreferences } from '@/lib/preferences';
import { theme } from '@/lib/theme';
export default function CrossingRow({ crossing }: { crossing: Crossing }) {
  const { t, saved } = usePreferences();
  const p = crossing.properties;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.name}. ${t('state.not_monitored')}. ${saved.includes(p.id) ? t('crossing.saved') : ''}`}
      onPress={() => router.push({ pathname: '/crossing/[id]', params: { id: p.id } })}
      style={({ pressed }) => [
        styles.row,
        {
          paddingVertical: 20,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <StatusGlyph state="unknown" />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText style={{ fontFamily: 'Inter_600SemiBold' }}>{p.name}</AppText>
        <AppText style={styles.footer}>
          {t('state.not_monitored')} · {p.source}
        </AppText>
      </View>
      <AppText style={{ color: theme.subtle, fontSize: 24 }}>
        {saved.includes(p.id) ? '★' : '›'}
      </AppText>
    </Pressable>
  );
}
