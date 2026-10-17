import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
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
import CrossingRow from '@/features/map/CrossingRow';
import { crossings } from '@/lib/data';
import { usePreferences } from '@/lib/preferences';
import { theme as c } from '@/lib/theme';

export default function Alerts() {
  const { t, saved, watchIds, toggleWatch } = usePreferences();
  const [testLogs, setTestLogs] = useState<{ id: string; title: string; body: string }[]>([]);
  const selected = crossings.filter((f) => saved.includes(f.properties.id));

  const sendTestAlert = () => {
    const targetName = selected[0]?.properties.name ?? 'Wasson Rd Master Arm (N)';
    const entry = {
      id: `${Date.now()}`,
      title: t('alerts.test_title'),
      body: t('alerts.test', { crossing: targetName, lo: 15, hi: 45 }),
    };
    setTestLogs((prev) => [entry, ...prev.slice(0, 4)]);
  };

  return (
    <Page>
      <Title>{t('alerts.title')}</Title>
      <AppText style={styles.muted}>{t('alerts.body')}</AppText>

      <Button title={t('alerts.test_call')} onPress={sendTestAlert} />

      {testLogs.length > 0 && (
        <Card style={{ borderColor: c.watch }}>
          <Eyebrow color={c.watch}>{t('alerts.recent_title')}</Eyebrow>
          {testLogs.map((item) => (
            <View
              key={item.id}
              style={{
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
                gap: 4,
              }}
            >
              <View style={styles.row}>
                <StatusGlyph state="avoid" size={28} />
                <AppText style={{ fontFamily: 'Inter_600SemiBold', color: c.watch }}>
                  {item.title}
                </AppText>
              </View>
              <AppText style={styles.muted}>{item.body}</AppText>
            </View>
          ))}
        </Card>
      )}

      {selected.length ? (
        selected.map((f) => {
          const p = f.properties;
          const isWatchOn = watchIds.includes(p.id);
          return (
            <View key={p.id} style={{ gap: 6 }}>
              <CrossingRow crossing={f} />
              {(p.tier === 'A' || p.tier === 'B') && (
                <Button
                  secondary={!isWatchOn}
                  title={t(isWatchOn ? 'crossing.watch_enabled' : 'crossing.watch_opt_in')}
                  onPress={() => toggleWatch(p.id)}
                />
              )}
            </View>
          );
        })
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
