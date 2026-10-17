import { View } from 'react-native';
import {
  AppText,
  Card,
  Footer,
  Page,
  StatusGlyph,
  Title,
  styles,
  type State,
} from '@/components/fordcast/UI';
import { usePreferences } from '@/lib/preferences';
export default function Legend() {
  const { t } = usePreferences();
  return (
    <Page>
      <Title>{t('legend.title')}</Title>
      <AppText style={styles.muted}>{t('legend.body')}</AppText>
      {(['no_rise', 'watch', 'avoid', 'closed', 'unknown'] as State[]).map((state) => (
        <Card key={state}>
          <View style={styles.row}>
            <StatusGlyph state={state} />
            <AppText style={styles.heading}>{t(`state.${state}`)}</AppText>
          </View>
          <AppText style={styles.muted}>{t(`legend.${state}`)}</AppText>
        </Card>
      ))}
      <Footer />
    </Page>
  );
}
