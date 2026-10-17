import { View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  Eyebrow,
  Footer,
  Page,
  Title,
  styles,
} from '@/components/fordcast/UI';
import { usePreferences } from '@/lib/preferences';
export default function Settings() {
  const { t, language, setLanguage, resetPledge } = usePreferences();
  return (
    <Page>
      <Title>{t('settings.title')}</Title>
      <Card>
        <AppText style={styles.heading}>{t('settings.language')}</AppText>
        <View style={styles.row}>
          <Button
            secondary={language !== 'en'}
            title={t('settings.english')}
            onPress={() => setLanguage('en')}
          />
          <Button
            secondary={language !== 'es'}
            title={t('settings.spanish')}
            onPress={() => setLanguage('es')}
          />
        </View>
        <AppText style={styles.footer}>{t('settings.review')}</AppText>
      </Card>
      {(['about', 'privacy', 'sources'] as const).map((key) => (
        <Card key={key}>
          <AppText style={styles.heading}>{t(`settings.${key}`)}</AppText>
          <AppText style={styles.muted}>{t(`settings.${key}_body`)}</AppText>
        </Card>
      ))}
      <Eyebrow>{t('common.prototype')} · 0.1.0</Eyebrow>
      <Button secondary title={t('settings.intro')} onPress={resetPledge} />
      <Footer />
    </Page>
  );
}
