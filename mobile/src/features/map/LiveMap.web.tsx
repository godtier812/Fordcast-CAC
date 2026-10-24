/**
 * Real street map for the web build (Leaflet + Esri dark basemap from OpenStreetMap data).
 * Uses an HTML5 Canvas renderer for the ~1,900 regional background crossings + creek flowlines
 * so 2,000+ crossings pan/zoom at 60fps, while keeping crisp DOM badges for monitored/hazard pins and sensors.
 */
import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import L from 'leaflet';
import { LOCKED_STATE_HEX, STATE_TOKENS, type CrossingStateKey } from '@/theme/tokens';
import type { LiveMapProps, MapGauge, MapMarker } from './LiveMap';

export type { LiveMapProps, MapMarker, MapGauge, MapCreek, MapRoute, MapPolygon, MapCar } from './LiveMap';

const CSS_ID = 'leaflet-css';
function ensureCss() {
  if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return;
  const link = document.createElement('link');
  link.id = CSS_ID;
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
  const style = document.createElement('style');
  style.textContent = `
    .fc-pin { background: transparent; border: 0; }
    .leaflet-container { background: #0f1724; font-family: Inter_400Regular, system-ui, sans-serif; touch-action: none; }
    .leaflet-control-attribution { background: rgba(19,28,43,.78) !important; color: #72849e !important; font-size: 10px !important; }
    .leaflet-control-attribution a { color: #a8b8cd !important; }
    .fc-tooltip { background: rgba(19,28,43,0.95) !important; color: #f1f5f9 !important; border: 1px solid #2e3f59 !important; border-radius: 8px !important; padding: 4px 8px !important; font: 600 11.5px Inter_600SemiBold, system-ui, sans-serif !important; box-shadow: 0 4px 12px rgba(0,0,0,0.35) !important; }
    .fc-tooltip::before { display: none !important; }
    @keyframes fcPulse { 0% { box-shadow: 0 0 0 0 rgba(255,84,112,.55);} 70% { box-shadow: 0 0 0 13px rgba(255,84,112,0);} 100% { box-shadow: 0 0 0 0 rgba(255,84,112,0);} }
    @keyframes fcUser { 0% { box-shadow: 0 0 0 0 rgba(96,165,250,.55);} 70% { box-shadow: 0 0 0 15px rgba(96,165,250,0);} 100% { box-shadow: 0 0 0 0 rgba(96,165,250,0);} }
  `;
  document.head.appendChild(style);
}

const GLYPH: Record<CrossingStateKey, string> = { no_rise: '–', watch: '!', avoid: '!', closed: '✕', unknown: '?' };

function pinHtml(m: MapMarker, selected: boolean): { html: string; size: number } {
  if (!m.state) {
    const s = selected ? 20 : 12;
    return {
      size: s,
      html: `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${selected ? '#60A5FA' : '#526D96'};border:${selected ? 3 : 1.5}px solid ${selected ? '#F1F5F9' : '#CBD5E1'};box-shadow:0 2px 8px rgba(0,0,0,.4);box-sizing:border-box"></div>`,
    };
  }
  const size = (selected ? 34 : 26) - (m.monitored ? 0 : 4);
  const color = LOCKED_STATE_HEX[m.state];
  const filled = m.state === 'avoid' || m.state === 'closed';
  const bg = filled ? color : STATE_TOKENS[m.state].darkBg;
  const fg = filled ? '#131C2B' : color;
  const border = `${selected ? 3 : 2}px ${m.state === 'unknown' ? 'dashed' : 'solid'} ${selected ? '#F1F5F9' : color}`;
  const pulse = filled ? 'animation:fcPulse 1.6s infinite;' : '';
  const base = `display:flex;align-items:center;justify-content:center;font:900 ${selected ? 17 : 14}px system-ui;color:${fg};background:${bg};border:${border};box-sizing:border-box;box-shadow:0 2px 8px rgba(0,0,0,.4);${pulse}`;
  if (m.state === 'watch') {
    const d = Math.round(size * 0.8);
    return {
      size,
      html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center"><div style="${base}width:${d}px;height:${d}px;border-radius:4px;transform:rotate(45deg)"><span style="transform:rotate(-45deg)">${GLYPH.watch}</span></div></div>`,
    };
  }
  return { size, html: `<div style="${base}width:${size}px;height:${size}px;border-radius:${filled ? '6px' : '50%'}">${GLYPH[m.state]}</div>` };
}

function gaugeHtml(g: MapGauge, selected: boolean): { html: string; width: number; height: number } {
  const stageText = g.stageFt != null ? `<span>${g.stageFt.toFixed(1)}ft</span>` : '';
  const width = g.stageFt != null ? 54 : 24;
  const height = 22;
  const bg = selected ? '#0284C7' : '#13283F';
  const border = selected ? '2px solid #F1F5F9' : '1.5px solid #38BDF8';
  const diamondSvg = `<svg width="9" height="9" viewBox="0 0 24 24"><polygon points="12 2 22 12 12 22 2 12 12 2" fill="#38BDF8"/></svg>`;
  return {
    width,
    height,
    html: `<div style="height:${height}px;padding:0 6px;border-radius:8px;background:${bg};border:${border};color:#F1F5F9;display:inline-flex;align-items:center;justify-content:center;gap:4px;font:700 10.5px system-ui;font-variant-numeric:tabular-nums;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.45);box-sizing:border-box">${diamondSvg}${stageText}</div>`,
  };
}

const DEST_PIN_HTML = `<div style="width:28px;height:28px;border-radius:50%;background:#131C2B;border:2.5px solid #60A5FA;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.5);box-sizing:border-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="#60A5FA"/><line x1="4" y1="22" x2="4" y2="15"/></svg></div>`;

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
}: LiveMapProps) {
  const hostRef = useRef<View>(null);
  const mapRef = useRef<L.Map | null>(null);
  const canvasRef = useRef<L.Canvas | null>(null);
  const creekLayerRef = useRef<L.LayerGroup | null>(null);
  const bgLayerRef = useRef<L.LayerGroup | null>(null);
  const fgLayerRef = useRef<L.LayerGroup | null>(null);
  const gaugeLayerRef = useRef<L.LayerGroup | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  const userRef = useRef<L.Marker | null>(null);
  const carRef = useRef<L.Marker | null>(null);
  const prevFocusKey = useRef(focusKey);
  const prevZoomSeq = useRef(zoomStep?.seq ?? 0);
  const isZoomingRef = useRef(false);
  const lastPanMsRef = useRef(0);
  const onSelectRef = useRef(onSelect);
  const onSelectGaugeRef = useRef(onSelectGauge);
  const onUserCameraMoveRef = useRef(onUserCameraMove);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onSelectGaugeRef.current = onSelectGauge;
    onUserCameraMoveRef.current = onUserCameraMove;
  });

  useEffect(() => {
    ensureCss();
    const node = hostRef.current as unknown as HTMLElement | null;
    if (!node || mapRef.current) return;
    const canvas = L.canvas({ padding: 0.5 });
    canvasRef.current = canvas;
    const map = L.map(node, {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
      minZoom: 7,
      maxZoom: 19,
      zoomSnap: 0.5,
      zoomDelta: 1,
      wheelPxPerZoomLevel: 60,
      wheelDebounceTime: 40,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
    }).setView([center.lat, center.lon], 11.5);

    const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
    L.tileLayer(`${esri}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      maxNativeZoom: 16,
      attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors · USGS · NWS · ATXfloods',
    }).addTo(map);
    L.tileLayer(`${esri}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      maxNativeZoom: 16,
    }).addTo(map);
    map.on('click', () => {
      onSelectRef.current(null);
      onSelectGaugeRef.current?.(null);
    });
    map.on('zoomstart', () => {
      isZoomingRef.current = true;
    });
    map.on('zoomend', () => {
      isZoomingRef.current = false;
      lastPanMsRef.current = Date.now();
    });
    map.on('dragstart', () => {
      lastPanMsRef.current = Date.now() + 2000;
      onUserCameraMoveRef.current?.();
    });
    creekLayerRef.current = L.layerGroup().addTo(map);
    overlayRef.current = L.layerGroup().addTo(map);
    bgLayerRef.current = L.layerGroup().addTo(map);
    gaugeLayerRef.current = L.layerGroup().addTo(map);
    fgLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.invalidateSize()) : null;
    ro?.observe(node);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro?.disconnect();
      map.remove();
      mapRef.current = null;
      canvasRef.current = null;
      creekLayerRef.current = null;
      bgLayerRef.current = null;
      fgLayerRef.current = null;
      gaugeLayerRef.current = null;
      overlayRef.current = null;
      userRef.current = null;
      carRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Creek corridor flowlines (Canvas rendered).
  useEffect(() => {
    const layer = creekLayerRef.current;
    const renderer = canvasRef.current ?? undefined;
    if (!layer) return;
    layer.clearLayers();
    for (const c of creeks) {
      L.polyline(
        c.coords.map((pt) => [pt.lat, pt.lon] as [number, number]),
        {
          renderer,
          color: '#38BDF8',
          weight: 2,
          opacity: 0.32,
          dashArray: '4 4',
          interactive: false,
        },
      ).addTo(layer);
    }
  }, [creeks]);

  // Routes, warning polygons and destination beacon.
  useEffect(() => {
    const layer = overlayRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const p of polygons)
      for (const ring of p.rings)
        L.polygon(ring, { color: p.color, weight: 2, fillOpacity: 0.12, interactive: false }).addTo(layer);
    for (const r of [...routes].sort((a, b) => Number(!!b.dashed) - Number(!!a.dashed))) {
      if (!r.dashed)
        L.polyline(
          r.coords.map((c) => [c.lat, c.lon]),
          { color: '#131C2B', weight: (r.width ?? 6) + 4, opacity: 0.85, interactive: false },
        ).addTo(layer);
      L.polyline(
        r.coords.map((c) => [c.lat, c.lon]),
        {
          color: r.color,
          weight: r.width ?? 6,
          dashArray: r.dashed ? '10 8' : undefined,
          opacity: r.dashed ? 0.85 : 1,
          interactive: false,
        },
      ).addTo(layer);
    }
    if (destination) {
      L.marker([destination.lat, destination.lon], {
        icon: L.divIcon({
          className: 'fc-pin',
          html: DEST_PIN_HTML,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
        zIndexOffset: 1500,
        interactive: false,
      }).addTo(layer);
    }
  }, [routes, polygons, destination]);

  // Partition background vs foreground markers so background Canvas dots only rebuild when toggled.
  const { bgMarkers, fgMarkers } = useMemo(() => {
    const bg: MapMarker[] = [];
    const fg: MapMarker[] = [];
    for (const m of markers) {
      if (m.state !== null || m.monitored) fg.push(m);
      else bg.push(m);
    }
    return { bgMarkers: bg, fgMarkers: fg };
  }, [markers]);

  const bgCount = bgMarkers.length;
  useEffect(() => {
    const bgLayer = bgLayerRef.current;
    const renderer = canvasRef.current ?? undefined;
    if (!bgLayer) return;
    bgLayer.clearLayers();
    for (const m of bgMarkers) {
      const dot = L.circleMarker([m.lat, m.lon], {
        renderer,
        radius: 4.5,
        fillColor: '#5B76A3',
        fillOpacity: 0.88,
        color: '#CBD5E1',
        weight: 1.1,
      });
      dot.bindTooltip(m.label, { className: 'fc-tooltip', direction: 'top', offset: [0, -6] });
      dot.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRef.current(m.id);
      });
      dot.addTo(bgLayer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgCount]);

  // Crisp DOM badges for monitored/hazard/selected pins.
  useEffect(() => {
    const fgLayer = fgLayerRef.current;
    if (!fgLayer) return;
    fgLayer.clearLayers();

    const selectedBg = selectedId ? bgMarkers.find((m) => m.id === selectedId) : undefined;
    const combined = selectedBg ? [...fgMarkers, selectedBg] : fgMarkers;
    const ordered = [...combined].sort(
      (a, b) => Number(!!a.state) - Number(!!b.state) || Number(a.id === selectedId) - Number(b.id === selectedId),
    );
    for (const m of ordered) {
      const selected = m.id === selectedId;
      const { html, size } = pinHtml(m, selected);
      const marker = L.marker([m.lat, m.lon], {
        icon: L.divIcon({ className: 'fc-pin', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
        title: m.label,
        keyboard: true,
        zIndexOffset: selected ? 1000 : m.state ? (m.state === 'avoid' || m.state === 'closed' ? 600 : 400) : 100,
      });
      marker.bindTooltip(m.label, { className: 'fc-tooltip', direction: 'top', offset: [0, -size / 2] });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRef.current(m.id);
      });
      marker.addTo(fgLayer);
    }
  }, [fgMarkers, bgMarkers, selectedId]);

  // Stream Sensor markers.
  useEffect(() => {
    const layer = gaugeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const g of gauges) {
      const selected = g.id === selectedGaugeId;
      const { html, width, height } = gaugeHtml(g, selected);
      const label = `${g.name}${g.stageFt != null ? ` · ${g.stageFt.toFixed(1)} ft` : ''}`;
      const marker = L.marker([g.lat, g.lon], {
        icon: L.divIcon({ className: 'fc-pin', html, iconSize: [width, height], iconAnchor: [width / 2, height / 2] }),
        title: label,
        zIndexOffset: selected ? 950 : 300,
      });
      marker.bindTooltip(label, { className: 'fc-tooltip', direction: 'top', offset: [0, -12] });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectGaugeRef.current?.(g.id);
      });
      marker.addTo(layer);
    }
  }, [gauges, selectedGaugeId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!user) {
      userRef.current?.remove();
      userRef.current = null;
      return;
    }
    const icon = L.divIcon({
      className: 'fc-pin',
      html: '<div style="width:16px;height:16px;border-radius:50%;background:#60A5FA;border:3px solid #F1F5F9;animation:fcUser 2s infinite;box-sizing:border-box"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    if (!userRef.current) userRef.current = L.marker([user.lat, user.lon], { icon, zIndexOffset: 2000 }).addTo(map);
    else userRef.current.setLatLng([user.lat, user.lon]);
  }, [user]);

  // Moving car: updates DOM marker smoothly every 120ms, and only steps the camera when needed
  // so wheel/pinch/+/- zooming is NEVER interrupted during the demo!
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!car) {
      carRef.current?.remove();
      carRef.current = null;
      return;
    }
    const arrowSvg = `<svg width="15" height="15" viewBox="0 0 24 24"><polygon points="12 3 20 19 12 15 4 19 12 3" fill="#F1F5F9"/></svg>`;
    const html = `<div style="width:34px;height:34px;border-radius:50%;background:#60A5FA;border:3px solid #F1F5F9;display:flex;align-items:center;justify-content:center;transform:rotate(${car.heading}deg);box-shadow:0 4px 14px rgba(0,0,0,.5);box-sizing:border-box">${arrowSvg}</div>`;
    const icon = L.divIcon({ className: 'fc-pin', html, iconSize: [34, 34], iconAnchor: [17, 17] });
    if (!carRef.current)
      carRef.current = L.marker([car.lat, car.lon], { icon, zIndexOffset: 3000, interactive: false }).addTo(map);
    else {
      carRef.current.setLatLng([car.lat, car.lon]);
      carRef.current.setIcon(icon);
    }

    if (followCar && !isZoomingRef.current) {
      const now = Date.now();
      const zoom = map.getZoom();
      const pad = zoom >= 14.5 ? -0.32 : -0.22;
      const cooldown = zoom >= 14.5 ? 320 : 850;
      const innerBounds = map.getBounds().pad(pad);
      if (!innerBounds.contains([car.lat, car.lon]) && now - lastPanMsRef.current > cooldown) {
        lastPanMsRef.current = now;
        map.panTo([car.lat, car.lon], { animate: true, duration: 0.24 });
      }
    }
  }, [car, followCar]);

  // Intentional re-center / pin focus (never zooms out if the user is already zoomed in closer).
  useEffect(() => {
    if (focusKey === prevFocusKey.current) return;
    prevFocusKey.current = focusKey;
    const map = mapRef.current;
    if (!map) return;
    const target = focus ?? center;
    const nextZoom = focus ? Math.max(map.getZoom(), 14.5) : Math.max(map.getZoom(), 12);
    lastPanMsRef.current = Date.now();
    map.setView([target.lat, target.lon], nextZoom, { animate: true, duration: 0.35 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  // Explicit + / - zoom buttons (centers on the moving car if followCar is active!).
  useEffect(() => {
    if (!zoomStep || zoomStep.seq === prevZoomSeq.current) return;
    prevZoomSeq.current = zoomStep.seq;
    const map = mapRef.current;
    if (!map) return;
    const next = Math.max(7, Math.min(19, map.getZoom() + zoomStep.delta));
    lastPanMsRef.current = Date.now() - 500;
    if (car && followCar) {
      map.setView([car.lat, car.lon], next, { animate: true });
    } else {
      map.setZoom(next, { animate: true });
    }
  }, [zoomStep, car, followCar]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fit?.length) return;
    const narrow = (hostRef.current as unknown as HTMLElement | null)?.clientWidth ?? 800;
    lastPanMsRef.current = Date.now() + 900;
    map.fitBounds(L.latLngBounds(fit.map((p) => [p.lat, p.lon] as [number, number])), {
      paddingTopLeft: [40, narrow < 600 ? 180 : 40],
      paddingBottomRight: [40, narrow < 600 ? 280 : 40],
      maxZoom: 16,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  return <View ref={hostRef} style={{ flex: 1, minHeight: 200 }} />;
}
