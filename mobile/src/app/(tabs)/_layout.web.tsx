import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { usePreferences } from '@/lib/preferences';
import { theme } from '@/lib/theme';
import { AppText } from '@/components/fordcast/UI';
export default function WebTabs() {
  const { t } = usePreferences();
  return (
    <Tabs style={{ flex: 1, backgroundColor: theme.bg }}>
      <TabSlot />
      <TabList style={s.bar}>
        <TabTrigger name="map" href="/" style={s.tab}>
          <AppText>{t('nav.map')}</AppText>
        </TabTrigger>
        <TabTrigger name="drive" href="/drive" style={s.tab}>
          <AppText>{t('nav.drive')}</AppText>
        </TabTrigger>
        <TabTrigger name="replay" href="/replay" style={s.tab}>
          <AppText>{t('nav.replay')}</AppText>
        </TabTrigger>
        <TabTrigger name="alerts" href="/alerts" style={s.tab}>
          <AppText>{t('nav.alerts')}</AppText>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}
const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderColor: theme.border,
    padding: 12,
    backgroundColor: theme.bg,
  },
  tab: { minHeight: 48, padding: 14, color: theme.text },
});
