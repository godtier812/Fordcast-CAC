import { useState } from 'react';
import { View } from 'react-native';
import { Map, Camera, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import type { FeatureCollection, Point } from 'geojson';
import type { MapProps } from './MapSurface';
import { AppText } from '@/components/fordcast/UI';
import { usePreferences } from '@/lib/preferences';
import { theme } from '@/lib/theme';
export default function NativeMap({ features, onSelect }: MapProps) {
  const { t } = usePreferences();
  const [failed, setFailed] = useState(false);
  const data = { type: 'FeatureCollection', features } as FeatureCollection<Point>;
  const fallback = {
    version: 8 as const,
    sources: {},
    layers: [
      { id: 'background', type: 'background' as const, paint: { 'background-color': theme.land } },
    ],
  };
  return (
    <View style={{ height: 340, borderRadius: 22, overflow: 'hidden' }}>
      <Map
        style={{ flex: 1 }}
        mapStyle={failed ? fallback : require('../../../assets/map/fordcast-night.json')}
        attribution
        onDidFailLoadingMap={() => setFailed(true)}
        touchPitch={false}
        touchRotate={false}
      >
        <Camera initialViewState={{ center: [-97.7431, 30.2672], zoom: 10 }} />
        <GeoJSONSource
          id="crossings"
          data={data}
          onPress={(event) => {
            const id: unknown = event.nativeEvent.features[0]?.properties?.id;
            if (typeof id === 'string') onSelect(id);
          }}
        >
          <Layer
            id="unknown-ring"
            type="circle"
            paint={{
              'circle-radius': 8,
              'circle-color': theme.land,
              'circle-stroke-width': 2,
              'circle-stroke-color': theme.unknown,
            }}
          />
          <Layer
            id="unknown-label"
            type="symbol"
            layout={{ 'text-field': '?', 'text-size': 12, 'text-allow-overlap': true }}
            paint={{ 'text-color': theme.muted }}
          />
        </GeoJSONSource>
      </Map>
      {failed && <AppText style={{ padding: 10 }}>{t('map.failed')}</AppText>}
    </View>
  );
}
