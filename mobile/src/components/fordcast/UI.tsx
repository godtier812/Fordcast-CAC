import type { PropsWithChildren } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { theme as c } from '@/lib/theme';
import { usePreferences } from '@/lib/preferences';
import { StateGlyphSvg } from '@/components/StateBadge';

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

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({
  label,
  color = c.water,
  bg = c.waterDim,
}: {
  label: string;
  color?: string;
  bg?: string;
}) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <AppText
        style={{
          color,
          fontSize: 11,
          lineHeight: 16,
          letterSpacing: 0.6,
          fontFamily: 'Inter_600SemiBold',
        }}
      >
        {label}
      </AppText>
    </View>
  );
}

export function Chip({
  title,
  active = false,
  accentColor = c.water,
  onPress,
}: {
  title: string;
  active?: boolean;
  accentColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && {
          backgroundColor: accentColor === c.replay ? c.replayDim : c.waterDim,
          borderColor: accentColor,
        },
        pressed && { opacity: 0.75 },
      ]}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: active ? accentColor : c.subtle,
          opacity: active ? 1 : 0.45,
        }}
      />
      <AppText
        style={{
          color: active ? c.text : c.muted,
          fontSize: 13,
          lineHeight: 18,
          fontFamily: 'Inter_600SemiBold',
        }}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  compact = false,
  accentColor,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  compact?: boolean;
  accentColor?: string;
}) {
  const primaryBg = accentColor ?? c.water;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        !secondary && { backgroundColor: primaryBg, borderColor: primaryBg },
        secondary && styles.secondary,
        compact && styles.buttonCompact,
        disabled && { opacity: 0.38 },
        pressed && { opacity: 0.78, transform: [{ scale: 0.99 }] },
      ]}
    >
      <AppText
        style={{
          color: secondary ? c.text : c.bg,
          fontFamily: 'Inter_600SemiBold',
          fontSize: compact ? 13 : 15,
          lineHeight: compact ? 18 : 20,
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
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: c.border,
        paddingTop: 16,
        marginTop: 6,
      }}
    >
      <AppText style={styles.footer}>{t('disclaimer')}</AppText>
    </View>
  );
}

export function Dip({ size = 42 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect
        x={2}
        y={2}
        width={44}
        height={44}
        rx={12}
        fill={c.surface}
        stroke={c.borderBright}
        strokeWidth={1.5}
      />
      <Path
        d="M9 15H17.5L24 28.5L30.5 15H39"
        stroke={c.text}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 34.5C13.5 30.5 18 38.5 24 34.5S34.5 30.5 40 34.5"
        stroke={c.water}
        strokeWidth={2.8}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export type State = 'no_rise' | 'watch' | 'avoid' | 'closed' | 'unknown';

export function StatusGlyph({ state, size = 24 }: { state: State; size?: number }) {
  return <StateGlyphSvg state={state} size={size} />;
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  page: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 20,
    paddingBottom: 56,
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
  },
  body: { color: c.text, fontSize: 15, lineHeight: 23, fontFamily: 'Inter_400Regular' },
  title: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.9,
    fontFamily: 'Inter_600SemiBold',
    color: c.text,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.8,
    lineHeight: 16,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  button: {
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.water,
    backgroundColor: c.water,
  },
  buttonCompact: {
    minHeight: 36,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 10,
  },
  secondary: {
    backgroundColor: c.raised,
    borderWidth: 1,
    borderColor: c.borderBright,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 36,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  footer: { color: c.subtle, fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  muted: { color: c.muted },
  heading: { fontSize: 19, lineHeight: 25, fontFamily: 'Inter_600SemiBold', color: c.text },
});
