import MapSurfaceWeb from './MapSurface.web';
import type { MapProps } from './MapSurface';

export default function NativeMap(props: MapProps) {
  return <MapSurfaceWeb {...props} />;
}
