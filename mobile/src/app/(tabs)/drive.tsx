import { router } from 'expo-router';
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
export default function Drive() {
  const { t } = usePreferences();
  return (
    <Page>
      <Dip size={70} />
      <Eyebrow>{t('drive.eyebrow')}</Eyebrow>
      <Title>{t('drive.title')}</Title>
      <AppText style={styles.muted}>{t('drive.body')}</AppText>
      <Button title={t('drive.action')} onPress={() => router.navigate('/alerts')} />
      <Card>
        <AppText style={styles.heading}>{t('drive.tadd')}</AppText>
        <Footer />
      </Card>
    </Page>
  );
}
