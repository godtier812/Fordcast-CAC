import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { usePreferences } from '@/lib/preferences';
import { theme } from '@/lib/theme';
export default function TabsLayout() {
  const { t } = usePreferences();
  return (
    <NativeTabs backgroundColor={theme.bg} tintColor={theme.text}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('nav.map')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="map" md="map" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="drive">
        <NativeTabs.Trigger.Label>{t('nav.drive')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="car" md="directions_car" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="replay">
        <NativeTabs.Trigger.Label>{t('nav.replay')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="play.circle" md="play_circle" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="alerts">
        <NativeTabs.Trigger.Label>{t('nav.alerts')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bell" md="notifications" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
