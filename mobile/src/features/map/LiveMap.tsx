/**
 * Real street map for iOS / Android (Apple Maps / Google Maps via react-native-maps,
 * which ships inside Expo Go). The web build uses LiveMap.web.tsx (Leaflet).
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker, Polygon, Polyline, type Region } from 'react-native-maps';
import Svg, { Line, Path, Polygon as SvgPolygon } from 'react-native-svg';
import type { LatLon } from '@/lib/geo';
import { LOCKED_STATE_HEX, STATE_TOKENS, type CrossingStateKey } from '@/theme/tokens';

export type MapMarker = {
  id: string;
  lat: number;
  lon: number;
  /** null = FordCast has no status for this crossing. */
  state: CrossingStateKey | null;
  monitored: boolean;
  label: string;
};
export type MapGauge = {
  id: string;
  name: string;
  creek: string;
  lat: number;
  lon: number;
  stageFt: number | null;
  changeFt: number | null;
};
export type MapCreek = {
  id: string;
  coords: LatLon[];
};
export type MapRoute = { id: string; coords: LatLon[]; color: string; dashed?: boolean; width?: number };
export type MapPolygon = { id: string; rings: [number, number][][]; color: string };
export type MapCar = { lat: number; lon: number; heading: number };

export type LiveMapProps = {
  markers: MapMarker[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  gauges?: MapGauge[];
  selectedGaugeId?: string | null;
  onSelectGauge?: (id: string | null) => void;
  creeks?: MapCreek[];
  user: LatLon | null;
  center: LatLon;
  /** Changing this value re-centres the map. */
  focusKey?: string;
  focus?: LatLon | null;
  /** Explicit zoom step triggered by + / - buttons. */
  zoomStep?: { seq: number; delta: number };
  routes?: MapRoute[];
  polygons?: MapPolygon[];
  car?: MapCar | null;
  /** Keep the car centred while it moves. */
  followCar?: boolean;
  /** Fired when user manually pans/drags the map. */
  onUserCameraMove?: () => void;
  destination?: LatLon | null;
  /** Zoom to show all these points whenever fitKey changes (e.g. a new route). */
  fit?: LatLon[] | null;
  fitKey?: string;
  style?: StyleProp<ViewStyle>;
};

const GLYPH: Record<CrossingStateKey, string> = {
  no_rise: '–',
  watch: '!',
  avoid: '!',
  closed: '✕',
  unknown: '?',
};

/** Shape + colour + symbol so the state never depends on colour alone. */
export const Pin = memo(function Pin({
  state,
  monitored,
  selected,
}: {
  state: CrossingStateKey | null;
  monitored: boolean;
  selected: boolean;
}) {
  if (!state) {
    return (
      <View
        style={{
          width: selected ? 16 : 9,
          height: selected ? 16 : 9,
          borderRadius: 8,
          backgroundColor: selected ? '#60A5FA' : '#5B76A3',
          borderWidth: selected ? 2.5 : 1.2,
          borderColor: selected ? '#F1F5F9' : '#CBD5E1',
        }}
      />
    );
  }
  const size = (selected ? 34 : 26) - (monitored ? 0 : 4);
  const color = LOCKED_STATE_HEX[state];
  const filled = state === 'avoid' || state === 'closed';
  const shape: ViewStyle =
    state === 'watch'
      ? { borderRadius: 4, transform: [{ rotate: '45deg' }] }
      : filled
        ? { borderRadius: 6 }
        : { borderRadius: size / 2, borderStyle: state === 'unknown' ? 'dashed' : 'solid' };
  return (
    <View style={{ width: size + 8, height: size + 8, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={[
          {
            width: state === 'watch' ? size * 0.82 : size,
            height: state === 'watch' ? size * 0.82 : size,
            backgroundColor: filled ? color : STATE_TOKENS[state].darkBg,
            borderWidth: selected ? 3 : 2,
            borderColor: selected ? '#F1F5F9' : color,
            alignItems: 'center',
            justifyContent: 'center',
          },
          shape,
        ]}
      >
        <Text
          style={{
            color: filled ? '#131C2B' : color,
            fontWeight: '900',
            fontSize: selected ? 17 : 14,
            transform: state === 'watch' ? [{ rotate: '-45deg' }] : undefined,
          }}
        >
          {GLYPH[state]}
        </Text>
      </View>
    </View>
  );
});

export const GaugePin = memo(function GaugePin({
  stageFt,
  selected,
}: {
  stageFt: number | null;
  selected: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
        backgroundColor: selected ? '#0284C7' : '#13283F',
        borderWidth: selected ? 2 : 1.5,
        borderColor: selected ? '#F1F5F9' : '#38BDF8',
      }}
    >
      <Svg width={9} height={9} viewBox="0 0 24 24">
        <SvgPolygon points="12 2 22 12 12 22 2 12 12 2" fill="#38BDF8" />
      </Svg>
      {stageFt != null ? (
        <Text style={{ color: '#F1F5F9', fontSize: 10.5, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {stageFt.toFixed(1)}ft
        </Text>
      ) : null}
    </View>
  );
});

export function CarIcon({ heading }: { heading: number }) {
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#60A5FA',
        borderWidth: 3,
        borderColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: `${heading}deg` }],
      }}
    >
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <SvgPolygon points="12 3 20 19 12 15 4 19 12 3" fill="#F1F5F9" />
      </Svg>
    </View>
  );
}

export function DestinationPin() {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#131C2B',
        borderWidth: 2.5,
        borderColor: '#60A5FA',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth={2.2}>
        <Path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="#60A5FA" />
        <Line x1="4" y1="22" x2="4" y2="15" />
      </Svg>
    </View>
  );
}

const CALM_SLATE_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#141e2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a8c4' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111926' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#223148' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2e4260' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#132b45' }] },
];

export default function LiveMap({
  markers,
  selectedId,
  onSelect,
  gauges = [],
  selectedGaugeId = null,
  onSelectGauge,
  creeks = [],
  user,
  center,
  focusKey,
  focus,
  zoomStep,
  routes = [],
  polygons = [],
  car,
  followCar,
  onUserCameraMove,
  destination,
  fit,
  fitKey,
  style,
}: LiveMapProps) {
  const ref = useRef<MapView>(null);
  const initial: Region = { latitude: center.lat, longitude: center.lon, latitudeDelta: 0.22, longitudeDelta: 0.22 };
  const [region, setRegion] = useState<Region>(initial);
  const regionRef = useRef<Region>(initial);
  const prevFocusKey = useRef(focusKey);
  const prevZoomSeq = useRef(zoomStep?.seq ?? 0);
  const lastPanMsRef = useRef(0);

  // Viewport-culled markers for native MapView so 2,000+ crossings remain 60fps:
  const visibleMarkers = useMemo(() => {
    const latMin = region.latitude - region.latitudeDelta * 0.75;
    const latMax = region.latitude + region.latitudeDelta * 0.75;
    const lonMin = region.longitude - region.longitudeDelta * 0.75;
    const lonMax = region.longitude + region.longitudeDelta * 0.75;
    const priority: MapMarker[] = [];
    const background: MapMarker[] = [];
    for (const m of markers) {
      if (m.state !== null || m.monitored || m.id === selectedId) {
        priority.push(m);
      } else if (m.lat >= latMin && m.lat <= latMax && m.lon >= lonMin && m.lon <= lonMax) {
        background.push(m);
      }
    }
    if (background.length > 240) {
      const step = Math.ceil(background.length / 240);
      return [...priority, ...background.filter((_, idx) => idx % step === 0)];
    }
    return [...priority, ...background];
  }, [markers, region, selectedId]);

  useEffect(() => {
    if (!fit?.length) return;
    ref.current?.fitToCoordinates(
      fit.map((p) => ({ latitude: p.lat, longitude: p.lon })),
      { edgePadding: { top: 220, right: 40, bottom: 320, left: 40 }, animated: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  useEffect(() => {
    if (focusKey === prevFocusKey.current) return;
    prevFocusKey.current = focusKey;
    const target = focus ?? center;
    const curDelta = regionRef.current.latitudeDelta;
    const nextDelta = focus ? Math.min(curDelta, 0.045) : 0.16;
    const next: Region = {
      latitude: target.lat,
      longitude: target.lon,
      latitudeDelta: nextDelta,
      longitudeDelta: nextDelta,
    };
    regionRef.current = next;
    ref.current?.animateToRegion(next, 380);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  useEffect(() => {
    if (!zoomStep || zoomStep.seq === prevZoomSeq.current) return;
    prevZoomSeq.current = zoomStep.seq;
    const cur = regionRef.current;
    const factor = zoomStep.delta > 0 ? 0.5 : 2.0;
    const centerLat = car && followCar ? car.lat : cur.latitude;
    const centerLon = car && followCar ? car.lon : cur.longitude;
    const next: Region = {
      latitude: centerLat,
      longitude: centerLon,
      latitudeDelta: Math.max(0.0015, Math.min(2.5, cur.latitudeDelta * factor)),
      longitudeDelta: Math.max(0.0015, Math.min(2.5, cur.longitudeDelta * factor)),
    };
    regionRef.current = next;
    lastPanMsRef.current = Date.now() + 900;
    setRegion(next);
    ref.current?.animateToRegion(next, 240);
  }, [zoomStep, car, followCar]);

  const carLat = car?.lat;
  const carLon = car?.lon;
  useEffect(() => {
    if (!followCar || carLat == null || carLon == null) return;
    const now = Date.now();
    if (now - lastPanMsRef.current < 950) return;
    const cur = regionRef.current;
    const dLat = Math.abs(carLat - cur.latitude);
    const dLon = Math.abs(carLon - cur.longitude);
    if (dLat > cur.latitudeDelta * 0.25 || dLon > cur.longitudeDelta * 0.25) {
      lastPanMsRef.current = now;
      const next: Region = {
        latitude: carLat,
        longitude: carLon,
        latitudeDelta: cur.latitudeDelta,
        longitudeDelta: cur.longitudeDelta,
      };
      regionRef.current = next;
      ref.current?.animateToRegion(next, 280);
    }
  }, [followCar, carLat, carLon]);

  return (
    <MapView
      ref={ref}
      style={[{ flex: 1 }, style]}
      initialRegion={initial}
      zoomEnabled
      zoomTapEnabled
      scrollEnabled
      showsUserLocation={!!user}
      showsMyLocationButton={false}
      showsPointsOfInterests={false}
      showsCompass={false}
      toolbarEnabled={false}
      userInterfaceStyle="dark"
      customMapStyle={CALM_SLATE_MAP_STYLE}
      rotateEnabled={false}
      pitchEnabled={false}
      onPanDrag={() => onUserCameraMove?.()}
      onRegionChangeComplete={(r) => {
        regionRef.current = r;
        setRegion(r);
      }}
      onPress={(e) => {
        if (e.nativeEvent.action !== 'marker-press') {
          onSelect(null);
          onSelectGauge?.(null);
        }
      }}
    >
      {creeks.map((c) => (
        <Polyline
          key={c.id}
          coordinates={c.coords.map((pt) => ({ latitude: pt.lat, longitude: pt.lon }))}
          strokeColor="rgba(56, 189, 248, 0.35)"
          strokeWidth={2}
          zIndex={0}
        />
      ))}
      {polygons.flatMap((p) =>
        p.rings.map((ring, i) => (
          <Polygon
            key={`${p.id}-${i}`}
            coordinates={ring.map(([lat, lon]) => ({ latitude: lat, longitude: lon }))}
            strokeColor={p.color}
            fillColor={`${p.color}22`}
            strokeWidth={2}
          />
        )),
      )}
      {routes.map((r) => (
        <Polyline
          key={r.id}
          coordinates={r.coords.map((c) => ({ latitude: c.lat, longitude: c.lon }))}
          strokeColor={r.color}
          strokeWidth={r.width ?? 6}
          lineDashPattern={r.dashed ? [10, 8] : undefined}
          zIndex={r.dashed ? 1 : 2}
        />
      ))}
      {visibleMarkers.map((m) => (
        <Marker
          key={`${m.id}-${m.state ?? 'none'}-${m.id === selectedId ? 's' : ''}`}
          identifier={m.id}
          coordinate={{ latitude: m.lat, longitude: m.lon }}
          anchor={{ x: 0.5, y: 0.5 }}
          onPress={() => onSelect(m.id)}
          tracksViewChanges={m.id === selectedId}
          zIndex={m.id === selectedId ? 1000 : m.state ? 10 + (m.state === 'avoid' || m.state === 'closed' ? 5 : 0) : 1}
          accessibilityLabel={m.label}
        >
          <Pin state={m.state} monitored={m.monitored} selected={m.id === selectedId} />
        </Marker>
      ))}
      {gauges.map((g) => (
        <Marker
          key={`g-${g.id}-${g.stageFt ?? 'x'}-${g.id === selectedGaugeId ? 's' : ''}`}
          identifier={g.id}
          coordinate={{ latitude: g.lat, longitude: g.lon }}
          anchor={{ x: 0.5, y: 0.5 }}
          onPress={() => onSelectGauge?.(g.id)}
          tracksViewChanges={g.id === selectedGaugeId}
          zIndex={g.id === selectedGaugeId ? 950 : 8}
          accessibilityLabel={`${g.name}`}
        >
          <GaugePin stageFt={g.stageFt} selected={g.id === selectedGaugeId} />
        </Marker>
      ))}
      {destination ? (
        <Marker coordinate={{ latitude: destination.lat, longitude: destination.lon }} anchor={{ x: 0.5, y: 0.5 }} zIndex={1500}>
          <DestinationPin />
        </Marker>
      ) : null}
      {car ? (
        <Marker coordinate={{ latitude: car.lat, longitude: car.lon }} anchor={{ x: 0.5, y: 0.5 }} zIndex={2000} tracksViewChanges>
          <CarIcon heading={car.heading} />
        </Marker>
      ) : null}
    </MapView>
  );
}
