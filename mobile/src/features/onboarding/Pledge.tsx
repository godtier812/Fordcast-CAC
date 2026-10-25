import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  AppText,
  Badge,
  Button,
  Card,
  Dip,
  Eyebrow,
  Footer,
  Page,
  Title,
  styles,
} from '@/components/fordcast/UI';
import { usePreferences } from '@/lib/preferences';
import { theme as c } from '@/lib/theme';

export default function Pledge() {
  const { t, language, setLanguage, accept } = usePreferences();
  const [checks, setChecks] = useState([false, false, false]);
  const checkedCount = checks.filter(Boolean).length;

  return (
    <Page>
      <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
        <View style={[styles.row, { flex: 1, minWidth: 0 }]}>
          <Dip size={36} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Eyebrow color={c.water}>{t('app.name')}</Eyebrow>
            </View>
            <AppText style={{ color: c.subtle, fontSize: 12, lineHeight: 17 }}>
              {t('onboarding.pledge.subtitle')}
            </AppText>
          </View>
        </View>
        <Button
          secondary
          compact
          title={language === 'en' ? 'ES · Español' : 'EN · English'}
          onPress={() => setLanguage(language === 'en' ? 'es' : 'en')}
        />
      </View>

      <View
        style={{
          backgroundColor: c.surface,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.borderBright,
          padding: 18,
          gap: 14,
        }}
      >
        <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
          <Eyebrow color={c.watch}>{t('onboarding.pledge.required_badge')}</Eyebrow>
        </View>
        <Title>{t('app.tagline')}</Title>
        <AppText style={styles.muted}>{t('onboarding.prototype')}</AppText>
      </View>

      <Card style={{ borderColor: checkedCount === 3 ? c.water : c.borderBright, gap: 16 }}>
        <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
          <AppText accessibilityRole="header" style={styles.heading}>
            {t('onboarding.pledge.title')}
          </AppText>
          <Badge
            label={t('onboarding.pledge.acknowledged_badge', { count: checkedCount })}
            color={checkedCount === 3 ? c.water : c.subtle}
            bg={checkedCount === 3 ? c.waterDim : c.raised}
          />
        </View>

        {checks.map((checked, i) => (
          <Pressable
            key={i}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            onPress={() => setChecks((previous) => previous.map((v, j) => (j === i ? !v : v)))}
            style={({ pressed }) => [
              styles.row,
              {
                padding: 16,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: checked ? c.water : c.border,
                backgroundColor: checked ? c.waterDim : c.land,
                alignItems: 'flex-start',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View
              style={{
                width: 24,
                height: 24,
                marginTop: 1,
                borderWidth: 2,
                borderColor: checked ? c.water : c.link,
                borderRadius: 7,
                backgroundColor: checked ? c.water : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {checked && (
                <Svg width={14} height={14} viewBox="0 0 16 16">
                  <Path
                    d="M3 8.5L6.5 12L13 4.5"
                    stroke={c.bg}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              )}
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Eyebrow color={checked ? c.water : c.subtle}>{`0${i + 1} · ${language === 'es' ? 'REGLA DE PRECAUCIÓN' : 'SAFETY RULE'}`}</Eyebrow>
              <AppText style={{ flex: 1, color: checked ? c.text : c.muted }}>
                {t(`onboarding.pledge.item${i + 1}` as 'onboarding.pledge.item1')}
              </AppText>
            </View>
          </Pressable>
        ))}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            paddingTop: 4,
          }}
        >
          <AppText style={[styles.footer, { flex: 1 }]}>{t('onboarding.pledge.hint')}</AppText>
          <Button
            title={t('onboarding.pledge.accept')}
            disabled={!checks.every(Boolean)}
            onPress={accept}
          />
        </View>
      </Card>
      <Button secondary title={language === 'es' ? 'Datos, privacidad y límites' : 'Data, privacy and limits'} onPress={() => router.push('/privacy')} />
      <Footer />
    </Page>
  );
}
