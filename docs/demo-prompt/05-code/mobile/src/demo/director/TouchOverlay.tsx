// mobile/src/demo/director/TouchOverlay.tsx — "show touches" for recordings (Director toggle). Observes touches in the
// CAPTURE phase and returns false, so every touch still reaches the app. 44 pt ring, 80 ms in, 300 ms fade.
import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

type Dot = { id: number; x: number; y: number };
let seq = 0;
export function TouchOverlay({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [dots, setDots] = useState<Dot[]>([]);
  const add = (e: GestureResponderEvent) => {
    if (!enabled) return false;
    const { pageX: x, pageY: y } = e.nativeEvent; const id = ++seq;
    setDots((d) => [...d.slice(-4), { id, x, y }]);
    setTimeout(() => setDots((d) => d.filter((p) => p.id !== id)), 380);
    return false;                                                    // never become the responder
  };
  return (
    <View style={{ flex: 1 }} onStartShouldSetResponderCapture={add} onMoveShouldSetResponderCapture={() => false}>
      {children}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {dots.map((p) => (
          <Animated.View key={p.id} entering={FadeIn.duration(80)} exiting={FadeOut.duration(300)}
            style={{ position: 'absolute', left: p.x - 22, top: p.y - 22, width: 44, height: 44, borderRadius: 22,
                     backgroundColor: 'rgba(242,245,250,0.18)', borderWidth: 2, borderColor: 'rgba(242,245,250,0.9)' }} />
        ))}
      </View>
    </View>
  );
}
