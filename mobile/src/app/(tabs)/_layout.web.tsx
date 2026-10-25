import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { usePreferences } from '@/lib/preferences';
import { theme as c } from '@/lib/theme';
import { AppText, Dip } from '@/components/fordcast/UI';

function TabIcon({
  name,
  active,
}: {
  name: 'map' | 'replay' | 'drive' | 'alerts';
  active: boolean;
}) {
  const stroke = active ? c.water : c.subtle;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      {name === 'map' && (
        <Path
          d="M3 6L9 3L15 6L21 3V18L15 21L9 18L3 21V6ZM9 3V18M15 6V21"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
      {name === 'replay' && (
        <Path
          d="M3 17L8 11L13 14L21 6M21 6H15M21 6V12"
          stroke={active ? c.replay : stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
      {name === 'drive' && (
        <>
          <Circle cx={12} cy={12} r={9} stroke={stroke} strokeWidth={2} fill="none" />
          <Path d="M12 8V13M12 16.5V17" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
        </>
      )}
      {name === 'alerts' && (
        <Path
          d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8ZM13.73 21A2 2 0 0 1 10.27 21"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
    </Svg>
  );
}

export default function WebTabs() {
  const { t, language, setLanguage } = usePreferences();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isActive = (target: string) =>
    target === '/' ? pathname === '/' || pathname === '/index' : pathname.startsWith(target);

  // Phone-sized browser: behave like the app, with a bottom tab bar.
  if (width < 760) {
    const items = [
      { name: 'map', href: '/', icon: 'map', label: t('nav.map') },
      { name: 'replay', href: '/replay', icon: 'replay', label: t('nav.replay') },
      { name: 'drive', href: '/drive', icon: 'drive', label: t('nav.drive') },
      { name: 'alerts', href: '/alerts', icon: 'alerts', label: t('nav.alerts') },
    ] as const;
    return (
      <Tabs style={{ flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: c.bg }}>
        <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><TabSlot style={{ flex: 1, minHeight: 0 }} /></View>
        <TabList style={s.bottomBar}>
          {items.map((it) => {
            const active = isActive(it.href);
            return (
              <TabTrigger key={it.name} name={it.name} href={it.href} style={s.bottomTab}>
                <TabIcon name={it.icon} active={active} />
                <AppText style={[s.bottomText, active && { color: c.water }]}>{it.label}</AppText>
              </TabTrigger>
            );
          })}
        </TabList>
      </Tabs>
    );
  }

  return (
    <Tabs style={{ flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: c.bg }}>
      <TabList style={s.headerBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <Dip size={38} />
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18, lineHeight: 22 }}>
                FordCast
              </AppText>
            </View>
            <AppText style={{ color: c.subtle, fontSize: 11, lineHeight: 15 }}>
              {t('home.tagline')}
            </AppText>
          </View>
        </Pressable>

        <TabTrigger name="map" href="/" style={[s.tab, isActive('/') && s.tabActive]}>
          <TabIcon name="map" active={isActive('/')} />
          <AppText style={[s.tabText, isActive('/') && s.tabTextActive]}>{t('nav.map')}</AppText>
        </TabTrigger>
        <TabTrigger
          name="replay"
          href="/replay"
          style={[s.tab, isActive('/replay') && s.tabActiveReplay]}
        >
          <TabIcon name="replay" active={isActive('/replay')} />
          <AppText style={[s.tabText, isActive('/replay') && { color: c.replay }]}>
            {t('nav.replay')}
          </AppText>
        </TabTrigger>
        <TabTrigger name="drive" href="/drive" style={[s.tab, isActive('/drive') && s.tabActive]}>
          <TabIcon name="drive" active={isActive('/drive')} />
          <AppText style={[s.tabText, isActive('/drive') && s.tabTextActive]}>
            {t('nav.drive')}
          </AppText>
        </TabTrigger>
        <TabTrigger
          name="alerts"
          href="/alerts"
          style={[s.tab, isActive('/alerts') && s.tabActive]}
        >
          <TabIcon name="alerts" active={isActive('/alerts')} />
          <AppText style={[s.tabText, isActive('/alerts') && s.tabTextActive]}>
            {t('nav.alerts')}
          </AppText>
        </TabTrigger>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={language === 'en' ? 'Español' : 'English'}
            onPress={() => setLanguage(language === 'en' ? 'es' : 'en')}
            style={s.utilBtn}
          >
            <AppText style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: c.water }}>
              {language === 'en' ? 'ES · Español' : 'EN · English'}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('nav.settings')}
            onPress={() => router.push('/settings')}
            style={s.utilBtn}
          >
            <AppText style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: c.muted }}>
              {t('nav.settings')}
            </AppText>
          </Pressable>
        </View>
      </TabList>
      <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><TabSlot style={{ flex: 1, minHeight: 0 }} /></View>
    </Tabs>
  );
}

const s = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderColor: c.border,
    backgroundColor: c.land,
    paddingTop: 6,
    paddingBottom: 10,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 48,
  },
  bottomText: {
    fontSize: 11.5,
    lineHeight: 14,
    fontFamily: 'Inter_600SemiBold',
    color: c.muted,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    borderBottomWidth: 1,
    borderColor: c.border,
    backgroundColor: c.land,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  tabActive: {
    backgroundColor: c.raised,
    borderWidth: 1,
    borderColor: c.water,
  },
  tabActiveReplay: {
    backgroundColor: c.replayDim,
    borderWidth: 1,
    borderColor: c.replay,
  },
  tabText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter_600SemiBold',
    color: c.muted,
  },
  tabTextActive: {
    color: c.water,
  },
  utilBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderBright,
  },
});
