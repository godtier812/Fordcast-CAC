import { router } from 'expo-router';
import { AppText, Button, Page, Title, styles } from '@/components/fordcast/UI';
import { usePreferences } from '@/lib/preferences';

export default function NotFound() {
  const { language } = usePreferences();
  const es = language === 'es';
  return (
    <Page>
      <AppText style={styles.eyebrow}>FORDCAST · 404</AppText>
      <Title>{es ? 'No encontramos esta página' : 'Page not found'}</Title>
      <AppText style={styles.muted}>{es ? 'El enlace puede haber cambiado. Vuelva al mapa para revisar un viaje.' : 'This link may have changed. Return to the map to check a trip.'}</AppText>
      <Button title={es ? 'Volver al mapa' : 'Return to map'} onPress={() => router.replace('/')} />
    </Page>
  );
}
