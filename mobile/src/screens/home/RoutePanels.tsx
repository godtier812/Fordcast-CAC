/**
 * Dedicated panels for the Home screen's separated modes (zero emojis, 100% vector SVG icons):
 * 1. RoutePlanner & RouteCard (Editable origin, grouped physical crossing audit, source-health strip, honest Google Maps handoff)
 * 2. TripCard (Moving-car real-time rerouting demo during storm drills with Free Zoom / Follow Car toggle)
 * 3. SensorsAndToolsPanel (Live 19-sensor creek level explorer with datum explanation, staleness gate, and vetted NWPS stages)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CACHED_NWPS_CATEGORIES_BY_GAUGE } from '@/components/CausalHydrograph';
import { AppText } from '@/components/fordcast/UI';
import { FcIcon } from '@/components/fc/Icons';
import { ACCENT, ActionButton, agoText, Chip, cleanName, Panel, SectionLabel, shareText, statusLabel } from '@/components/fc/Kit';
import type { useTripDemo } from '@/features/demo/useTripDemo';
import { tripFor } from '@/features/demo/useTripDemo';
import { gauges, replays, visibleSamples } from '@/lib/data';
import { countDistinctHistoryEvents, groupPhysicalCrossings, type PhysicalCrossingGroup } from '@/lib/danger';
import { formatMiles } from '@/lib/geo';
import { guardianRunning, guardianSupported } from '@/lib/guardian';
import { LIVE_STALE_MIN, rise30, type GaugeReading } from '@/lib/live';
import { useMonitor, type CrossingStatus } from '@/lib/monitor-context';
import { usePreferences } from '@/lib/preferences';
import { distanceToRouteM, googleMapsUrl, hazardsOnRoute, searchPlaces, type Place } from '@/lib/routing';
import { storage } from '@/lib/storage';
import { routeEvidence } from '@/lib/route-evidence';
import { LOCKED_STATE_HEX, SURFACES } from '@/theme/tokens';

const S = SURFACES.dark;
const SAVED_PLACES_KEY = 'fordcast.places.v1';

type SavedPlaces = {
  home?: Place | null;
  work?: Place | null;
};

export const QUICK_DESTINATIONS: Place[] = [
  { name: 'Onion Creek Park', detail: 'Southeast Austin · Onion Creek', lat: 30.1755, lon: -97.7429 },
  { name: 'Barton Creek Greenbelt', detail: 'Loop 360 Access', lat: 30.2449, lon: -97.8017 },
  { name: 'Zilker Park', detail: 'Barton Springs Rd', lat: 30.2669, lon: -97.7729 },
  { name: 'UT Austin', detail: 'Campus · Speedway', lat: 30.2849, lon: -97.7341 },
  { name: 'ABIA Airport', detail: '3600 Presidential Blvd', lat: 30.1975, lon: -97.6664 },
  { name: 'The Domain', detail: 'North Austin', lat: 30.4021, lon: -97.7259 },
  { name: 'South Congress (SoCo)', detail: 'S Congress Ave', lat: 30.249, lon: -97.7496 },
  { name: 'Downtown Austin', detail: 'Congress Ave & 6th St', lat: 30.2672, lon: -97.7431 },
];

export const ORIGIN_PRESETS: Place[] = [
  { name: 'Downtown Austin', detail: 'Congress Ave & 6th St (Default)', lat: 30.2672, lon: -97.7431 },
  { name: 'UT Austin', detail: 'Campus · Speedway', lat: 30.2849, lon: -97.7341 },
  { name: 'South Congress (SoCo)', detail: 'S Congress Ave', lat: 30.249, lon: -97.7496 },
  { name: 'The Domain', detail: 'North Austin', lat: 30.4021, lon: -97.7259 },
  { name: 'Onion Creek Park', detail: 'Southeast Austin · Onion Creek', lat: 30.1755, lon: -97.7429 },
  { name: 'ABIA Airport', detail: '3600 Presidential Blvd', lat: 30.1975, lon: -97.6664 },
  { name: 'Pflugerville', detail: 'FM 1825 · Gilleland Creek corridor', lat: 30.4394, lon: -97.62 },
];

export const COMMUTE_PAIR_PRESETS: { label: string; origin: Place | null; destination: Place }[] = [
  {
    label: 'Downtown → Onion Creek Park',
    origin: ORIGIN_PRESETS[0]!,
    destination: { name: 'Onion Creek Park', detail: 'Southeast Austin · Onion Creek', lat: 30.1755, lon: -97.7429 },
  },
  {
    label: 'Barton Creek → UT Austin',
    origin: { name: 'Barton Creek Greenbelt', detail: 'Loop 360 Access', lat: 30.2449, lon: -97.8017 },
    destination: { name: 'UT Austin', detail: 'Campus · Speedway', lat: 30.2849, lon: -97.7341 },
  },
  {
    label: 'Bull Creek → The Domain',
    origin: { name: 'Bull Creek District Park', detail: 'Lakewood Dr · Bull Creek', lat: 30.3694, lon: -97.7867 },
    destination: { name: 'The Domain', detail: 'North Austin', lat: 30.4021, lon: -97.7259 },
  },
  {
    label: 'Austin → College Station (Coverage check)',
    origin: ORIGIN_PRESETS[0]!,
    destination: { name: 'College Station, TX', detail: 'Brazos County · Outside Austin inventory', lat: 30.628, lon: -96.3344 },
  },
];

function isNight(): boolean {
  const h = Number(
    new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false }),
  );
  return h >= 19 || h < 7;
}

function OriginSelector({ compact = false, onSearchFocus }: { compact?: boolean; onSearchFocus?: () => void }) {
  const { language } = usePreferences();
  const m = useMonitor();
  const [editingOrigin, setEditingOrigin] = useState(false);
  const [originQuery, setOriginQuery] = useState('');
  const [originResults, setOriginResults] = useState<Place[]>([]);
  const es = language === 'es';

  useEffect(() => {
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      if (!editingOrigin || originQuery.trim().length < 3) {
        setOriginResults([]);
        return;
      }
      searchPlaces(originQuery, m.location, ctl.signal)
        .then((r) => {
          if (!ctl.signal.aborted) setOriginResults(r);
        })
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [editingOrigin, originQuery, m.location]);

  const originLabel =
    m.locationSource === 'gps'
      ? es
        ? 'Tu ubicación GPS actual'
        : 'Your current GPS location'
      : m.customOrigin
        ? m.customOrigin.name
        : es
          ? 'Centro de Austin · GPS apagado'
          : 'Downtown Austin · GPS off';

  return (
    <View
      style={{
        padding: compact ? 9 : 11,
        borderRadius: 12,
        backgroundColor: S.primary,
        borderWidth: 1,
        borderColor: S.borderSubtle,
        gap: 8,
      }}
    >
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <FcIcon name="pin" size={14} color={ACCENT} />
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 11, color: S.textMuted, fontFamily: 'Inter_600SemiBold' }}>
              {es ? 'PUNTO DE PARTIDA' : 'STARTING POINT'}
            </AppText>
            <AppText style={{ fontSize: 13.5, fontFamily: 'Inter_600SemiBold', color: S.textPrimary }}>
              {originLabel}
            </AppText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Chip
              label={editingOrigin ? (es ? 'Listo' : 'Done') : es ? 'Cambiar inicio' : 'Change start'}
              active={editingOrigin}
              onPress={() => setEditingOrigin((v) => !v)}
            />
          {m.locationSource !== 'gps' ? (
            <Chip label={es ? 'Usar GPS' : 'Use GPS'} icon="target" active={false} onPress={() => void m.requestLocation()} />
          ) : null}
        </View>
      </View>

      {editingOrigin ? (
        <View style={{ gap: 8, paddingTop: 2 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {ORIGIN_PRESETS.map((place) => {
              const isDefault = place.name === 'Downtown Austin';
              const selected =
                (m.customOrigin?.name ?? 'Downtown Austin') === place.name && m.locationSource !== 'gps';
              return (
                <Chip
                  key={`orig-${place.name}`}
                  label={isDefault ? (es ? 'Centro de Austin (Predeterminado)' : 'Downtown Austin (Default)') : place.name}
                  active={selected}
                  onPress={() => {
                    m.setCustomOrigin(isDefault ? null : place);
                    setOriginQuery('');
                    setOriginResults([]);
                    setEditingOrigin(false);
                  }}
                />
              );
            })}
          </View>
          <TextInput
            onFocus={onSearchFocus}
            value={originQuery}
            onChangeText={setOriginQuery}
            placeholder={es ? 'O busca otra dirección de salida…' : 'Or search another starting address…'}
            placeholderTextColor={S.textMuted}
            accessibilityLabel={es ? 'Buscar punto de partida' : 'Search starting point'}
            style={{
              minHeight: 44,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: S.borderSubtle,
              backgroundColor: S.elevated1,
              color: S.textPrimary,
              paddingHorizontal: 12,
              fontSize: 13.5,
            }}
          />
          {originResults.map((r) => (
            <Pressable
              key={`orig-search-${r.lat},${r.lon}`}
              accessibilityRole="button"
              accessibilityLabel={r.name}
              onPress={() => {
                m.setCustomOrigin(r);
                setOriginQuery('');
                setOriginResults([]);
                setEditingOrigin(false);
              }}
              style={({ pressed }) => ({
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderRadius: 8,
                backgroundColor: pressed ? S.elevated2 : S.elevated1,
                borderWidth: 1,
                borderColor: S.borderSubtle,
              })}
            >
              <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5 }}>{r.name}</AppText>
              {r.detail ? <AppText style={{ fontSize: 12, color: S.textSecondary }}>{r.detail}</AppText> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function RoutePlanner({ onSearchFocus }: { onSearchFocus?: () => void } = {}) {
  const { t } = usePreferences();
  const m = useMonitor();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searchError, setSearchError] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlaces>({});

  useEffect(() => {
    storage
      .get(SAVED_PLACES_KEY)
      .then((raw) => {
        if (raw) setSavedPlaces(JSON.parse(raw) as SavedPlaces);
      })
      .catch(() => {});
  }, []);

  const saveCommutePlace = (slot: 'home' | 'work', place: Place) => {
    const next = { ...savedPlaces, [slot]: place };
    setSavedPlaces(next);
    storage.set(SAVED_PLACES_KEY, JSON.stringify(next)).catch(() => {});
  };

  useEffect(() => {
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      if (q.trim().length < 3) {
        setResults([]);
        setSearchError(false);
        return;
      }
      searchPlaces(q, m.location, ctl.signal)
        .then((r) => {
          if (!ctl.signal.aborted) {
            setResults(r);
            setSearchError(false);
          }
        })
        .catch(() => {
          if (!ctl.signal.aborted) setSearchError(true);
        });
    }, 320);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [q, m.location]);

  if (m.routePlan) {
    return <RouteCard savedPlaces={savedPlaces} onSavePlace={saveCommutePlace} onSearchFocus={onSearchFocus} />;
  }

  return (
    <View style={{ gap: 12 }}>
      <Panel style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FcIcon name="route" size={18} color={ACCENT} />
          <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 17 }}>{t('route.where_to')}</AppText>
        </View>

        <OriginSelector onSearchFocus={onSearchFocus} />

        <TextInput
          onFocus={onSearchFocus}
          value={q}
          onChangeText={setQ}
          placeholder={t('route.search')}
          placeholderTextColor={S.textMuted}
          accessibilityLabel={t('route.where_to')}
          style={{
            minHeight: 46,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: ACCENT,
            backgroundColor: S.primary,
            color: S.textPrimary,
            paddingHorizontal: 14,
            fontSize: 15,
          }}
        />
        <View style={{ minHeight: 24 }} accessibilityLiveRegion="polite">
          {m.routeBusy ? <AppText style={{ color: '#7DD3FC', fontFamily: 'Inter_600SemiBold' }}>{t('route.checking')}</AppText> : null}
        </View>
        {m.routeError ? <AppText style={{ color: LOCKED_STATE_HEX.watch }}>{t('route.error')}</AppText> : null}
        {searchError ? <AppText style={{ color: LOCKED_STATE_HEX.watch }}>{t('route.search_error')}</AppText> : null}
        {results.map((r) => (
          <Pressable
            key={`${r.lat},${r.lon}`}
            accessibilityRole="button"
            accessibilityLabel={r.name}
            onPress={() => {
              setQ('');
              setResults([]);
              void m.planRoute(r);
            }}
            style={({ pressed }) => ({
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: pressed ? S.elevated2 : S.primary,
              borderWidth: 1,
              borderColor: S.borderSubtle,
            })}
          >
            <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14.5 }}>{r.name}</AppText>
            {r.detail ? <AppText style={{ fontSize: 12.5, color: S.textSecondary }}>{r.detail}</AppText> : null}
          </Pressable>
        ))}
        <AppText style={{ fontSize: 12.5, lineHeight: 17, color: S.textMuted }}>{t('route.hint')}</AppText>
      </Panel>

      {savedPlaces.home || savedPlaces.work ? (
        <Panel style={{ gap: 8 }}>
          <SectionLabel>{t('route.saved_places')}</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {savedPlaces.home ? (
              <ActionButton
                compact
                kind="secondary"
                icon="home"
                label={`${t('route.home_label')}: ${savedPlaces.home.name}`}
                onPress={() => void m.planRoute(savedPlaces.home!)}
              />
            ) : null}
            {savedPlaces.work ? (
              <ActionButton
                compact
                kind="secondary"
                icon="work"
                label={`${t('route.work_label')}: ${savedPlaces.work.name}`}
                onPress={() => void m.planRoute(savedPlaces.work!)}
              />
            ) : null}
          </View>
        </Panel>
      ) : null}

      <Panel style={{ gap: 10 }}>
        <SectionLabel>{t('route.quick_title')}</SectionLabel>
        <AppText style={{ fontSize: 12.5, lineHeight: 18, color: S.textSecondary }}>
          {t('route.audit_intro')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {QUICK_DESTINATIONS.map((dest) => (
            <Chip
              key={dest.name}
              icon="arrow-right"
              label={dest.name}
              active={false}
              onPress={() => void m.planRoute(dest)}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
          {COMMUTE_PAIR_PRESETS.map((pair) => (
            <Chip
              key={pair.label}
              icon="route"
              label={pair.destination.name === 'College Station, TX' ? t('route.preset_coverage') : pair.label}
              active={false}
              onPress={() => {
                m.setCustomOrigin(pair.origin);
                void m.planRoute(pair.destination, pair.origin ?? undefined);
              }}
            />
          ))}
        </View>
      </Panel>
    </View>
  );
}

function RouteAuditSummary({
  groups,
  distinctEvents,
  unmonitoredCount,
}: {
  groups: PhysicalCrossingGroup[];
  distinctEvents: number;
  unmonitoredCount: number;
}) {
  const { t } = usePreferences();
  const m = useMonitor();
  const refNow = Math.max(m.nowMs ?? 0, m.liveFetchedAt ?? 0, m.latestObsAt ?? 0);
  const evidence = routeEvidence(groups, m.feeds.atx.ok, refNow);
  const officialStatus = t(`route.summary_official_${evidence.official}`, { count: evidence.closed });

  return (
    <View
      style={{
        gap: 6,
      }}
    >
      <AppText style={{ fontSize: 12.5, lineHeight: 18, color: S.textPrimary, fontFamily: 'Inter_600SemiBold' }}>
        {t('route.summary_official_row', { status: officialStatus })}
      </AppText>
      <AppText style={{ fontSize: 12.5, lineHeight: 18, color: S.textPrimary, fontFamily: 'Inter_600SemiBold' }}>
        {evidence.linked === 0 ? t('route.summary_no_sensors') : t('route.summary_creek_row', { fresh: evidence.fresh, linked: evidence.linked })}
      </AppText>
      <AppText style={{ fontSize: 12.5, lineHeight: 18, color: S.textPrimary, fontFamily: 'Inter_600SemiBold' }}>
        {t('route.summary_history_row', { events: distinctEvents })}
      </AppText>
      {groups.some((g) => g.records.some((r) => r.history == null)) ? (
        <AppText style={{ fontSize: 12, lineHeight: 17, color: S.textSecondary }}>{t('route.summary_history_gap')}</AppText>
      ) : null}
      <AppText style={{ fontSize: 11.5, lineHeight: 16, color: unmonitoredCount > 0 ? LOCKED_STATE_HEX.watch : S.textMuted }}>
        {t('route.summary_unknown_note')}
      </AppText>
    </View>
  );
}

function TripEvidenceExplainer() {
  const { t } = usePreferences();
  const [open, setOpen] = useState(false);
  return (
    <View
      style={{
        gap: 6,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('route.explainer_title')}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      >
        <AppText style={{ fontSize: 12.5, fontFamily: 'Inter_600SemiBold', color: '#7DD3FC', flex: 1 }}>
          {t('route.explainer_title')}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <FcIcon name="chevron-right" size={14} color={S.textMuted} />
        </View>
      </Pressable>
      {open ? (
        <AppText style={{ fontSize: 12.5, lineHeight: 18, color: S.textSecondary }}>
          {t('route.explainer_body')}
        </AppText>
      ) : null}
    </View>
  );
}

function RouteCard({
  savedPlaces,
  onSavePlace,
  onSearchFocus,
}: {
  savedPlaces: SavedPlaces;
  onSavePlace: (slot: 'home' | 'work', place: Place) => void;
  onSearchFocus?: () => void;
}) {
  const { t, language } = usePreferences();
  const m = useMonitor();
  const [showAllCrossings, setShowAllCrossings] = useState(false);
  const [showTestingTools, setShowTestingTools] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [bgRunning, setBgRunning] = useState(false);
  const es = language === 'es';
  const plan = m.routePlan!;

  useFocusEffect(useCallback(() => {
    let mounted = true;
    guardianRunning()
      .then((r) => {
        if (mounted) setBgRunning(r);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []));
  const onRoute = hazardsOnRoute(plan.route.coords, m.hazards);
  const cautions = onRoute.filter((h) => h.level === 'caution');
  const blocked = onRoute.filter((h) => h.level === 'block');
  const sensorsDown = !m.liveSeries || m.feeds.usgs.ok === false;
  const currentDest: Place = {
    name: plan.destinationName,
    detail: '',
    lat: plan.destination.lat,
    lon: plan.destination.lon,
  };

  // Group physical crossings along the route corridor BEFORE truncation so counts are 100% accurate.
  const audit = useMemo(() => {
    const found: { status: CrossingStatus; routeIndex: number }[] = [];
    const coords = plan.route.coords;
    if (!coords.length) {
      return {
        groups: [],
        totalRecords: 0,
        monitoredCount: 0,
        unmonitoredCount: 0,
        crossingsWithHistory: 0,
        distinctEvents: 0,
      };
    }
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;
    for (const pt of coords) {
      if (pt.lat < minLat) minLat = pt.lat;
      if (pt.lat > maxLat) maxLat = pt.lat;
      if (pt.lon < minLon) minLon = pt.lon;
      if (pt.lon > maxLon) maxLon = pt.lon;
    }
    const pad = 0.003;
    for (const s of m.statuses) {
      if (s.lat < minLat - pad || s.lat > maxLat + pad || s.lon < minLon - pad || s.lon > maxLon + pad) continue;
      const hit = distanceToRouteM(s, coords);
      if (hit.d <= 120) {
        found.push({ status: s, routeIndex: hit.index });
      }
    }
    found.sort((a, b) => a.routeIndex - b.routeIndex);
    const groups = groupPhysicalCrossings(found);
    const monitoredCount = groups.filter((g) => g.primary.monitored).length;
    const unmonitoredCount = groups.length - monitoredCount;
    const { crossingsWithHistory, distinctEvents } = countDistinctHistoryEvents(groups);
    return {
      groups,
      totalRecords: found.length,
      monitoredCount,
      unmonitoredCount,
      crossingsWithHistory,
      distinctEvents,
    };
  }, [plan.route.coords, m.statuses]);

  const visibleGroups = showAllCrossings ? audit.groups : audit.groups.slice(0, 6);
  const refNow = Math.max(m.nowMs ?? 0, m.liveFetchedAt ?? 0, m.latestObsAt ?? 0);

  return (
    <View style={{ gap: 12 }}>
      <Panel style={{ borderColor: blocked.length ? LOCKED_STATE_HEX.avoid : ACCENT, gap: 12 }}>
        {plan.geometrySource === 'recorded' ? (
          <AppText accessibilityRole="alert" style={{ color: LOCKED_STATE_HEX.watch, fontSize: 14, lineHeight: 20 }}>
            {es
              ? `Geometría grabada · ${plan.geometryCapturedAt?.slice(0, 10)}. El servicio de rutas no respondió. Solo revisión; no se calculó un desvío actual. La disponibilidad de fuentes se muestra abajo.`
              : `Recorded geometry · ${plan.geometryCapturedAt?.slice(0, 10)}. Routing service unavailable. Review only; no current detour was calculated. Source availability is shown below.`}
          </AppText>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 11.5, color: S.textMuted, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.6 }}>
              {t('route.to')}
            </AppText>
            <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 19, lineHeight: 24 }}>{plan.destinationName}</AppText>
            <AppText style={{ fontSize: 12, color: S.textSecondary, marginTop: 2 }}>
              {t('route.group_summary', { groups: audit.groups.length, records: audit.totalRecords, linked: audit.monitoredCount })}
            </AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('route.clear')} hitSlop={10} onPress={m.clearRoute}>
            <FcIcon name="close" size={20} color={S.textSecondary} />
          </Pressable>
        </View>

        <OriginSelector compact onSearchFocus={onSearchFocus} />

        <RouteAuditSummary
          groups={audit.groups}
          distinctEvents={audit.distinctEvents}
          unmonitoredCount={audit.unmonitoredCount}
        />

        {plan.outsideCoverage ? (
          <View
            accessibilityRole="alert"
            style={{
              backgroundColor: '#332108',
              borderRadius: 12,
              padding: 12,
              gap: 4,
              borderWidth: 1.5,
              borderColor: LOCKED_STATE_HEX.watch,
            }}
          >
            <AppText style={{ fontFamily: 'Inter_700Bold', color: LOCKED_STATE_HEX.watch, fontSize: 14.5 }}>
              {t('route.coverage_title')}
            </AppText>
            <AppText style={{ fontSize: 13, lineHeight: 18, color: S.textPrimary }}>
              {t('route.coverage_body', { percent: Math.round((plan.coverageFraction ?? 0) * 100) })}
            </AppText>
          </View>
        ) : null}

        {/* Side-by-side Route Comparison */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(96, 165, 250, 0.12)',
              borderWidth: 1,
              borderColor: ACCENT,
              gap: 2,
            }}
          >
            <AppText style={{ fontSize: 11.5, color: '#7DD3FC', fontFamily: 'Inter_600SemiBold' }}>
              {t('route.compare_checked')}
            </AppText>
            <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, fontVariant: ['tabular-nums'] }}>
              {Math.round(plan.route.min)} min
            </AppText>
            <AppText style={{ fontSize: 12.5, color: S.textSecondary, fontVariant: ['tabular-nums'] }}>
              {formatMiles(plan.route.km)}
            </AppText>
          </View>

          {plan.avoided.length > 0 ? (
            <View
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                backgroundColor: 'rgba(255, 84, 112, 0.10)',
                borderWidth: 1,
                borderColor: LOCKED_STATE_HEX.avoid,
                gap: 2,
              }}
            >
              <AppText style={{ fontSize: 11.5, color: LOCKED_STATE_HEX.avoid, fontFamily: 'Inter_600SemiBold' }}>
                {t('route.compare_direct')}
              </AppText>
              <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 20, fontVariant: ['tabular-nums'] }}>
                {Math.round(plan.baseline.min)} min
              </AppText>
              <AppText style={{ fontSize: 12.5, color: LOCKED_STATE_HEX.avoid }}>
                {t('route.hazards_count', { count: plan.avoided.length })}
              </AppText>
            </View>
          ) : null}
        </View>

        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showSources }}
          onPress={() => setShowSources((v) => !v)} style={{ minHeight: 48, justifyContent: 'center' }}>
          <AppText style={{ color: S.textSecondary, fontSize: 13 }}>{t('route.sources_toggle')}</AppText>
        </Pressable>
        {showSources ? (
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
          <AppText style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: S.textSecondary, letterSpacing: 0.5 }}>
            {t('route.sources_title')}
          </AppText>
          <AppText style={{ fontSize: 12, lineHeight: 17, color: S.textSecondary }}>
            {t('route.sources_detail', {
              atx: t(m.feeds.atx.ok == null ? 'route.summary_official_loading' : m.feeds.atx.ok ? 'route.source_checked' : 'route.summary_official_unavailable'),
              usgs: t(m.feeds.usgs.ok == null ? 'route.summary_official_loading' : m.feeds.usgs.ok ? 'route.source_received' : 'route.summary_official_unavailable'),
              nws: t(m.feeds.nws.ok == null ? 'route.summary_official_loading' : m.feeds.nws.ok ? 'route.source_checked' : 'route.summary_official_unavailable'),
              age: agoText(t, plan.computedAt, refNow),
            })}
          </AppText>
          {audit.unmonitoredCount > 0 ? (
            <AppText style={{ fontSize: 12, lineHeight: 17, color: LOCKED_STATE_HEX.watch }}>
              {es
                ? `${audit.unmonitoredCount} zona(s) de cruce cerca de esta ruta no tienen sensor de arroyo; ausencia de reporte no garantiza vía seca.`
                : `${audit.unmonitoredCount} crossing area(s) near this route have no creek sensor; no reported hazard does not guarantee a dry road.`}
            </AppText>
          ) : null}
        </View>
        ) : null}

        {plan.outsideCoverage ? (
          <AppText style={{ fontSize: 13.5, lineHeight: 19, color: LOCKED_STATE_HEX.watch, fontFamily: 'Inter_600SemiBold' }}>
            {t('route.coverage_short')}
          </AppText>
        ) : plan.avoided.length ? (
          <AppText style={{ fontSize: 14, lineHeight: 20, color: '#7DD3FC', fontFamily: 'Inter_600SemiBold' }}>
            {t(plan.avoided.length === 1 ? 'route.avoids_one' : 'route.avoids_many', {
              count: plan.avoided.length,
              min: Math.round(plan.extraMin),
            })}
          </AppText>
        ) : !blocked.length ? (
          <AppText style={{ fontSize: 14, color: S.textSecondary }}>{t('route.none_reported')}</AppText>
        ) : null}

        {plan.avoided.map((h) => (
          <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FcIcon name="route" size={14} color="#7DD3FC" />
            <AppText style={{ flex: 1, fontSize: 13.5, lineHeight: 19, color: S.textSecondary }}>
              {t('route.avoided_item', { name: cleanName(h.name), reason: h.reason })}
            </AppText>
          </View>
        ))}

        {blocked.length ? (
          <View
            style={{
              backgroundColor: '#380D1A',
              borderRadius: 12,
              padding: 12,
              gap: 4,
              borderWidth: 1,
              borderColor: LOCKED_STATE_HEX.avoid,
            }}
          >
            <AppText
              accessibilityRole="alert"
              style={{ fontFamily: 'Inter_700Bold', color: LOCKED_STATE_HEX.avoid, fontSize: 15 }}
            >
              {t('route.no_way_title', { name: cleanName(blocked[0]!.name) })}
            </AppText>
            <AppText style={{ fontSize: 13.5, lineHeight: 19 }}>
              {t('route.no_way_body', { reason: blocked[0]!.reason })}
            </AppText>
          </View>
        ) : null}

        {cautions.map((h) => (
          <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FcIcon name="alert" size={14} color={LOCKED_STATE_HEX.watch} />
            <AppText style={{ flex: 1, fontSize: 13.5, lineHeight: 19, color: LOCKED_STATE_HEX.watch }}>
              {t('route.caution_item', { name: cleanName(h.name), reason: h.reason })}
            </AppText>
          </View>
        ))}

        {sensorsDown ? (
          <AppText style={{ fontSize: 12.5, lineHeight: 17, color: LOCKED_STATE_HEX.watch }}>{t('route.sensors_down')}</AppText>
        ) : null}
        {m.feeds.atx.ok === false ? (
          <AppText style={{ fontSize: 12.5, lineHeight: 17, color: LOCKED_STATE_HEX.watch }}>{t('route.atx_down')}</AppText>
        ) : null}
        {m.feeds.nws.ok === false ? (
          <AppText style={{ fontSize: 12.5, lineHeight: 17, color: LOCKED_STATE_HEX.watch }}>
            {t('route.nws_down')}
          </AppText>
        ) : null}
        {isNight() ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FcIcon name="moon" size={14} color={S.textSecondary} />
            <AppText style={{ flex: 1, fontSize: 12.5, lineHeight: 17, color: S.textSecondary }}>{t('route.night_tip')}</AppText>
          </View>
        ) : null}
      </Panel>

      {/* Crossings on Your Trip (Placed ABOVE handoff so exposure is seen before leaving) */}
      <Panel style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FcIcon name="shield" size={16} color={ACCENT} />
            <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 15.5 }}>{t('route.audit_title')}</AppText>
          </View>
          {audit.groups.length > 6 ? (
            <AppText style={{ fontSize: 12, color: S.textMuted, fontVariant: ['tabular-nums'] }}>
              {showAllCrossings ? `${audit.groups.length}/${audit.groups.length}` : `6 of ${audit.groups.length}`}
            </AppText>
          ) : null}
        </View>
        <AppText style={{ fontSize: 13, lineHeight: 18, color: S.textSecondary }}>
          {audit.groups.length > 0
            ? t('route.audit_counts', { count: audit.groups.length, events: audit.distinctEvents })
            : t('route.audit_zero')}
        </AppText>
        {visibleGroups.map((g) => {
          const c = g.primary;
          return (
            <Pressable
              key={g.id}
              accessibilityRole="button"
              accessibilityLabel={g.cleanName}
              onPress={() => router.push({ pathname: '/crossing/[id]', params: { id: g.id } })}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 10,
                borderRadius: 12,
                backgroundColor: pressed ? S.elevated2 : S.primary,
                borderWidth: 1,
                borderColor: S.borderSubtle,
              })}
            >
              <FcIcon name="creeks" size={15} color={c.monitored ? ACCENT : S.textMuted} />
              <View style={{ flex: 1, gap: 1 }}>
                <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5 }}>
                  {g.cleanName}
                </AppText>
                <AppText style={{ fontSize: 12, lineHeight: 18, color: S.textSecondary }}>
                  {c.creek ? `${cleanName(c.creek)} · ` : ''}
                  {statusLabel(t, c)}
                  {g.recordCount > 1 ? ` · ${t('route.record_count', { count: g.recordCount })}` : ''}
                  {c.history && c.history.reports > 0 ? ` · ${t('route.history_count', { count: c.history.reports })}` : ''}
                </AppText>
              </View>
              <FcIcon name="chevron-right" size={15} color={S.textMuted} />
            </Pressable>
          );
        })}
        {audit.groups.length > 6 ? (
          <ActionButton
            compact
            kind="secondary"
            label={
              showAllCrossings ? t('route.show_less') : t('route.show_all', { count: audit.groups.length })
            }
            onPress={() => setShowAllCrossings((v) => !v)}
          />
        ) : null}
      </Panel>

      <TripEvidenceExplainer />

      {/* Navigation handoff follows the crossing evidence. */}
      <Panel style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {m.mode === 'live' && !m.testHazard && !m.routeBusy && !m.routeError && plan.geometrySource !== 'recorded' && blocked.length === 0 ? (
            <ActionButton
              icon="arrow-right"
              label={t('route.open_google')}
              onPress={() => {
                void Linking.openURL(googleMapsUrl(plan)).catch(() =>
                  Alert.alert(
                    es ? 'No se pudo abrir Google Maps' : 'Could not open Google Maps',
                    es ? 'Inténtelo de nuevo antes de salir.' : 'Try again before leaving.',
                  ),
                );
              }}
            />
          ) : null}
          {m.mode === 'live' && !m.testHazard && !m.routeBusy && !m.routeError && plan.geometrySource !== 'recorded' ? (
            <ActionButton
              kind="secondary"
              icon="share"
              label={t('route.share')}
              onPress={() =>
                void shareText(
                  `FordCast Route: ${plan.destinationName}`,
                  `FordCast Route to ${plan.destinationName}: ${Math.round(plan.route.min)} min (${formatMiles(plan.route.km)}). ${
                    plan.avoided.length
                      ? `Avoids ${plan.avoided.map((a) => cleanName(a.name)).join(', ')}.`
                      : 'No reported closures or flood sensor triggers on route.'
                  } ${googleMapsUrl(plan)}`,
                )
              }
            />
          ) : null}
          {savedPlaces.home?.name !== plan.destinationName ? (
            <Chip
              icon="home"
              label={t('route.save_as_home')}
              active={false}
              onPress={() => onSavePlace('home', currentDest)}
            />
          ) : null}
          {savedPlaces.work?.name !== plan.destinationName ? (
            <Chip
              icon="work"
              label={t('route.save_as_work')}
              active={false}
              onPress={() => onSavePlace('work', currentDest)}
            />
          ) : null}
        </View>

        <AppText style={{ fontSize: 12, lineHeight: 17, color: S.textMuted }}>
          {`${t('route.google_note_base')} ${
            Platform.OS === 'web'
              ? t('route.google_note_web')
              : !guardianSupported()
                ? t('route.google_note_expo_go')
                : bgRunning
                  ? t('route.google_note_on')
                  : t('route.google_note_off')
          }`}
        </AppText>

        {/* Testing / Demo Hazard Injection tucked into optional disclosure */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowTestingTools((v) => !v)}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <AppText style={{ fontSize: 12, color: S.textMuted, fontFamily: 'Inter_600SemiBold' }}>
            {showTestingTools
              ? es
                ? 'Ocultar herramientas de prueba de desvío'
                : 'Hide reroute test tools'
              : es
                ? 'Probar desvío con cierre simulado'
                : 'Test rerouting with a simulated closure'}
          </AppText>
        </Pressable>
        {showTestingTools ? (
          !m.testHazard ? (
            <ActionButton compact kind="secondary" icon="flask" label={t('route.simulate')} onPress={m.simulateHazardOnRoute} />
          ) : (
            <View style={{ gap: 8 }}>
              <AppText style={{ fontSize: 12.5, lineHeight: 17, color: '#9B8AFB', fontFamily: 'Inter_600SemiBold' }}>
                {t('route.simulate_note')}
              </AppText>
              <ActionButton
                compact
                kind="secondary"
                icon="close"
                label={es ? 'Finalizar prueba y revisar ruta' : 'End test and recheck route'}
                onPress={() => void m.endRouteTest()}
              />
            </View>
          )
        ) : null}
      </Panel>
    </View>
  );
}

export function TripCard({ trip }: { trip: ReturnType<typeof useTripDemo> }) {
  const { t, language } = usePreferences();
  const m = useMonitor();
  const available = tripFor(m.drill.stormId);
  if (!available) return null;
  if (!trip.active || !trip.run) {
    return (
      <Panel style={{ borderColor: ACCENT }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FcIcon name="car" size={18} color={ACCENT} />
          <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 17 }}>{t('trip.title')}</AppText>
        </View>
        <AppText style={{ fontSize: 13.5, lineHeight: 19, color: S.textSecondary }}>
          {t('trip.body', { name: cleanName(available.crossingName) })}
        </AppText>
        <ActionButton
          icon="play"
          label={t('trip.start')}
          onPress={() => {
            m.setHomeTab('explore');
            trip.start(m.drill.stormId);
          }}
        />
      </Panel>
    );
  }
  const r = trip.run;
  const replay = replays[r.trip.stormId] ?? replays[m.drill.stormId];
  const stormTitle = replay
    ? language === 'es'
      ? replay.storm.name_es
      : replay.storm.name_en
    : r.trip.stormId;
  const name = cleanName(r.trip.crossingName);
  const status =
    r.phase === 'rerouted'
      ? t('trip.status_rerouted', { name, min: r.rerouteExtraMin ?? 0 })
      : r.phase === 'caution'
        ? t('trip.status_caution', { name })
        : r.phase === 'no_way'
          ? t('trip.no_way_title', { name })
          : r.phase === 'arrived'
            ? t('trip.status_arrived')
            : t('trip.status_driving', { dist: formatMiles(trip.kmLeft) });
  const color =
    r.phase === 'rerouted' || r.phase === 'arrived' ? '#7DD3FC' : r.phase === 'driving' ? S.textPrimary : LOCKED_STATE_HEX.watch;
  return (
    <Panel style={{ borderColor: ACCENT, padding: 12, gap: 8 }}>
      <View style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
        <AppText
          style={{
            flexShrink: 1,
            fontSize: 11,
            lineHeight: 15,
            color: '#9B8AFB',
            fontFamily: 'Inter_600SemiBold',
            letterSpacing: 0.5,
          }}
        >
          {t('trip.archived_sim_header', { storm: stormTitle })}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Chip
            icon="target"
            label={trip.followCar ? t('trip.camera_following') : t('trip.camera_free')}
            active={trip.followCar}
            onPress={() => trip.setFollowCar(!trip.followCar)}
          />
          <ActionButton
            compact
            kind="secondary"
            style={{ minWidth: 92, minHeight: 48 }}
            label={t('trip.stop')}
            onPress={trip.stop}
          />
        </View>
      </View>
      <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 21, color }}>{status}</AppText>
      {r.phase === 'arrived' && trip.note ? (
        <AppText style={{ fontSize: 13, lineHeight: 18, color: S.textSecondary }}>{trip.note}</AppText>
      ) : (
        <AppText style={{ fontSize: 12.5, lineHeight: 17, color: S.textSecondary }}>{t('trip.watching', { name })}</AppText>
      )}
      {r.phase === 'arrived' ? (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <ActionButton compact icon="replay" label={t('trip.replay')} onPress={() => trip.start(m.drill.stormId)} />
        </View>
      ) : null}
    </Panel>
  );
}

export function SensorsAndToolsPanel({
  selectedGaugeId,
  onSelectGauge,
}: {
  selectedGaugeId: string | null;
  onSelectGauge: (gaugeId: string, coords: { lat: number; lon: number }) => void;
}) {
  const { t, language } = usePreferences();
  const m = useMonitor();
  const drill = m.mode === 'drill';
  const replay = replays[m.drill.stormId] ?? replays['memorial-day-2015']!;
  const es = language === 'es';

  return (
    <View style={{ gap: 12 }}>
      <Panel style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FcIcon name="creeks" size={18} color={ACCENT} />
          <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 17 }}>{t('sensors.title')}</AppText>
        </View>
        <AppText style={{ fontSize: 13, lineHeight: 18, color: S.textSecondary }}>{t('sensors.subtitle')}</AppText>
        <AppText style={{ fontSize: 12, lineHeight: 17, color: S.textMuted }}>
          {es
            ? 'Nota: La altura del sensor se mide respecto al cero de referencia de la estación USGS, no es profundidad sobre la carretera. Valores negativos significan agua por debajo del cero del sensor.'
            : 'Note: Gauge height is measured relative to the USGS station datum, not water depth on the road. Negative values simply mean water is below the sensor datum zero.'}
        </AppText>
      </Panel>

      <View style={{ gap: 8 }}>
        {gauges.map((g) => {
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
          const refNow = Math.max(m.nowMs ?? 0, m.liveFetchedAt ?? 0, m.latestObsAt ?? 0);
          const isStale = !drill && last != null && refNow > 0 && refNow - last.t > LIVE_STALE_MIN * 60_000;
          const change = !isStale ? rise30(rows) : null;
          const rising = change != null && change > 0.15;
          const vettedCats = CACHED_NWPS_CATEGORIES_BY_GAUGE[p.id];
          const floodFt = vettedCats?.minor ?? null;
          const actionFt = vettedCats?.action ?? null;
          const aboveFlood = !isStale && last != null && floodFt != null && last.v >= floodFt;
          const aboveAction = !isStale && last != null && actionFt != null && last.v >= actionFt;
          const isSelected = selectedGaugeId === p.id;
          const accent = isStale || !last
            ? S.textMuted
            : aboveFlood
              ? LOCKED_STATE_HEX.avoid
              : aboveAction || rising
                ? LOCKED_STATE_HEX.watch
                : '#38BDF8';

          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${cleanName(p.name)}. ${last ? `${last.v.toFixed(2)} ft` : t('detail.sensor_none')}`}
              onPress={() => onSelectGauge(p.id, { lat, lon })}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 14,
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? ACCENT : aboveFlood || rising ? accent : S.borderSubtle,
                backgroundColor: S.elevated1,
                opacity: pressed ? 0.82 : 1,
              })}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: '#13283F',
                  borderWidth: 1.5,
                  borderColor: accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FcIcon name="gauge" size={14} color={accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText numberOfLines={2} style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 19 }}>
                  {cleanName(p.name)}
                </AppText>
                <AppText numberOfLines={1} style={{ fontSize: 12, color: S.textSecondary }}>
                  {cleanName(p.creek)} · {p.id}
                </AppText>
                {floodFt != null && vettedCats ? (
                  <AppText style={{ fontSize: 11.5, color: S.textMuted, fontVariant: ['tabular-nums'] }}>
                    {es
                      ? `Etapa de inundación fluvial NWPS (${vettedCats.nwsLid}): ${floodFt.toFixed(1)} ft`
                      : `Published river flood stage (NWPS ${vettedCats.nwsLid}): ${floodFt.toFixed(1)} ft`}
                  </AppText>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <AppText
                  style={{
                    fontFamily: 'Inter_700Bold',
                    fontSize: 15.5,
                    color: last && !isStale ? S.textPrimary : S.textMuted,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {last ? `${last.v.toFixed(2)} ft` : '—'}
                </AppText>
                {change != null ? (
                  <AppText
                    style={{
                      fontSize: 11.5,
                      color: rising ? LOCKED_STATE_HEX.watch : S.textSecondary,
                      fontFamily: 'Inter_600SemiBold',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {change >= 0 ? '+' : ''}
                    {change.toFixed(2)} ft / 30m
                  </AppText>
                ) : null}
                <AppText style={{ fontSize: 11, color: isStale ? LOCKED_STATE_HEX.watch : S.textMuted }}>
                  {last
                    ? drill
                      ? es
                        ? 'Muestra archivada'
                        : 'Archived sample'
                      : isStale
                        ? es
                          ? `Antigua (${agoText(t, last.t)})`
                          : `Stale (${agoText(t, last.t)})`
                        : es
                          ? `Medido ${agoText(t, last.t)}`
                          : `Measured ${agoText(t, last.t)}`
                    : t('detail.sensor_none')}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>{t('sensors.tools_title')}</SectionLabel>
      <Panel style={{ gap: 8 }}>
        <ActionButton
          kind="secondary"
          icon="alert"
          label={t('sensors.tool_311')}
          onPress={() => void Linking.openURL('https://www.austintexas.gov/department/311')}
        />
        <ActionButton
          kind="secondary"
          icon="shield"
          label={t('sensors.tool_atx')}
          onPress={() => void Linking.openURL('https://www.atxfloods.com/')}
        />
        <ActionButton
          kind="secondary"
          icon="radar"
          label={t('sensors.tool_nws')}
          onPress={() => void Linking.openURL('https://www.weather.gov/ewx/')}
        />
      </Panel>
    </View>
  );
}
