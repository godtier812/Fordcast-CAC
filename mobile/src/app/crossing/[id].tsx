import { Linking, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  Eyebrow,
  Footer,
  Page,
  StatusGlyph,
  Title,
  styles,
} from '@/components/fordcast/UI';
import { crossings } from '@/lib/data';
import { usePreferences } from '@/lib/preferences';
export default function CrossingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, saved, toggleSaved } = usePreferences();
  const crossing = crossings.find((f) => f.properties.id === id);
  if (!crossing)
    return (
      <Page>
        <Title>{t('crossing.not_found')}</Title>
      </Page>
    );
  const p = crossing.properties;
  return (
    <Page>
      <Eyebrow>{t('crossing.review')}</Eyebrow>
      <Title>{p.name}</Title>
      <Card>
        <View style={styles.row}>
          <StatusGlyph state="unknown" size={54} />
          <AppText style={[styles.heading, { flex: 1 }]}>{t('state.unknown')}</AppText>
        </View>
        <AppText style={styles.footer}>{t('fresh.none')}</AppText>
      </Card>
      <Button
        title={t(saved.includes(p.id) ? 'crossing.remove' : 'crossing.save')}
        onPress={() => toggleSaved(p.id)}
      />
      <Card>
        <AppText style={styles.heading}>{t('crossing.why')}</AppText>
        <AppText style={styles.muted}>{t('state.unknown_body')}</AppText>
        <AppText style={styles.footer}>
          {t('common.source')}: {p.source}
        </AppText>
        <AppText style={styles.footer}>
          {t('crossing.coordinates')}:{' '}
          {crossing.geometry.coordinates.map((x) => x.toFixed(5)).join(', ')}
        </AppText>
      </Card>
      <Button
        secondary
        title={t('crossing.official')}
        onPress={() => {
          void Linking.openURL('https://www.atxfloods.com/crossings');
        }}
      />
      <Footer />
    </Page>
  );
}
