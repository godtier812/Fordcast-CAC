/** Full scientific replay cockpit (hydrographs, latency curtain, LOSO scorecard) for judges. */
import CockpitScreen from '@/screens/CockpitScreen';
import { usePreferences } from '@/lib/preferences';

export default function Lab() {
  const { activeStormId, replayResetToken } = usePreferences();
  return (
    <CockpitScreen
      key={`lab:${activeStormId}:${replayResetToken}`}
      mode="replay"
      initialSelectedCrossingId="atx-19"
    />
  );
}
