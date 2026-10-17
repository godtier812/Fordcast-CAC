import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Speech from 'expo-speech';
import { Pressable, View } from 'react-native';
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
import {
  crossings,
  initialLockoutState,
  replays,
  stateAt,
  stepLockout,
  type LockoutState,
} from '@/lib/data';
import { usePreferences } from '@/lib/preferences';
import { theme as c } from '@/lib/theme';

export default function Drive() {
  const { t, language, activeStormId, simDriveActive, setSimDriveActive } = usePreferences();
  const replay = replays[activeStormId] ?? replays['halloween-2013']!;

  // Pick a simulated timestamp during the peak warning phase of the storm
  const peakSimT = useMemo(() => {
    const heroAlert = replay.hero?.first_alert_at;
    if (heroAlert) return Date.parse(heroAlert);
    const firstAvoid = replay.storyboard.find((s) => s.kind === 'first_avoid')?.t;
    if (firstAvoid) return Date.parse(firstAvoid);
    return Date.parse(replay.storm.start) + 6 * 3600_000;
  }, [replay]);

  const monitoredRoute = useMemo(
    () =>
      replay.crossings.map((rc) => {
        const full = crossings.find((f) => f.properties.id === rc.id);
        return {
          id: rc.id,
          name: language === 'es' ? rc.name_es : rc.name,
          creek: full?.properties.creek ?? 'Watershed crossing',
          slice: stateAt(replay, rc.id, peakSimT),
        };
      }),
    [replay, language, peakSimT],
  );

  const heroIdx = useMemo(() => {
    const idx = monitoredRoute.findIndex(
      (item) => item.id === (replay.hero?.crossing_id ?? 'atx-7'),
    );
    return idx >= 0 ? idx : 0;
  }, [monitoredRoute, replay.hero]);

  const [crossingIdx, setCrossingIdx] = useState<number | null>(null);
  const [distanceM, setDistanceM] = useState(650);
  const [muted, setMuted] = useState(false);
  const [simMph, setSimMph] = useState(0);
  const [lockout, setLockout] = useState<LockoutState>(initialLockoutState);

  const effectiveIdx =
    crossingIdx !== null && crossingIdx < monitoredRoute.length ? crossingIdx : heroIdx;
  const currentItem = monitoredRoute[effectiveIdx] ?? monitoredRoute[0]!;
  const stateKey = currentItem.slice.state;
  const win = currentItem.slice.window;

  const spokenText = useMemo(() => {
    const base = `${currentItem.name}. ${t(`state.${stateKey}_spoken`)}`;
    if (win) {
      return `${base} ${t('state.range_spoken', { lo: win[0], hi: win[1] })}. ${t('drive.tadd')}`;
    }
    return `${base} ${t('drive.tadd')}`;
  }, [currentItem.name, stateKey, win, t]);

  const speakAlert = useCallback(
    (text: string) => {
      if (muted) return;
      try {
        Speech.stop();
        Speech.speak(text, {
          language: language === 'es' ? 'es-MX' : 'en-US',
          rate: 0.96,
        });
      } catch {
        // Ignore TTS errors on headless/unsupported environments
      }
    },
    [muted, language],
  );

  useEffect(() => {
    return () => {
      try {
        Speech.stop();
      } catch {
        // Ignore
      }
    };
  }, []);

  const toggleSimulatedSpeed = () => {
    const nextMph = simMph === 0 ? 25 : 0;
    setSimMph(nextMph);
    const speedMps = nextMph * 0.44704;
    // Simulate 12 seconds at the new speed to trigger/clear lockout deterministically
    const s1 = stepLockout({ ...lockout, passengerOverride: false }, { tMs: 1000, speedMps });
    const s2 = stepLockout(s1, { tMs: nextMph > 15 ? 12_000 : 35_000, speedMps });
    setLockout(s2);
  };

  return (
    <Page>
      <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
        <Eyebrow color={c.replay}>{t('drive.eyebrow')}</Eyebrow>
        <View style={[styles.row, { gap: 8 }]}>
          <Eyebrow color={c.replay}>{t('replay.banner')}</Eyebrow>
          <Eyebrow color={c.watch}>· {t('replay.simulated_drive')}</Eyebrow>
        </View>
      </View>

      <Title>{t('drive.title')}</Title>
      <AppText style={styles.muted}>{t('drive.body')}</AppText>

      {/* High-contrast #070D18 NHTSA HUD Card */}
      <Card
        style={{
          backgroundColor: '#070D18',
          borderColor:
            stateKey === 'avoid' || stateKey === 'closed'
              ? c.avoid
              : stateKey === 'watch'
                ? c.watch
                : c.replay,
          borderWidth: 2,
          padding: 24,
          gap: 16,
        }}
      >
        <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
          <AppText style={{ color: c.replay, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
            {t('replay.simulated_drive')} ·{' '}
            {language === 'es' ? replay.storm.name_es : replay.storm.name_en}
          </AppText>
          <AppText style={styles.footer}>
            {t('drive.ahead', { dist: distanceM, creek: currentItem.creek })}
          </AppText>
        </View>

        <View style={[styles.row, { gap: 18 }]}>
          <StatusGlyph state={stateKey} size={68} />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText
              style={{
                fontSize: 34,
                lineHeight: 40,
                fontFamily: 'Inter_600SemiBold',
                color:
                  stateKey === 'avoid' || stateKey === 'closed'
                    ? c.avoid
                    : stateKey === 'watch'
                      ? c.watch
                      : c.text,
              }}
            >
              {t(`state.${stateKey}`)}
            </AppText>
            <AppText style={{ fontSize: 20, lineHeight: 26, fontFamily: 'Inter_600SemiBold' }}>
              {currentItem.name}
            </AppText>
            {win && (
              <AppText style={{ color: c.watch, fontFamily: 'Inter_600SemiBold' }}>
                {t('state.range', { lo: win[0], hi: win[1] })}
              </AppText>
            )}
          </View>
        </View>

        <View
          style={{
            backgroundColor: c.surface,
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Eyebrow>{t('drive.spoken_banner')}</Eyebrow>
          <AppText style={{ fontSize: 16, lineHeight: 24 }} accessibilityLiveRegion="polite">
            “{spokenText}”
          </AppText>
        </View>

        {/* Large >=76pt NHTSA HUD action buttons */}
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            onPress={() => speakAlert(spokenText)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 76,
              borderRadius: 20,
              backgroundColor: c.text,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <AppText
              style={{
                color: c.bg,
                fontFamily: 'Inter_600SemiBold',
                fontSize: 18,
              }}
            >
              {t('drive.repeat')}
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              const nextMuted = !muted;
              setMuted(nextMuted);
              if (nextMuted) {
                try {
                  Speech.stop();
                } catch {
                  // Ignore
                }
              }
            }}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 76,
              borderRadius: 20,
              backgroundColor: c.raised,
              borderWidth: 1,
              borderColor: c.border,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <AppText
              style={{
                color: c.text,
                fontFamily: 'Inter_600SemiBold',
                fontSize: 18,
              }}
            >
              {t(muted ? 'drive.unmute' : 'drive.mute')}
            </AppText>
          </Pressable>
        </View>

        {!lockout.locked ? (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Button
                secondary
                title={t('drive.prev_crossing')}
                onPress={() => {
                  const nextIdx =
                    (effectiveIdx - 1 + monitoredRoute.length) % monitoredRoute.length;
                  setCrossingIdx(nextIdx);
                  setDistanceM(650);
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                secondary
                title={t('drive.next_crossing')}
                onPress={() => {
                  const nextIdx = (effectiveIdx + 1) % monitoredRoute.length;
                  setCrossingIdx(nextIdx);
                  setDistanceM((d) => (d <= 250 ? 650 : 250));
                }}
              />
            </View>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: 14,
              padding: 14,
              borderColor: c.watch,
              borderWidth: 1,
              gap: 10,
            }}
          >
            <AppText style={{ color: c.watch, fontFamily: 'Inter_600SemiBold' }}>
              {t('drive.lockout_active')}
            </AppText>
            <Button
              secondary
              title={t('drive.passenger_override')}
              onPress={() =>
                setLockout((prev) => ({ ...prev, locked: false, passengerOverride: true }))
              }
            />
          </View>
        )}
      </Card>

      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        <View style={{ flex: 1 }}>
          <Button
            secondary
            title={t('drive.speed_sim', { mph: simMph })}
            onPress={toggleSimulatedSpeed}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            secondary={!simDriveActive}
            title={t(simDriveActive ? 'drive.stop_sim' : 'drive.action')}
            onPress={() => setSimDriveActive(!simDriveActive)}
          />
        </View>
      </View>

      <Card>
        <AppText style={styles.heading}>{t('drive.tadd')}</AppText>
        <Footer />
      </Card>
    </Page>
  );
}
