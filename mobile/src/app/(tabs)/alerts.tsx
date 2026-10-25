import { useEffect, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, Switch, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/fordcast/UI';
import { StateGlyphSvg } from '@/components/StateBadge';
import { FcIcon, type FcIconName } from '@/components/fc/Icons';
import { ACCENT, ActionButton, Chip, NearbyRow, Panel, SectionLabel, agoText } from '@/components/fc/Kit';
import { formatStormClock } from '@/lib/drill';
import { miToKm } from '@/lib/geo';
import { guardianRunning, guardianSupported, startGuardian, stopGuardian, type GuardianResult } from '@/lib/guardian';
import { useMonitor } from '@/lib/monitor-context';
import { usePreferences } from '@/lib/preferences';
import {
  getVoicePersona,
  isCurrentlySpeaking,
  setVoiceMuted,
  setVoicePersona,
  speak,
  stopSpeaking,
  subscribeVoicePersona,
  subscribeVoiceStatus,
  VOICE_PERSONAS,
  type VoicePersonaId,
} from '@/lib/voice';
import { LOCKED_STATE_HEX, SURFACES } from '@/theme/tokens';

const S = SURFACES.dark;
const RADII = [1, 3, 5, 10];

function SetupRow({
  icon,
  title,
  status,
  ok,
  action,
}: {
  icon: FcIconName;
  title: string;
  status: string;
  ok: boolean;
  action?: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const narrow = width < 400;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, flexWrap: narrow ? 'wrap' : 'nowrap' }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: ok ? 'rgba(96, 165, 250, 0.16)' : S.elevated2,
        }}
      >
        <FcIcon name={icon} size={18} color={ok ? ACCENT : S.textSecondary} />
      </View>
      <View style={{ flex: 1, minWidth: narrow ? 140 : 0 }}>
        <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>{title}</AppText>
        <AppText style={{ fontSize: 13, lineHeight: 18, color: ok ? S.textSecondary : LOCKED_STATE_HEX.watch }}>
          {status}
        </AppText>
      </View>
      {action ? <View style={narrow ? { width: '100%', alignItems: 'flex-end' } : undefined}>{action}</View> : null}
    </View>
  );
}

function CompanionCard() {
  const { t, language } = usePreferences();
  const m = useMonitor();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GuardianResult | null>(null);
  useEffect(() => {
    let alive = true;
    void guardianRunning().then((r) => alive && setRunning(r));
    return () => {
      alive = false;
    };
  }, []);
  const supported = guardianSupported();
  return (
    <Panel>
      <AppText style={{ fontSize: 14.5, lineHeight: 21 }}>{t('companion.body')}</AppText>
      {Platform.OS === 'web' ? (
        <View
          style={{
            padding: 10,
            borderRadius: 10,
            backgroundColor: S.primary,
            borderWidth: 1,
            borderColor: S.borderSubtle,
            gap: 4,
          }}
        >
          <AppText style={{ fontSize: 12.5, lineHeight: 18, color: LOCKED_STATE_HEX.watch, fontFamily: 'Inter_600SemiBold' }}>
            {language === 'es'
              ? 'Límite en navegador web: el monitoreo continuo solo funciona mientras esta pestaña permanece activa.'
              : 'Web browser limitation: continuous monitoring only runs while this browser tab remains active.'}
          </AppText>
          <AppText style={{ fontSize: 12.5, lineHeight: 18, color: S.textSecondary }}>{t('companion.extension')}</AppText>
        </View>
      ) : supported ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Switch
            accessibilityLabel={t('companion.guardian')}
            value={running}
            onValueChange={(v) => {
              void (v ? startGuardian() : stopGuardian()).then((r) => {
                setResult(r);
                setRunning(r === 'started');
              });
            }}
            trackColor={{ true: ACCENT, false: S.elevated2 }}
          />
          <View style={{ flex: 1 }}>
            <AppText style={{ fontFamily: 'Inter_600SemiBold' }}>{t('companion.guardian')}</AppText>
            <AppText style={{ fontSize: 12.5, lineHeight: 17, color: S.textSecondary }}>
              {running
                ? t('companion.guardian_on')
                : result === 'denied'
                  ? t('companion.guardian_denied')
                  : t('companion.guardian_off')}
            </AppText>
          </View>
        </View>
      ) : (
        <AppText style={{ fontSize: 13, lineHeight: 18, color: LOCKED_STATE_HEX.watch }}>{t('companion.expo_go')}</AppText>
      )}
      <ActionButton
        icon="route"
        label={t('companion.plan')}
        onPress={() => {
          m.setMode('live');
          m.setHomeTab('route');
          router.navigate('/');
        }}
      />
    </Panel>
  );
}

export default function Alerts() {
  const { t, language, saved } = usePreferences();
  const m = useMonitor();
  const [persona, setPersonaState] = useState<VoicePersonaId>(() => getVoicePersona());
  const [speaking, setSpeaking] = useState<boolean>(() => isCurrentlySpeaking());
  const [previewPlayed, setPreviewPlayed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSafety, setShowSafety] = useState(false);

  useEffect(() => {
    const unsubPersona = subscribeVoicePersona(setPersonaState);
    const unsubStatus = subscribeVoiceStatus(setSpeaking);
    return () => {
      unsubPersona();
      unsubStatus();
    };
  }, []);

  const locStatus =
    m.locationSource === 'gps'
      ? t('alerts.location_on')
      : m.customOrigin
        ? language === 'es'
          ? `Punto de partida manual · ${m.customOrigin.name}`
          : `Custom starting point · ${m.customOrigin.name}`
        : m.locationPermission === 'denied'
          ? t('alerts.location_denied')
          : t('alerts.location_off');
  const notifStatus =
    m.notificationPermission === 'granted'
      ? t('alerts.notif_on')
      : m.notificationPermission === 'denied'
        ? t('alerts.notif_denied')
        : m.notificationPermission === 'unsupported'
          ? t('alerts.notif_unsupported')
          : t('alerts.notif_off');
  const inRange = m.statuses.filter(
    (s) => s.monitored && s.distanceKm <= miToKm(m.settings.alertRadiusMi),
  ).length;
  const savedStatuses = m.statuses.filter((s) => saved.includes(s.id));

  const triggerPreview = (targetPersona?: VoicePersonaId) => {
    if (targetPersona) setVoicePersona(targetPersona);
    setPreviewPlayed(true);
    speak(t('alerts.voice_test_phrase'), language, {
      force: true,
      allowWhenMuted: true,
      clipKey: 'voice_test',
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: S.primary }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48, width: '100%', maxWidth: 720, alignSelf: 'center' }}
      >
        <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 28, lineHeight: 34 }}>{t('alerts.title')}</AppText>
        <AppText style={{ fontSize: 15, lineHeight: 22, color: S.textSecondary }}>{t('alerts.body')}</AppText>

        <SectionLabel>{t('alerts.setup')}</SectionLabel>
        <Panel>
          <SetupRow
            icon="pin"
            title={t('alerts.location')}
            status={locStatus}
            ok={m.locationSource === 'gps' || m.customOrigin != null}
            action={
              m.locationSource !== 'gps' && m.locationPermission !== 'denied' ? (
                <ActionButton compact label={t('home.turn_on')} onPress={() => void m.requestLocation()} />
              ) : undefined
            }
          />
          <SetupRow
            icon="bell"
            title={t('alerts.notifications')}
            status={notifStatus}
            ok={m.notificationPermission === 'granted'}
            action={
              m.notificationPermission === 'undetermined' ? (
                <ActionButton compact label={t('home.turn_on')} onPress={() => void m.requestNotifications()} />
              ) : m.notificationPermission === 'granted' ? (
                <Switch
                  accessibilityLabel={t('alerts.notifications')}
                  value={m.settings.pushAlerts}
                  onValueChange={(v) => m.updateSettings({ pushAlerts: v })}
                  trackColor={{ true: ACCENT, false: S.elevated2 }}
                />
              ) : undefined
            }
          />
          <SetupRow
            icon={m.settings.voiceAlerts ? 'volume' : 'mute'}
            title={t('alerts.voice')}
            status={m.settings.voiceAlerts ? t('alerts.voice_on') : t('alerts.voice_off')}
            ok={m.settings.voiceAlerts}
            action={
              <Switch
                accessibilityLabel={t('alerts.voice')}
                value={m.settings.voiceAlerts}
                onValueChange={(v) => {
                  setVoiceMuted(!v);
                  m.updateSettings({ voiceAlerts: v });
                }}
                trackColor={{ true: ACCENT, false: S.elevated2 }}
              />
            }
          />

          {/* Warning Voice Selector with Live Playback Status */}
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: S.primary,
              borderWidth: 1,
              borderColor: S.borderSubtle,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <AppText style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: S.textSecondary }}>
                {t('alerts.voice_persona_label')}
              </AppText>
              {speaking ? (
                <AppText style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: ACCENT }}>
                  {language === 'es' ? 'Reproduciendo vista previa…' : 'Playing preview…'}
                </AppText>
              ) : previewPlayed ? (
                <AppText style={{ fontSize: 12, color: S.textMuted }}>
                  {language === 'es' ? 'Vista previa lista' : 'Preview ready'}
                </AppText>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {VOICE_PERSONAS.map((vp) => {
                const shortLabel =
                  vp.id === 'ava'
                    ? language === 'es'
                      ? 'Ava (Cálida)'
                      : 'Ava (Warm)'
                    : vp.id === 'andrew'
                      ? language === 'es'
                        ? 'Andrew (Serena)'
                        : 'Andrew (Calm)'
                      : language === 'es'
                        ? 'Aria (Clara)'
                        : 'Aria (Clear)';
                return (
                  <Chip
                    key={vp.id}
                    icon="volume"
                    label={shortLabel}
                    active={persona === vp.id}
                    onPress={() => triggerPreview(vp.id)}
                  />
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
            <ActionButton icon="bell" label={t('alerts.send_test')} onPress={() => void m.sendTestAlert()} />
            {speaking ? (
              <ActionButton
                kind="secondary"
                icon="mute"
                label={language === 'es' ? 'Detener vista previa' : 'Stop preview'}
                onPress={() => stopSpeaking()}
              />
            ) : (
              <ActionButton
                kind="secondary"
                icon="volume"
                label={t('alerts.test_voice')}
                onPress={() => triggerPreview()}
              />
            )}
          </View>
          {Platform.OS === 'ios' ? (
            <AppText style={{ fontSize: 12.5, lineHeight: 18, color: S.textMuted }}>{t('alerts.voice_hint')}</AppText>
          ) : null}
        </Panel>

        <SectionLabel>{t('alerts.radius')}</SectionLabel>
        <Panel>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {RADII.map((r) => (
              <Chip
                key={r}
                label={t('alerts.radius_value', { mi: r })}
                active={m.settings.alertRadiusMi === r}
                onPress={() => m.updateSettings({ alertRadiusMi: r })}
              />
            ))}
          </View>
          <AppText style={{ fontSize: 13.5, color: S.textSecondary }}>{t('alerts.radius_count', { count: inRange })}</AppText>
        </Panel>

        <SectionLabel>{t('companion.title')}</SectionLabel>
        <CompanionCard />

        <SectionLabel>{t('alerts.saved_title')}</SectionLabel>
        <AppText style={{ fontSize: 13, color: S.textMuted }}>{t('alerts.saved_hint')}</AppText>
        {savedStatuses.length ? (
          <View style={{ gap: 8 }}>
            {savedStatuses.map((s) => (
              <NearbyRow key={s.id} status={s} />
            ))}
          </View>
        ) : (
          <Panel>
            <AppText style={{ color: S.textSecondary }}>{t('alerts.empty_body')}</AppText>
          </Panel>
        )}

        {/* Collapsible Disclosures for Alert Log & Safety Rules */}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <ActionButton
            compact
            kind="secondary"
            icon="bell"
            label={`${t('alerts.history')} (${m.alertLog.length})`}
            onPress={() => setShowHistory((v) => !v)}
          />
          <ActionButton
            compact
            kind="secondary"
            icon="shield"
            label={t('safety.title')}
            onPress={() => setShowSafety((v) => !v)}
          />
        </View>

        {showHistory ? (
          <Panel>
            {m.alertLog.length === 0 ? (
              <AppText style={{ color: S.textSecondary }}>{t('alerts.history_empty')}</AppText>
            ) : (
              m.alertLog.slice(0, 15).map((a) => (
                <Pressable
                  key={a.id}
                  accessibilityRole="button"
                  disabled={!a.crossingId}
                  onPress={() => a.crossingId && router.push({ pathname: '/crossing/[id]', params: { id: a.crossingId } })}
                  style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: S.borderSubtle }}
                >
                  <StateGlyphSvg state={a.test ? 'watch' : a.state} size={26} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: a.test ? ACCENT : LOCKED_STATE_HEX[a.state] }}>
                      {a.title}
                    </AppText>
                    <AppText style={{ fontSize: 13, lineHeight: 18, color: S.textSecondary }}>{a.body}</AppText>
                    <AppText style={{ fontSize: 11.5, color: S.textMuted }}>
                      {a.drill ? formatStormClock(a.at, language) : agoText(t, a.at)}
                    </AppText>
                  </View>
                </Pressable>
              ))
            )}
          </Panel>
        ) : null}

        {showSafety ? (
          <Panel>
            {(['safety.f1', 'safety.f2', 'safety.f3', 'safety.f4', 'safety.f5'] as const).map((k) => (
              <AppText key={k} style={{ fontSize: 14, lineHeight: 20 }}>
                • {t(k)}
              </AppText>
            ))}
            <AppText style={{ fontSize: 12, color: S.textMuted }}>{t('safety.source')}</AppText>
          </Panel>
        ) : null}

        <AppText style={{ fontSize: 12.5, lineHeight: 18, color: S.textMuted }}>{t('alerts.foreground_note')}</AppText>
        <AppText style={{ fontSize: 12.5, lineHeight: 18, color: S.textMuted }}>{t('disclaimer')}</AppText>
      </ScrollView>
    </SafeAreaView>
  );
}
