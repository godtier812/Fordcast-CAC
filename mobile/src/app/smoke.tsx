// mobile/src/app/smoke.tsx — Day 1 go/no-go smoke test (02 §9.10). TEMPORARY: deleted before the UI freeze.
// Proves the risky chain on the iPhone: free signing → MapLibre → local notification on the Lock Screen →
// audible speech → haptic → Skia → Release build launches unplugged. No FordCast copy rules apply here beyond
// "simulated" labeling; real screens take every string from the locale files.
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Map as MapLibreMap } from '@maplibre/maplibre-react-native';   // aliased: a bare Map shadows the JS Map
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Canvas, Circle } from '@shopify/react-native-skia';
import { cancelAnimation, Easing, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const C = { bg: 'rgb(14,23,38)', card: 'rgb(28,41,64)', text: 'rgb(242,245,250)', dim: 'rgb(180,191,208)', water: 'rgb(43,217,217)' };
const LINES = {
  en: 'Avoid Williamson Creek at Jones Road. Flooding likely soon. Take another route.',
  es: 'Evite Williamson Creek en Jones Road. Inundación probable pronto. Tome otra ruta.',
};

// Foreground banners stay visible so S3 can also be checked with the app open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export default function Smoke() {
  const [status, setStatus] = useState('Run S2–S6 in order. Results go in docs/decisions/verifications.md.');
  const [spinning, setSpinning] = useState(true);
  const r = useSharedValue(16);

  useEffect(() => {
    if (spinning) r.value = withRepeat(withTiming(36, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    else cancelAnimation(r);
  }, [spinning, r]);

  const notifyIn8s = async () => {
    const perm = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    if (!perm.granted) { setStatus('Notifications are off: Settings → Notifications → FordCast → Allow.'); return; }
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Smoke test', subtitle: 'Simulated storm · demo data', body: 'S3: tap this to come back to FordCast.',
        sound: 'default', interruptionLevel: 'active' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 8 },
    });
    setStatus('Scheduled. Lock the phone now; the banner should land in about 8 s.');
  };

  const speak = async (lang: 'en' | 'es') => {
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
    Speech.speak(LINES[lang], { language: lang === 'en' ? 'en-US' : 'es-US', useApplicationAudioSession: true });
    setStatus(`Speaking (${lang}). S4: try it with the Ring/Silent switch off, then on.`);
  };

  const haptic = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setStatus('S5: you should have felt an Error haptic.');
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.map}>
        <MapLibreMap style={{ flex: 1 }} mapStyle="https://tiles.openfreemap.org/styles/dark">
          <Camera initialViewState={{ center: [-97.79, 30.22], zoom: 11 }} />
        </MapLibreMap>
      </View>
      <ScrollView contentContainerStyle={s.list}>
        <Text style={s.title}>FordCast · Day 1 smoke test</Text>
        <Text style={s.status}>{status}</Text>
        <Btn label="S3 · Notify in 8 s" onPress={notifyIn8s} />
        <View style={s.row}>
          <Btn label="S4 · Speak EN" onPress={() => speak('en')} flex />
          <Btn label="S4 · Speak ES" onPress={() => speak('es')} flex />
        </View>
        <Btn label="S5 · Haptic (Error)" onPress={haptic} />
        <View style={s.row}>
          <Btn label={spinning ? 'S6 · Stop Skia circle' : 'S6 · Start Skia circle'} onPress={() => setSpinning((v) => !v)} flex />
          <Canvas style={s.canvas}><Circle cx={40} cy={40} r={r} color={C.water} /></Canvas>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Btn({ label, onPress, flex }: { label: string; onPress: () => void; flex?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => [s.btn, flex && { flex: 1 }, pressed && { opacity: 0.7 }]}>
      <Text style={s.btnText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  map: { height: '45%' },
  list: { padding: 16, gap: 12 },
  title: { color: C.text, fontSize: 20, fontWeight: '600' },
  status: { color: C.dim, fontSize: 15 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  btn: { minHeight: 52, borderRadius: 26, backgroundColor: C.card, justifyContent: 'center', paddingHorizontal: 16 },
  btnText: { color: C.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  canvas: { width: 80, height: 80 },
});
