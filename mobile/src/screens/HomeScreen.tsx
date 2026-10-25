/**
 * Home: Interactive Austin & Central Texas low-water crossing map (2,052 crossings + 19 stream sensors + creek corridors)
 * with separated, uncluttered modes and 100% vector SVG iconography:
 *   1. Crossings (Explore nearby, hazards, watched, flood history, or all 2,052)
 *   2. Route (Everyday Commute Flood Exposure Audit, 1-tap Austin destinations, saved Home/Work, live reroute test)
 *   3. Creeks (19 live stream sensors + emergency 311/ATXfloods/NWS tools)
 */
import { type ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Dip } from '@/components/fordcast/UI';
import StateBadge from '@/components/StateBadge';
import DemoDirectorBar from '@/components/fc/DemoDirectorBar';
import { FcIcon, type FcIconName } from '@/components/fc/Icons';
import {
  ACCENT,
  ActionButton,
  agoText,
  BigStatus,
  Chip,
  cleanName,
  NearbyRow,
  Panel,
  Segmented,
  shareText,
  statusLabel,
} from '@/components/fc/Kit';
import LiveMap, {
  type MapCreek,
  type MapGauge,
  type MapMarker,
  type MapPolygon,
  type MapRoute,
} from '@/features/map/LiveMap';
import { useTripDemo } from '@/features/demo/useTripDemo';
import { RoutePlanner, SensorsAndToolsPanel, TripCard } from '@/screens/home/RoutePanels';
import { creeks, crossings, gauges, links, replayIndex, replays, visibleSamples } from '@/lib/data';
import { groupPhysicalCrossings } from '@/lib/danger';
import { formatStormClock } from '@/lib/drill';
import { formatMiles, miToKm } from '@/lib/geo';
import { rise30, type GaugeReading } from '@/lib/live';
import { useMonitor, type CrossingStatus, type HomeTab } from '@/lib/monitor-context';
import { usePreferences } from '@/lib/preferences';
import { LOCKED_STATE_HEX, SURFACES } from '@/theme/tokens';

const S = SURFACES.dark;
const DRILL_COLOR = '#9B8AFB';
type Filter = 'near' | 'attention' | 'sensor' | 'history' | 'saved' | 'all';
const roadOf = new Map(crossings.map((f) => [f.properties.id, f.properties.road ?? '']));

const STATIC_CREEKS: MapCreek[] = creeks.map((c, idx) => ({
  id: `${c.properties.reach_id ?? idx}`,
  coords: c.geometry.coordinates.map(([lon, lat]) => ({ lat: lat!, lon: lon! })),
}));

function TopControls({
  compact,
  directorOpen,
  onToggleDirector,
}: {
  compact: boolean;
  directorOpen?: boolean;
  onToggleDirector?: () => void;
}) {
  const { t, language, setLanguage } = usePreferences();
  const m = useMonitor();
  const replay = replays[m.drill.stormId];
  const stormName = replay ? (language === 'es' ? replay.storm.name_es : replay.storm.name_en) : '';
  const sensorCount = m.liveSeries ? Object.keys(m.liveSeries).length : 0;
  const refNow = Math.max(m.nowMs ?? 0, m.liveFetchedAt ?? 0, m.latestObsAt ?? 0);
  const statusText =
    m.mode === 'drill'
      ? t('home.drill_status', { storm: stormName, time: formatStormClock(m.drill.simT, language) })
      : m.liveError && !m.liveSeries
        ? t('home.live_error')
        : !m.liveSeries
          ? t('home.live_loading')
          : t('home.live_status', { count: sensorCount, ago: agoText(t, m.liveFetchedAt, refNow) });
  const dotColor = m.mode === 'drill' ? DRILL_COLOR : m.liveError ? LOCKED_STATE_HEX.unknown : ACCENT;

  const voiceToggle = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.settings.voiceAlerts ? t('home.voice_mute') : t('home.voice_unmute')}
      onPress={() => m.updateSettings({ voiceAlerts: !m.settings.voiceAlerts })}
      style={[
        pill,
        {
          borderColor: m.settings.voiceAlerts ? ACCENT : S.borderSubtle,
          backgroundColor: m.settings.voiceAlerts ? 'rgba(96, 165, 250, 0.14)' : S.elevated1,
        },
      ]}
    >
      <FcIcon
        name={m.settings.voiceAlerts ? 'volume' : 'mute'}
        size={15}
        color={m.settings.voiceAlerts ? ACCENT : S.textSecondary}
      />
    </Pressable>
  );

  const directorToggle =
    typeof __DEV__ !== 'undefined' && __DEV__ && onToggleDirector ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('director.title')}
        onPress={onToggleDirector}
        style={[
          pill,
          {
            borderColor: directorOpen ? DRILL_COLOR : S.borderSubtle,
            backgroundColor: directorOpen ? 'rgba(155, 138, 251, 0.16)' : S.elevated1,
          },
        ]}
      >
        <FcIcon name="flask" size={14} color={directorOpen ? DRILL_COLOR : S.textSecondary} />
      </Pressable>
    ) : null;

  return (
    <View style={{ gap: 8 }}>
      {compact ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Dip size={24} />
          <View style={{ flex: 1 }}>
            <AppText numberOfLines={1} style={{ fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 21, letterSpacing: -0.4 }}>FordCast</AppText>
          </View>
          {voiceToggle}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={language === 'en' ? 'Español' : 'English'}
            onPress={() => setLanguage(language === 'en' ? 'es' : 'en')}
            style={pill}
          >
            <AppText style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
              {language === 'en' ? 'ES' : 'EN'}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('nav.settings')}
            onPress={() => router.push('/settings')}
            style={pill}
          >
            <FcIcon name="settings" size={15} color={S.textSecondary} />
          </Pressable>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Segmented
            value={m.mode}
            onChange={(v) => (v === 'drill' ? m.setMode('drill') : m.setMode('live'))}
            options={[
              { value: 'live', label: t('home.mode_live') },
              { value: 'drill', label: t('home.mode_drill') },
            ]}
          />
        </View>
        {!compact ? directorToggle : null}
        {!compact ? voiceToggle : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={statusText}
        onPress={m.mode === 'live' ? m.refreshLive : undefined}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
        <AppText
          numberOfLines={1}
          style={{ flex: 1, fontSize: 12, lineHeight: 16, color: S.textSecondary, fontFamily: 'Inter_600SemiBold' }}
        >
          {statusText}
        </AppText>
      </Pressable>

      {m.locationSource !== 'gps' && !compact ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: 'rgba(96, 165, 250, 0.12)',
            borderColor: 'rgba(96, 165, 250, 0.40)',
            borderWidth: 1,
            borderRadius: 12,
            padding: 10,
          }}
        >
          <FcIcon name="pin" size={16} color={ACCENT} />
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 12.5, lineHeight: 16, fontFamily: 'Inter_600SemiBold' }}>
              {m.locationSource === 'custom'
                ? t('home.location_custom', { name: m.customOrigin?.name ?? '' })
                : m.locationSource === 'outside'
                ? t('home.location_outside')
                : m.locationSource === 'demo'
                  ? t('home.location_demo')
                  : t('home.location_off')}
            </AppText>
          </View>
          {m.locationSource === 'off' || m.locationSource === 'demo' ? (
            <ActionButton compact label={t('home.turn_on')} onPress={() => void m.requestLocation()} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const pill = {
  minWidth: 44,
  height: 44,
  paddingHorizontal: 8,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: S.borderSubtle,
  backgroundColor: S.elevated1,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

function ModeSubTabs({
  activeTab,
  onChange,
  routeActive,
}: {
  activeTab: HomeTab;
  onChange: (t: HomeTab) => void;
  routeActive: boolean;
}) {
  const { t } = usePreferences();
  const items: { key: HomeTab; icon: FcIconName; label: string; badge?: boolean }[] = [
    { key: 'explore', icon: 'map', label: t('home.tab_explore') },
    { key: 'route', icon: 'route', label: t('home.tab_route'), badge: routeActive },
    { key: 'sensors', icon: 'creeks', label: t('home.tab_sensors') },
  ];
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        gap: 6,
        backgroundColor: S.elevated1,
        padding: 4,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: S.borderSubtle,
      }}
    >
      {items.map((it) => {
        const active = activeTab === it.key;
        return (
          <Pressable
            key={it.key}
            accessibilityRole="tab"
            accessibilityLabel={it.label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(it.key)}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingHorizontal: 6,
              backgroundColor: active ? S.elevated2 : 'transparent',
              borderWidth: active ? 1 : 0,
              borderColor: active ? ACCENT : 'transparent',
            }}
          >
            <AppText
              numberOfLines={1}
              style={{
                fontSize: 12.5,
                fontFamily: 'Inter_600SemiBold',
                color: active ? S.textPrimary : S.textSecondary,
              }}
            >
              {it.label}
            </AppText>
            {it.badge ? (
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ACCENT }} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function DrillControls({ onStopTrip }: { onStopTrip: () => void }) {
  const { t, language } = usePreferences();
  const m = useMonitor();
  const [barW, setBarW] = useState(1);
  const d = m.drill;
  const progress = (d.simT - d.startMs) / Math.max(1, d.endMs - d.startMs);
  const monitored = m.statuses.filter((s) => s.monitored);
  const watch = monitored.filter((s) => s.state === 'watch').length;
  const avoid = monitored.filter((s) => s.state === 'avoid' || s.state === 'closed').length;
  const done = d.simT >= d.endMs;

  return (
    <Panel style={{ borderColor: 'rgba(155, 138, 251, 0.45)' }}>
      <AppText style={{ fontSize: 13, lineHeight: 18, color: S.textSecondary }}>{t('home.drill_intro')}</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {replayIndex.storms.map((s) => {
          const doc = replays[s.id];
          if (!doc) return null;
          return (
            <Chip
              key={s.id}
              color={DRILL_COLOR}
              active={d.stormId === s.id}
              label={language === 'es' ? doc.storm.name_es : doc.storm.name_en}
              onPress={() => {
                onStopTrip();
                m.startDrill(s.id);
              }}
            />
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <ActionButton
          style={{ flex: 1 }}
          icon={d.playing ? 'pause' : 'play'}
          label={d.playing ? t('home.drill_pause') : t('home.drill_play')}
          onPress={() =>
            d.playing ? m.setDrillPlaying(false) : d.simT === d.startMs ? m.startDrill() : m.setDrillPlaying(true)
          }
        />
        <ActionButton compact kind="secondary" icon="replay" label={t('home.drill_restart')} onPress={() => m.startDrill()} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${d.speed}x`}
          onPress={() => m.setDrillSpeed(d.speed === 1 ? 2 : d.speed === 2 ? 4 : 1)}
          style={[pill, { minWidth: 48, height: 40 }]}
        >
          <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 14 }}>{d.speed}x</AppText>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel={formatStormClock(d.simT, language)}
        onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
        onPress={(e) => m.seekDrill(d.startMs + (e.nativeEvent.locationX / barW) * (d.endMs - d.startMs))}
        style={{ height: 22, justifyContent: 'center' }}
      >
        <View style={{ height: 8, borderRadius: 4, backgroundColor: S.primary, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(progress * 100)}%`, height: 8, backgroundColor: DRILL_COLOR }} />
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <AppText style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>{formatStormClock(d.simT, language)}</AppText>
        <AppText
          style={{
            fontSize: 13,
            color: avoid ? LOCKED_STATE_HEX.avoid : watch ? LOCKED_STATE_HEX.watch : S.textSecondary,
            fontFamily: 'Inter_600SemiBold',
          }}
        >
          {t('home.drill_counts', { watch, avoid })}
        </AppText>
      </View>
      {done ? <AppText style={{ fontSize: 13, color: S.textSecondary }}>{t('home.drill_done')}</AppText> : null}
    </Panel>
  );
}

const CALIBRATED_IDS = new Set(links.filter((l) => l.is_primary).map((l) => l.crossing_id));

function Headline({
  onOpenRoute,
  onStartQuickDemo,
}: {
  onOpenRoute: () => void;
  onStartQuickDemo: () => void;
}) {
  const { t, language } = usePreferences();
  const m = useMonitor();
  const radiusKm = miToKm(m.settings.alertRadiusMi);
  const nearMonitored = m.statuses.filter((s) => s.monitored && s.distanceKm <= radiusKm);
  const attention = m.statuses.filter(
    (s) => m.inAlertScope(s) && (s.danger === 'block' || s.reasons.some((r) => r !== 'heavy_rain')),
  );
  const ffw = m.weatherAlerts.find(
    (a) =>
      a.flashFlood &&
      a.polygons.some((r) =>
        r.some(([lat, lon]) => Math.abs(lat - m.location.lat) < 0.6 && Math.abs(lon - m.location.lon) < 0.6),
      ),
  );

  let title: string;
  let body: string;
  let color: string = S.borderSubtle;
  if (m.mode === 'live' && !m.liveSeries && !m.feeds.atx.ok && !m.feeds.nws.ok) {
    title = m.liveError ? t('home.headline_nodata') : t('home.live_loading');
    body = m.liveError ? t('home.headline_nodata_body') : '';
    color = LOCKED_STATE_HEX.unknown;
  } else if (attention.length) {
    title =
      attention.length === 1
        ? t('home.headline_alert_one')
        : t('home.headline_alert_many', { count: attention.length });
    body = ffw && m.mode === 'live' ? `${ffw.headline}. ${t('home.headline_alert_body')}` : t('home.headline_alert_body');
    color = attention.some((s) => s.danger === 'block') ? LOCKED_STATE_HEX.avoid : LOCKED_STATE_HEX.watch;
  } else if (m.mode === 'live' && nearMonitored.length === 0) {
    const nearest = m.statuses.find((s) => s.monitored);
    const originName = m.customOrigin
      ? m.customOrigin.name
      : m.locationSource === 'gps'
        ? language === 'es'
          ? 'tu ubicación GPS'
          : 'your GPS location'
        : language === 'es'
          ? 'el centro de Austin (GPS apagado)'
          : 'downtown Austin (GPS off)';
    title =
      language === 'es'
        ? `Sin cruces calibrados por sensor a menos de ${m.settings.alertRadiusMi} mi de ${originName}`
        : `No sensor-calibrated crossings within ${m.settings.alertRadiusMi} mi of ${originName}`;
    body = nearest
      ? t('home.headline_none_body', { name: cleanName(nearest.name), dist: formatMiles(nearest.distanceKm) })
      : '';
  } else {
    title = t('home.headline_quiet');
    body = t('home.headline_quiet_body', {
      count: m.mode === 'drill' ? m.statuses.filter((s) => s.monitored).length : nearMonitored.length,
      radius: m.settings.alertRadiusMi,
    });
    color = LOCKED_STATE_HEX.no_rise;
  }
  return (
    <Panel style={{ borderColor: color, gap: 12 }}>
      <View style={{ gap: 4 }}>
        <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 17, lineHeight: 23 }}>{title}</AppText>
        {body ? <AppText style={{ fontSize: 13.5, lineHeight: 19, color: S.textSecondary }}>{body}</AppText> : null}
      </View>

      {/* Primary above-the-fold actions with clean spacing */}
      {m.mode === 'live' && !m.routePlan ? (
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <ActionButton compact icon="route" label={t('home.audit_commute')} onPress={onOpenRoute} />
          <ActionButton compact kind="secondary" icon="car" label={t('storms.car_demo')} onPress={onStartQuickDemo} />
          {m.locationSource !== 'gps' ? (
            <ActionButton
              compact
              kind="secondary"
              icon="pin"
              label={t('home.turn_on')}
              onPress={() => void m.requestLocation()}
            />
          ) : null}
        </View>
      ) : null}

      {/* Honest Scope & Source Coverage Bar */}
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 12,
          backgroundColor: S.primary,
          borderWidth: 1,
          borderColor: S.borderSubtle,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ alignItems: 'center', flex: 1, gap: 2 }}>
          <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 14.5, color: '#9B8AFB', fontVariant: ['tabular-nums'] }}>
            {CALIBRATED_IDS.size} / 30
          </AppText>
          <AppText style={{ fontSize: 11, color: S.textMuted }}>
            {t('home.stat_calibrated')}
          </AppText>
        </View>
        <View style={{ width: 1, backgroundColor: S.borderSubtle }} />
        <View style={{ alignItems: 'center', flex: 1, gap: 2 }}>
          <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 14.5, color: '#38BDF8', fontVariant: ['tabular-nums'] }}>
            19
          </AppText>
          <AppText style={{ fontSize: 11, color: S.textMuted }}>{t('home.stat_sensors')}</AppText>
        </View>
        <View style={{ width: 1, backgroundColor: S.borderSubtle }} />
        <View style={{ alignItems: 'center', flex: 1, gap: 2 }}>
          <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 14.5, color: ACCENT, fontVariant: ['tabular-nums'] }}>
            {m.statuses.length.toLocaleString()}
          </AppText>
          <AppText style={{ fontSize: 11, color: S.textMuted }}>{t('home.stat_crossings')}</AppText>
        </View>
      </View>
    </Panel>
  );
}

function SelectedCard({
  status,
  onClose,
  onRouteHere,
}: {
  status: CrossingStatus;
  onClose: () => void;
  onRouteHere: (s: CrossingStatus) => void;
}) {
  const { t, saved, toggleSaved } = usePreferences();
  const isSaved = saved.includes(status.id);
  const label = statusLabel(t, status);
  return (
    <Panel style={{ borderColor: ACCENT }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 23 }}>
            {cleanName(status.name)}
          </AppText>
          <AppText style={{ fontSize: 13, color: S.textSecondary }}>
            {status.creek ? `${cleanName(status.creek)} · ` : ''}
            {t('home.away', { dist: formatMiles(status.distanceKm) })}
          </AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={10} onPress={onClose}>
          <FcIcon name="close" size={18} color={S.textSecondary} />
        </Pressable>
      </View>
      <BigStatus status={status} />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <ActionButton
          compact
          style={{ flex: 1 }}
          label={t('home.details')}
          onPress={() => router.push({ pathname: '/crossing/[id]', params: { id: status.id } })}
        />
        <ActionButton
          compact
          kind="secondary"
          icon="route"
          label={t('home.plan_here')}
          onPress={() => onRouteHere(status)}
        />
        <ActionButton
          compact
          kind="secondary"
          icon="share"
          label={t('home.share')}
          onPress={() =>
            void shareText(
              `FordCast: ${cleanName(status.name)}`,
              `FordCast status for ${cleanName(status.name)} (${status.creek || 'Austin'}): ${label}. Never drive into water.`,
            )
          }
        />
        <ActionButton
          compact
          kind="secondary"
          icon={isSaved ? 'star' : 'star-outline'}
          label={isSaved ? t('detail.saved') : t('detail.save')}
          onPress={() => toggleSaved(status.id)}
        />
      </View>
    </Panel>
  );
}

function CrossingList({ onPick, selectedId, onSearchFocus }: { onPick: (id: string) => void; selectedId: string | null; onSearchFocus?: () => void }) {
  const { t, saved } = usePreferences();
  const m = useMonitor();
  const [filter, setFilter] = useState<Filter>('near');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(25);
  const radiusKm = miToKm(m.settings.alertRadiusMi);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = m.statuses;
    if (q) {
      list = list.filter((s) => `${s.name} ${s.creek} ${roadOf.get(s.id) ?? ''}`.toLowerCase().includes(q));
    } else if (filter === 'near') {
      const within = list.filter((s) => s.distanceKm <= radiusKm);
      list = within.length ? within : list.slice(0, 20);
    } else if (filter === 'attention') list = list.filter((s) => !!s.danger);
    else if (filter === 'sensor') list = list.filter((s) => s.monitored);
    else if (filter === 'history') list = list.filter((s) => s.history && s.history.reports > 0);
    else if (filter === 'saved') list = list.filter((s) => saved.includes(s.id));
    // Most urgent first, then monitored, then nearest.
    const rank = (s: CrossingStatus) =>
      s.danger === 'block'
        ? 0
        : s.danger === 'caution'
          ? 1
          : s.monitored
            ? { closed: 0, avoid: 0, watch: 1, unknown: 2, no_rise: 3 }[s.state]
            : 4;
    const sorted = [...list].sort((a, b) => rank(a) - rank(b) || a.distanceKm - b.distanceKm);
    return groupPhysicalCrossings(sorted).map((g) => g.primary);
  }, [m.statuses, filter, query, radiusKm, saved]);

  return (
    <View style={{ gap: 10 }}>
      <TextInput
        onFocus={onSearchFocus}
        value={query}
        onChangeText={setQuery}
        placeholder={t('home.search')}
        placeholderTextColor={S.textMuted}
        accessibilityLabel={t('home.search')}
        style={{
          minHeight: 44,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: S.borderSubtle,
          backgroundColor: S.primary,
          color: S.textPrimary,
          paddingHorizontal: 14,
          fontSize: 15,
        }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {(
          [
            ['near', t('home.filter_near')],
            ['attention', t('home.filter_attention')],
            ['sensor', `${t('home.filter_sensor')} (${CALIBRATED_IDS.size} / 30)`],
            ['history', t('home.filter_history')],
            ['saved', t('home.filter_saved')],
            ['all', t('home.filter_all_count', { count: m.statuses.length })],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            active={!query && filter === key}
            onPress={() => {
              setQuery('');
              setFilter(key);
              setLimit(25);
            }}
          />
        ))}
      </ScrollView>
      {rows.length === 0 ? (
        <AppText style={{ color: S.textSecondary, paddingVertical: 8 }}>{t('home.empty')}</AppText>
      ) : null}
      <View style={{ gap: 10 }}>
        {rows.slice(0, limit).map((s) => (
          <NearbyRow key={s.id} status={s} selected={s.id === selectedId} onPress={() => onPick(s.id)} />
        ))}
      </View>
      {rows.length > limit ? (
        <ActionButton
          kind="secondary"
          label={`${t('home.show_more')} (${rows.length - limit})`}
          onPress={() => setLimit((l) => l + 50)}
        />
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const { t } = usePreferences();
  const m = useMonitor();
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedGaugeId, setSelectedGaugeId] = useState<string | null>(null);
  const [showOfficialLayer, setShowOfficialLayer] = useState(true);
  const [showGaugesLayer, setShowGaugesLayer] = useState(true);
  const [showCreeksLayer, setShowCreeksLayer] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);
  const [focus, setFocus] = useState<{ key: string; at: { lat: number; lon: number } | null }>({
    key: 'init',
    at: null,
  });
  const [zoomStep, setZoomStep] = useState<{ seq: number; delta: number }>({ seq: 0, delta: 0 });
  const [sheet, setSheet] = useState<'peek' | 'half' | 'full'>('peek');
  const [directorOpen, setDirectorOpen] = useState(false);
  const [mapFrameHeight, setMapFrameHeight] = useState(height);
  const [headerBottom, setHeaderBottom] = useState(152);
  const panelScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const routeComputedAt = m.routePlan?.computedAt;
  useEffect(() => {
    if (routeComputedAt != null) panelScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [routeComputedAt]);
  const trip = useTripDemo();
  const stopTripRef = useRef(trip.stop);
  useEffect(() => { stopTripRef.current = trip.stop; }, [trip.stop]);
  useFocusEffect(useCallback(() => () => stopTripRef.current(), []));

  // Smooth spring animation for mobile bottom sheet height.
  // 330px peek height keeps subtabs + Headline + primary action buttons + TripCard Stop controls visible with clean breathing room.
  const peekH = Math.min(330, Math.round(mapFrameHeight * 0.52));
  const halfH = Math.round(mapFrameHeight * 0.58);
  const fullH = Math.round(mapFrameHeight * 0.88);
  const targetH = sheet === 'peek' ? peekH : sheet === 'half' ? halfH : fullH;
  const [animH] = useState(() => new Animated.Value(peekH));
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    Animated.spring(animH, {
      toValue: targetH,
      tension: 68,
      friction: 12,
      useNativeDriver: false,
    }).start();
  }, [targetH, animH]);

  // Handle cross-screen focus requests (e.g. "Show on map" from CrossingDetail).
  const { mapFocusId, focusOnMap, statusById, pendingTripStormId, clearPendingTrip } = m;
  useEffect(() => {
    if (!mapFocusId) return;
    const id = setTimeout(() => {
      focusOnMap(null);
      const s = statusById[mapFocusId];
      if (s) {
        setSelectedId(mapFocusId);
        setFocus({ key: `ext-${mapFocusId}-${Date.now()}`, at: { lat: s.lat, lon: s.lon } });
        if (!wide) setSheet('half');
      }
    }, 0);
    return () => clearTimeout(id);
  }, [mapFocusId, statusById, focusOnMap, wide]);

  // Handle cross-screen car demo requests (e.g. "Watch car reroute demo" from StormsScreen).
  const startTrip = trip.start;
  const setHomeTab = m.setHomeTab;
  useEffect(() => {
    if (!pendingTripStormId) return;
    const id = setTimeout(() => {
      clearPendingTrip();
      setHomeTab('explore');
      startTrip(pendingTripStormId);
      if (!wide) setSheet('peek');
    }, 0);
    return () => clearTimeout(id);
  }, [pendingTripStormId, clearPendingTrip, setHomeTab, startTrip, wide]);

  // Leaving drill mode ends any car demo.
  const stopTrip = trip.stop;
  useEffect(() => {
    if (m.mode !== 'live' || !trip.active) return;
    const id = setTimeout(stopTrip, 0);
    return () => clearTimeout(id);
  }, [m.mode, trip.active, stopTrip]);

  const markers = useMemo<MapMarker[]>(() => {
    const base = showOfficialLayer
      ? m.statuses
      : m.statuses.filter((s) => s.coverage !== 'official' || s.danger != null || s.id === selectedId);
    return [
      ...base.map((s) => ({
        id: s.id,
        lat: s.lat,
        lon: s.lon,
        state: s.displayState,
        monitored: s.monitored,
        label: `${cleanName(s.name)}: ${statusLabel(t, s)}`,
      })),
      ...(m.testHazard && m.mode === 'live'
        ? [
            {
              id: m.testHazard.id,
              lat: m.testHazard.lat,
              lon: m.testHazard.lon,
              state: 'closed' as const,
              monitored: true,
              label: m.testHazard.reason,
            },
          ]
        : []),
    ];
  }, [m.statuses, m.testHazard, m.mode, showOfficialLayer, selectedId, t]);

  const mapGauges = useMemo<MapGauge[]>(() => {
    if (!showGaugesLayer) return [];
    const drill = m.mode === 'drill';
    const replay = replays[m.drill.stormId] ?? replays['memorial-day-2015']!;
    return gauges.map((g) => {
      const p = g.properties;
      const [lon, lat] = g.geometry.coordinates as [number, number];
      let rows: GaugeReading[] = [];
      if (!drill) {
        rows = m.liveSeries?.[p.id] ?? [];
      } else {
        const rg = replay.gauges.find((x) => x.id === p.id);
        rows = rg
          ? visibleSamples(rg, m.drill.simT)
              .filter((s) => s.stageFt != null && s.t >= m.drill.simT - 3 * 3600_000)
              .map((s) => ({ t: s.t, v: s.stageFt as number }))
          : [];
      }
      const last = rows[rows.length - 1] ?? null;
      return {
        id: p.id,
        name: cleanName(p.name),
        creek: cleanName(p.creek),
        lat,
        lon,
        stageFt: last?.v ?? null,
        changeFt: rise30(rows),
      };
    });
  }, [showGaugesLayer, m.mode, m.drill.stormId, m.drill.simT, m.liveSeries]);

  const selected = selectedId ? m.statusById[selectedId] : undefined;

  const polygons = useMemo<MapPolygon[]>(
    () =>
      m.mode === 'live'
        ? m.weatherAlerts
            .filter((a) => a.polygons.length)
            .map((a) => ({
              id: a.id,
              rings: a.polygons,
              color: a.flashFlood ? LOCKED_STATE_HEX.avoid : a.event.includes('Watch') ? '#38BDF8' : LOCKED_STATE_HEX.watch,
            }))
        : [],
    [m.mode, m.weatherAlerts],
  );
  const plan = m.mode === 'live' ? m.routePlan : null;
  const routes = useMemo<MapRoute[]>(() => {
    if (trip.active) return trip.routes;
    if (!plan) return [];
    const out: MapRoute[] = [];
    if (plan.avoided.length)
      out.push({ id: 'baseline', coords: plan.baseline.coords, color: LOCKED_STATE_HEX.avoid, dashed: true, width: 4 });
    out.push({
      id: 'route',
      coords: plan.route.coords,
      color: plan.remaining.some((h) => h.level === 'block') ? LOCKED_STATE_HEX.watch : ACCENT,
    });
    return out;
  }, [trip.active, trip.routes, plan]);

  const pick = (id: string | null) => {
    setSelectedId(id);
    if (id) {
      const s = m.statusById[id];
      if (s) setFocus({ key: `c-${id}-${Date.now()}`, at: { lat: s.lat, lon: s.lon } });
      m.setHomeTab('explore');
      if (!wide && sheet === 'peek') setSheet('half');
    }
  };

  const handleSelectGaugeOnMap = (gaugeId: string | null) => {
    setSelectedGaugeId(gaugeId);
    if (gaugeId) {
      const g = gauges.find((x) => x.properties.id === gaugeId);
      if (g) {
        const [lon, lat] = g.geometry.coordinates as [number, number];
        setFocus({ key: `g-${gaugeId}-${Date.now()}`, at: { lat, lon } });
        m.setHomeTab('sensors');
        if (!wide && sheet === 'peek') setSheet('half');
      }
    }
  };

  const handleRouteToCrossing = (s: CrossingStatus) => {
    m.setMode('live');
    m.setHomeTab('route');
    void m.planRoute({ name: cleanName(s.name), detail: cleanName(s.creek), lat: s.lat, lon: s.lon });
    if (!wide && sheet === 'peek') setSheet('half');
  };

  const panelBody = (
    <>
      {wide ? (
        <TopControls
          compact={false}
          directorOpen={directorOpen}
          onToggleDirector={() => setDirectorOpen((v) => !v)}
        />
      ) : null}
      {wide && directorOpen ? <DemoDirectorBar trip={trip} onClose={() => setDirectorOpen(false)} /> : null}
      {wide && m.mode === 'drill' && trip.active ? <TripCard trip={trip} /> : null}
      <ModeSubTabs activeTab={m.homeTab} onChange={m.setHomeTab} routeActive={!!m.routePlan} />

      {m.mode === 'drill' && !trip.active ? (
        <>
          <TripCard trip={trip} />
          <DrillControls onStopTrip={trip.stop} />
        </>
      ) : null}

      {m.homeTab === 'route' ? (
        <RoutePlanner onSearchFocus={() => { if (!wide) setSheet('full'); }} />
      ) : m.homeTab === 'sensors' ? (
        <SensorsAndToolsPanel
          selectedGaugeId={selectedGaugeId}
          onSelectGauge={(id, coords) => {
            setSelectedGaugeId(id);
            setFocus({ key: `gs-${id}-${Date.now()}`, at: coords });
            if (!wide && sheet === 'full') setSheet('half');
          }}
        />
      ) : trip.active ? null : (
        <>
          {selected ? (
            <SelectedCard
              status={selected}
              onClose={() => setSelectedId(null)}
              onRouteHere={handleRouteToCrossing}
            />
          ) : (
            <Headline
              onOpenRoute={() => {
                m.setHomeTab('route');
                if (!wide && sheet === 'peek') setSheet('half');
              }}
              onStartQuickDemo={() => {
                m.requestTripDemo('memorial-day-2015');
              }}
            />
          )}
          <CrossingList onPick={pick} selectedId={selectedId} onSearchFocus={() => { if (!wide) setSheet('full'); }} />
        </>
      )}
    </>
  );

  const mapFit = trip.active
    ? trip.fitPoints
    : plan
      ? [plan.origin, plan.destination, ...plan.route.coords, ...plan.baseline.coords]
      : null;
  const mapFitKey = trip.active ? trip.fitKey : plan ? String(plan.computedAt) : undefined;

  const map = (
    <LiveMap
      markers={markers}
      selectedId={selectedId}
      onSelect={pick}
      gauges={mapGauges}
      selectedGaugeId={selectedGaugeId}
      onSelectGauge={handleSelectGaugeOnMap}
      creeks={showCreeksLayer ? STATIC_CREEKS : []}
      user={m.locationSource === 'gps' ? m.location : null}
      center={m.location}
      focusKey={`${focus.key}|${m.locationSource}`}
      focus={focus.at}
      zoomStep={zoomStep}
      fit={mapFit}
      fitKey={mapFitKey}
      routes={routes}
      polygons={polygons}
      car={trip.car}
      followCar={trip.active && trip.followCar}
      onUserCameraMove={() => {
        if (trip.active && trip.followCar) trip.setFollowCar(false);
      }}
      destination={trip.destination ?? plan?.destination ?? null}
    />
  );

  const layerBar = wide || layersOpen ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}
    >
      {!wide ? (
        <MapLayerChip
          icon="close"
          label={t('home.layers_button')}
          active
          onPress={() => setLayersOpen(false)}
        />
      ) : null}
      <MapLayerChip
        icon="pin"
        label={t('home.layer_official', { count: m.statuses.length })}
        active={showOfficialLayer}
        onPress={() => setShowOfficialLayer((v) => !v)}
      />
      <MapLayerChip
        icon="gauge"
        label={t('home.layer_gauges')}
        active={showGaugesLayer}
        onPress={() => setShowGaugesLayer((v) => !v)}
      />
      <MapLayerChip
        icon="creeks"
        label={t('home.layer_creeks')}
        active={showCreeksLayer}
        onPress={() => setShowCreeksLayer((v) => !v)}
      />
    </ScrollView>
  ) : (
    <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
      <MapLayerChip
        icon="layers"
        label={t('home.layers_button')}
        active={false}
        onPress={() => setLayersOpen(true)}
      />
    </View>
  );

  const mapControls = (
    <View style={{ flexDirection: wide ? 'column' : 'row', gap: 8, alignItems: 'center' }}>
      <View
        style={{
          flexDirection: wide ? 'column' : 'row',
          borderRadius: 8,
          backgroundColor: 'rgba(19, 28, 43, 0.94)',
          borderWidth: 1,
          borderColor: S.borderSubtle,
          overflow: 'hidden',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.zoom_in')}
          onPress={() => setZoomStep((z) => ({ seq: z.seq + 1, delta: 1.5 }))}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderBottomWidth: 1,
            borderColor: S.borderSubtle,
          }}
        >
          <FcIcon name="plus" size={18} color={S.textPrimary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.zoom_out')}
          onPress={() => setZoomStep((z) => ({ seq: z.seq + 1, delta: -1.5 }))}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FcIcon name="minus" size={18} color={S.textPrimary} />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.recenter')}
        onPress={() => {
          if (trip.active && trip.car) {
            trip.setFollowCar(true);
            setFocus({ key: `car-${Date.now()}`, at: { lat: trip.car.lat, lon: trip.car.lon } });
            return;
          }
          setFocus({ key: `me-${Date.now()}`, at: null });
          if (m.locationSource === 'off') void m.requestLocation();
        }}
        style={[
          pill,
          {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(19, 28, 43, 0.94)',
            borderColor: S.borderFocus,
          },
        ]}
      >
        <FcIcon name="target" size={18} color={ACCENT} />
      </Pressable>
    </View>
  );

  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: S.primary }}>
        <ScrollView
          ref={panelScrollRef}
          style={{ width: 430, maxWidth: 430, borderRightWidth: 1, borderColor: S.borderSubtle }}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        >
          {panelBody}
        </ScrollView>
        <View style={{ flex: 1 }}>
          {map}
          <View style={{ position: 'absolute', left: 16, top: 16, right: 76 }} pointerEvents="box-none">
            {layerBar}
          </View>
          <View style={{ position: 'absolute', right: 16, top: 16 }}>{mapControls}</View>
          <Legend />
        </View>
      </View>
    );
  }

  return (
    <View onLayout={e => setMapFrameHeight(e.nativeEvent.layout.height)} style={{ flex: 1, backgroundColor: S.primary }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>{map}</View>
      <SafeAreaView edges={['top']} pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <View
          onLayout={e => setHeaderBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
          style={{
            marginHorizontal: 10,
            marginTop: 8,
            padding: 11,
            borderRadius: 16,
            backgroundColor: 'rgba(19, 28, 43, 0.94)',
            borderWidth: 1,
            borderColor: S.borderSubtle,
          }}
        >
          <TopControls
            compact
            directorOpen={directorOpen}
            onToggleDirector={() => {
              // Recording controls sit at the top of the screen; a full-height sheet would cover them.
              if (!directorOpen) setSheet('peek');
              setDirectorOpen((v) => !v);
            }}
          />
        </View>
        {directorOpen ? (
          <View style={{ marginHorizontal: 10, marginTop: 6 }}>
            <DemoDirectorBar trip={trip} onClose={() => setDirectorOpen(false)} />
          </View>
        ) : null}
        <View style={{ marginTop: 6, paddingHorizontal: 8 }} pointerEvents="box-none">
          {layerBar}
        </View>
      </SafeAreaView>

      {sheet !== 'full' && !layersOpen && mapFrameHeight - targetH - headerBottom >= 60 ? (
        <Animated.View style={{ position: 'absolute', right: 14, top: headerBottom + 8 }}>
          {mapControls}
        </Animated.View>
      ) : null}

      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: animH,
          backgroundColor: S.primary,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderTopWidth: 1,
          borderColor: S.borderSubtle,
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 16,
        }}
      >
        <View
          onTouchStart={(e) => {
            dragStartY.current = e.nativeEvent.pageY;
          }}
          onMoveShouldSetResponder={(e) => {
            if (dragStartY.current == null) return false;
            return Math.abs(e.nativeEvent.pageY - dragStartY.current) > 8;
          }}
          onResponderRelease={(e) => {
            if (dragStartY.current == null) return;
            const dy = e.nativeEvent.pageY - dragStartY.current;
            dragStartY.current = null;
            if (dy < -25) setSheet((cur) => (cur === 'peek' ? 'half' : 'full'));
            else if (dy > 25) setSheet((cur) => (cur === 'full' ? 'half' : 'peek'));
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sheet === 'full' ? t('home.show_less') : t('home.show_more')}
            onPress={() => setSheet(sheet === 'peek' ? 'half' : sheet === 'half' ? 'full' : 'peek')}
            style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingTop: 9, paddingBottom: 6 }}
          >
            <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: S.borderFocus, opacity: 0.65 }} />
            <AppText style={{ fontSize: 11, color: S.textMuted, marginTop: 3 }}>
              {sheet === 'full' ? t('home.show_less') : t('home.show_more')}
            </AppText>
          </Pressable>
        </View>
        {m.mode === 'drill' && trip.active ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 8 }}>
            <TripCard trip={trip} />
          </View>
        ) : null}
        <ScrollView
          ref={panelScrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 32, gap: 12 }}
        >
          {panelBody}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function MapLayerChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: FcIconName;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 11,
        minHeight: 44,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? 'rgba(27, 39, 58, 0.94)' : 'rgba(19, 28, 43, 0.88)',
        borderWidth: 1,
        borderColor: active ? ACCENT : S.borderSubtle,
      }}
    >
      <FcIcon name={icon} size={13} color={active ? ACCENT : S.textSecondary} />
      <AppText
        style={{
          fontSize: 11.5,
          fontFamily: 'Inter_600SemiBold',
          color: active ? S.textPrimary : S.textSecondary,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function Legend() {
  const { t } = usePreferences();
  return (
    <View
      style={{
        position: 'absolute',
        left: 16,
        bottom: 24,
        padding: 12,
        gap: 6,
        borderRadius: 14,
        backgroundColor: 'rgba(19, 28, 43, 0.92)',
        borderWidth: 1,
        borderColor: S.borderSubtle,
      }}
    >
      {(['avoid', 'watch', 'no_rise', 'unknown'] as const).map((s) => (
        <StateBadge key={s} state={s} size={16} />
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: '#5B76A3',
            borderWidth: 1.2,
            borderColor: '#CBD5E1',
          }}
        />
        <AppText style={{ fontSize: 12, color: S.textSecondary }}>{t('home.legend_dot')}</AppText>
      </View>
    </View>
  );
}
