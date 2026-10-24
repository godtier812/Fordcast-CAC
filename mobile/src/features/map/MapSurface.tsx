import MapSurfaceWeb from './MapSurface.web';
import type { Crossing, ReplayDocument } from '@/lib/data';

export type MapProps = {
  features: Crossing[];
  onSelect: (id: string) => void;
  replayOverride?: ReplayDocument;
  simTOverride?: number;
  selectedCrossingId?: string;
};

/**
 * Uses the pure `react-native-svg` tactical watershed map on all platforms (iOS, Android, Web)
 * so the Science Lab cockpit works inside Expo Go without requiring custom MapLibre native modules.
 */
export default function MapSurface(props: MapProps) {
  return <MapSurfaceWeb {...props} />;
}
