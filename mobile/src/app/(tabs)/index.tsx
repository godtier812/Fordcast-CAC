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

type FilterMode = 'all' | 'monitored' | 'tier_a' | 'tier_b' | 'saved';

export default function MapHome() {
  const { t, saved, setActiveStormId, setSimDriveActive } = usePreferences();
  const [query, setQuery] = useState('');
  const [map, setMap] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('monitored');

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return crossings
      .filter((f) => {
        const p = f.properties;
        if (filterMode === 'monitored' && p.tier !== 'A' && p.tier !== 'B') return false;
        if (filterMode === 'tier_a' && p.tier !== 'A') return false;
        if (filterMode === 'tier_b' && p.tier !== 'B') return false;
        if (filterMode === 'saved' && !saved.includes(p.id)) return false;
        if (!q) return true;
        const hay = `${p.name} ${p.road ?? ''} ${p.creek ?? ''}`.toLocaleLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const rankTier = { A: 0, B: 1, C: 2 } as Record<string, number>;
        const diff = (rankTier[a.properties.tier] ?? 2) - (rankTier[b.properties.tier] ?? 2);
        return diff !== 0 ? diff : a.properties.name.localeCompare(b.properties.name);
      });
  }, [query, filterMode, saved]);

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
      <Card style={{ borderColor: c.replay }}>
        <Eyebrow color={c.replay}>{t('demo.eyebrow')}</Eyebrow>
        <AppText style={styles.heading}>{t('demo.title')}</AppText>
        <AppText style={[styles.muted, { fontSize: 14, lineHeight: 22 }]}>{t('demo.body')}</AppText>
        <Button
          title={t('demo.sample1')}
          onPress={() => {
            setActiveStormId('halloween-2013');
            router.push('/replay');
          }}
        />
        <Button
          secondary
          title={t('demo.sample2')}
          onPress={() => {
            setActiveStormId('halloween-2013');
            setSimDriveActive(true);
            router.push('/drive');
          }}
        />
        <Button
          secondary
          title={t('demo.sample3')}
          onPress={() => router.push({ pathname: '/crossing/[id]', params: { id: 'atx-7' } })}
        />
      </Card>
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
          <StatusGlyph state="watch" />
          <AppText style={{ fontFamily: 'Inter_600SemiBold', flex: 1 }}>
            {t('map.coverage')}
          </AppText>
        </View>
        <AppText style={[styles.muted, { fontSize: 14, lineHeight: 22 }]}>
          {t('map.coverage_body')}
        </AppText>
      </Card>
      <View style={[styles.row, { flexWrap: 'wrap', gap: 8 }]}>
        {(['monitored', 'tier_a', 'tier_b', 'saved', 'all'] as const).map((mode) => (
          <Button
            key={mode}
            secondary={filterMode !== mode}
            title={t(`map.filter.${mode}`)}
            onPress={() => setFilterMode(mode)}
          />
        ))}
      </View>
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
