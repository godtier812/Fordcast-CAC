import { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  AppText,
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
  return (
    <Page>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Dip size={60} />
        <Button
          secondary
          title={language === 'en' ? 'Español' : 'English'}
          onPress={() => setLanguage(language === 'en' ? 'es' : 'en')}
        />
      </View>
      <Eyebrow>{t('app.name')}</Eyebrow>
      <Title>{t('app.tagline')}</Title>
      <AppText style={styles.muted}>{t('onboarding.prototype')}</AppText>
      <Card>
        <AppText accessibilityRole="header" style={styles.heading}>
          {t('onboarding.pledge.title')}
        </AppText>
        {checks.map((checked, i) => (
          <Pressable
            key={i}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            onPress={() => setChecks((previous) => previous.map((v, j) => (j === i ? !v : v)))}
            style={[styles.row, { paddingVertical: 10, alignItems: 'flex-start' }]}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderWidth: 2,
                borderColor: c.link,
                borderRadius: 6,
                backgroundColor: checked ? c.link : 'transparent',
              }}
            />
            <AppText style={{ flex: 1 }}>
              {t(`onboarding.pledge.item${i + 1}` as 'onboarding.pledge.item1')}
            </AppText>
          </Pressable>
        ))}
        <AppText style={styles.footer}>{t('onboarding.pledge.hint')}</AppText>
        <Button
          title={t('onboarding.pledge.accept')}
          disabled={!checks.every(Boolean)}
          onPress={accept}
        />
      </Card>
      <Footer />
    </Page>
  );
}
