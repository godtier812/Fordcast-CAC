import { router } from 'expo-router';
import { AppText, Button, Card, Footer, Page, Title, styles } from '@/components/fordcast/UI';
import CrossingRow from '@/features/map/CrossingRow';
import { crossings } from '@/lib/data';
import { usePreferences } from '@/lib/preferences';
export default function Alerts() {
  const { t, saved } = usePreferences();
  const selected = crossings.filter((f) => saved.includes(f.properties.id));
  return (
    <Page>
      <Title>{t('alerts.title')}</Title>
      <AppText style={styles.muted}>{t('alerts.body')}</AppText>
      {selected.length ? (
        selected.map((f) => <CrossingRow key={f.properties.id} crossing={f} />)
      ) : (
        <Card>
          <AppText style={styles.heading}>{t('alerts.empty')}</AppText>
          <AppText style={styles.muted}>{t('alerts.empty_body')}</AppText>
          <Button title={t('alerts.browse')} onPress={() => router.navigate('/')} />
        </Card>
      )}
      <Footer />
    </Page>
  );
}
