import { Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
import { crossings, gauges, links } from '@/lib/data';
import { usePreferences } from '@/lib/preferences';
import { theme as c } from '@/lib/theme';

export default function CrossingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, saved, toggleSaved, watchIds, toggleWatch } = usePreferences();
  const crossing = crossings.find((f) => f.properties.id === id);
  if (!crossing)
    return (
      <Page>
        <Title>{t('crossing.not_found')}</Title>
      </Page>
    );
  const p = crossing.properties;
  const tierKey = p.tier === 'A' ? 'tier.a' : p.tier === 'B' ? 'tier.b' : 'tier.c';
  const crossingLinks = links.filter((l) => l.crossing_id === p.id);
  const isSaved = saved.includes(p.id);
  const isWatchEnabled = watchIds.includes(p.id);

  return (
    <Page>
      <Eyebrow color={p.tier === 'A' ? c.water : p.tier === 'B' ? c.link : c.subtle}>
        {t(tierKey)}
      </Eyebrow>
      <Title>{p.name}</Title>
      {p.creek ? (
        <AppText style={styles.muted}>
          {p.creek} · {p.jurisdiction}
        </AppText>
      ) : null}

      <Card>
        <View style={styles.row}>
          <StatusGlyph state="unknown" size={54} />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText style={styles.heading}>{t('state.unknown')}</AppText>
            <AppText style={styles.footer}>{t('fresh.none')}</AppText>
          </View>
        </View>
        <AppText style={styles.muted}>{t('state.unknown_body')}</AppText>
      </Card>

      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        <View style={{ flex: 1 }}>
          <Button
            title={t(isSaved ? 'crossing.remove' : 'crossing.save')}
            onPress={() => toggleSaved(p.id)}
          />
        </View>
        {(p.tier === 'A' || p.tier === 'B') && (
          <View style={{ flex: 1 }}>
            <Button
              secondary={!isWatchEnabled}
              title={t(isWatchEnabled ? 'crossing.watch_enabled' : 'crossing.watch_opt_in')}
              onPress={() => toggleWatch(p.id)}
            />
          </View>
        )}
      </View>

      {crossingLinks.length > 0 && (
        <Card style={{ borderColor: c.water }}>
          <AppText style={styles.heading}>{t('crossing.upstream_links')}</AppText>
          {p.overtop_stage_ft != null && (
            <AppText style={{ color: c.watch, fontFamily: 'Inter_600SemiBold' }}>
              {t('crossing.overtop', {
                overtop: p.overtop_stage_ft.toFixed(1),
                quality: p.truth_source ?? 'verified',
              })}
            </AppText>
          )}
          {crossingLinks.map((lnk) => {
            const g = gauges.find((gf) => gf.properties.id === lnk.gauge_id);
            const gName = g?.properties.name ?? lnk.gauge_id;
            return (
              <View
                key={`${lnk.crossing_id}-${lnk.gauge_id}`}
                style={{
                  paddingTop: 10,
                  borderTopWidth: 1,
                  borderTopColor: c.border,
                  gap: 4,
                }}
              >
                <AppText style={{ fontFamily: 'Inter_600SemiBold' }}>
                  {gName} ({lnk.gauge_id})
                </AppText>
                <AppText style={styles.muted}>
                  {t('crossing.travel_time', {
                    tau_lo: lnk.tau_lo_min,
                    tau_hi: lnk.tau_hi_min,
                    dist: lnk.channel_dist_km.toFixed(1),
                  })}
                </AppText>
                <AppText style={styles.footer}>
                  {t('crossing.triggers', {
                    watch: lnk.watch_stage_ft.toFixed(2),
                    trigger: lnk.trigger_stage_ft.toFixed(2),
                  })}
                </AppText>
              </View>
            );
          })}
          <Button
            secondary
            title={t('crossing.replay_cta')}
            onPress={() => router.push('/replay')}
          />
        </Card>
      )}

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
