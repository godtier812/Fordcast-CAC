import type { PropsWithChildren } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { theme as c } from '@/lib/theme';
import { usePreferences } from '@/lib/preferences';
export function AppText({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.body, style]} />;
}
export function Title({ children }: PropsWithChildren) {
  return (
    <AppText accessibilityRole="header" style={styles.title}>
      {children}
    </AppText>
  );
}
export function Eyebrow({ children, color = c.subtle }: PropsWithChildren<{ color?: string }>) {
  return <AppText style={[styles.eyebrow, { color }]}>{children}</AppText>;
}
export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <AppText
        style={{
          color: secondary ? c.text : c.bg,
          fontFamily: 'Inter_600SemiBold',
          textAlign: 'center',
        }}
      >
        {title}
      </AppText>
    </Pressable>
  );
}
export function Page({ children }: PropsWithChildren) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Footer() {
  const { t } = usePreferences();
  return <AppText style={styles.footer}>{t('disclaimer')}</AppText>;
}
export function Dip({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}>
      <Path
        d="M6 13H17L24 29L31 13H42"
        stroke={c.text}
        strokeWidth={3}
        fill="none"
        strokeLinejoin="round"
      />
      <Path
        d="M5 34C12 29 17 39 24 34S36 29 43 34"
        stroke={c.water}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
export type State = 'no_rise' | 'watch' | 'avoid' | 'closed' | 'unknown';
export function StatusGlyph({ state, size = 36 }: { state: State; size?: number }) {
  const color =
    state === 'watch'
      ? c.watch
      : ['avoid', 'closed'].includes(state)
        ? c.avoid
        : state === 'unknown'
          ? c.unknown
          : c.subtle;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
      {state === 'unknown' || state === 'no_rise' ? (
        <Circle
          cx={20}
          cy={20}
          r={16}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={state === 'unknown' ? '4 4' : undefined}
        />
      ) : (
        <Path
          d={state === 'watch' ? 'M20 3L38 35H2Z' : 'M13 3H27L37 13V27L27 37H13L3 27V13Z'}
          stroke={color}
          fill={state === 'watch' ? c.watch : '#C62828'}
          strokeWidth={2}
        />
      )}
      {state === 'unknown' ? (
        <Path
          d="M15 15C15 8 28 10 25 17C24 20 20 18 20 24M20 28V29"
          stroke={color}
          strokeWidth={2.5}
          fill="none"
        />
      ) : state !== 'no_rise' ? (
        <>
          <Line
            x1={20}
            y1={13}
            x2={20}
            y2={23}
            stroke={state === 'watch' ? c.bg : c.text}
            strokeWidth={3}
          />
          <Circle cx={20} cy={29} r={1.7} fill={state === 'watch' ? c.bg : c.text} />
          {state === 'closed' && (
            <>
              <Line x1={6} y1={25} x2={14} y2={33} stroke={c.text} strokeWidth={2} />
              <Line x1={26} y1={7} x2={34} y2={15} stroke={c.text} strokeWidth={2} />
            </>
          )}
        </>
      ) : null}
    </Svg>
  );
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  page: {
    padding: 24,
    gap: 22,
    paddingBottom: 44,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  body: { color: c.text, fontSize: 16, lineHeight: 25, fontFamily: 'Inter_400Regular' },
  title: { fontSize: 36, lineHeight: 42, letterSpacing: -1.4, fontFamily: 'Inter_600SemiBold' },
  eyebrow: { fontSize: 11, letterSpacing: 2.1, lineHeight: 18, fontFamily: 'Inter_600SemiBold' },
  card: {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    gap: 12,
  },
  button: {
    minHeight: 52,
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 30,
    backgroundColor: c.text,
  },
  secondary: { backgroundColor: c.raised, borderWidth: 1, borderColor: c.border },
  footer: { color: c.subtle, fontSize: 12, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  muted: { color: c.muted },
  heading: { fontSize: 22, lineHeight: 29, fontFamily: 'Inter_600SemiBold' },
});
