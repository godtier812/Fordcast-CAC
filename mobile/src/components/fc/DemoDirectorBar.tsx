import { useRef } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/fordcast/UI';
import { ActionButton, Panel } from '@/components/fc/Kit';
import type { useTripDemo } from '@/features/demo/useTripDemo';
import { useMonitor } from '@/lib/monitor-context';
import { usePreferences } from '@/lib/preferences';

export default function DemoDirectorBar({
  trip,
  onClose,
}: {
  trip: ReturnType<typeof useTripDemo>;
  onClose?: () => void;
}) {
  const { t } = usePreferences();
  const m = useMonitor();
  const busyRef = useRef(false);

  const handleReset = () => {
    if (busyRef.current || m.routeBusy) return;
    busyRef.current = true;
    try {
      trip.stop();
      m.clearRoute();
      m.dismissBanner();
      m.setMode('live');
      m.setHomeTab('route');
    } finally {
      busyRef.current = false;
    }
  };

  return (
    <Panel style={{ borderColor: '#9B8AFB', padding: 10, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <AppText style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#C4B5FD', letterSpacing: 0.5 }}>
          {`${t('director.title')} · ${m.mode.toUpperCase()} (${m.drill.stormId})`}
        </AppText>
        {onClose ? (
          <ActionButton compact kind="secondary" label={t('common.close')} onPress={onClose} />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <ActionButton
          compact
          kind="secondary"
          icon="replay"
          label={t('director.reset_take')}
          onPress={handleReset}
        />
        <ActionButton
          compact
          kind="secondary"
          icon="car"
          label={t('director.barton_demo')}
          onPress={() => {
            if (busyRef.current) return;
            trip.stop();
            m.requestTripDemo('memorial-day-2015');
          }}
        />
        {trip.active ? (
          <ActionButton compact kind="secondary" label={t('trip.stop')} onPress={trip.stop} />
        ) : null}
      </View>
    </Panel>
  );
}
