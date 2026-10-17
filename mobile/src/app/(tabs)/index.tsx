import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  Dip,
  Eyebrow,
  Footer,
  Page,
  StatusGlyph,
  Title,
  styles,
} from '@/components/fordcast/UI';
import { crossings } from '@/lib/data';
import { usePreferences } from '@/lib/preferences';
import { theme as c } from '@/lib/theme';
import MapSurface from '@/features/map/MapSurface';
import CrossingRow from '@/features/map/CrossingRow';
export default function MapHome() {
  const { t } = usePreferences();
  const [query, setQuery] = useState('');
  const [map, setMap] = useState(true);
  const filtered = useMemo(
    () =>
      crossings.filter((f) =>
        f.properties.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      ),
    [query],
  );
  return (
    <Page>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={styles.row}>
          <Dip />
          <AppText style={styles.heading}>FordCast</AppText>
        </View>
        <Button secondary title={t('nav.settings')} onPress={() => router.push('/settings')} />
      </View>
      <View style={{ gap: 9 }}>
        <Eyebrow>{t('map.region')}</Eyebrow>
        <Title>{t('map.title')}</Title>
        <AppText style={styles.muted}>{t('map.body')}</AppText>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button
            secondary
            title={map ? t('map.list') : t('map.map')}
            onPress={() => setMap(!map)}
          />
        </View>
        <Button secondary title={t('map.legend')} onPress={() => router.push('/legend')} />
      </View>
      {map && (
        <MapSurface
          features={filtered}
          onSelect={(id) => router.push({ pathname: '/crossing/[id]', params: { id } })}
        />
      )}
      <Card>
        <View style={styles.row}>
          <StatusGlyph state="unknown" />
          <AppText style={{ fontFamily: 'Inter_600SemiBold', flex: 1 }}>
            {t('map.coverage')}
          </AppText>
        </View>
        <AppText style={[styles.muted, { fontSize: 14, lineHeight: 22 }]}>
          {t('map.coverage_body')}
        </AppText>
      </Card>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('map.search')}
        accessibilityLabel={t('map.search')}
        placeholderTextColor={c.subtle}
        style={{
          minHeight: 54,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.subtle,
          color: c.text,
          backgroundColor: c.surface,
          paddingHorizontal: 18,
          fontFamily: 'Inter_400Regular',
          fontSize: 16,
        }}
      />
      <View>
        <Eyebrow>{t('map.records', { count: filtered.length })}</Eyebrow>
        {filtered.length ? (
          filtered.map((f) => <CrossingRow key={f.properties.id} crossing={f} />)
        ) : (
          <AppText style={{ paddingVertical: 24 }}>{t('map.empty')}</AppText>
        )}
      </View>
      <Footer />
    </Page>
  );
}
