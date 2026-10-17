import Constants from 'expo-constants';
import { AppText } from '@/components/fordcast/UI';
import { usePreferences } from '@/lib/preferences';
import type { Crossing } from '@/lib/data';
export type MapProps = { features: Crossing[]; onSelect: (id: string) => void };
export default function MapSurface(props: MapProps) {
  const { t } = usePreferences();
  if (Constants.appOwnership === 'expo') return <AppText>{t('map.failed')}</AppText>;
  // Keep the native adapter out of the Expo Go evaluation path.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const NativeMap = require('./NativeMap').default as typeof import('./NativeMap').default;
  return <NativeMap {...props} />;
}
