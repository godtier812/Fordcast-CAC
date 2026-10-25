import { Text, View, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { usePreferences } from '@/lib/preferences';
import {
  LOCKED_STATE_HEX,
  STATE_TOKENS,
  TYPOGRAPHY,
  type CrossingStateKey,
  type ThemeMode,
} from '@/theme/tokens';

function AppText({ style, ...props }: TextProps) {
  return (
    <Text
      {...props}
      style={[{ color: '#F8FAFC', fontSize: 16, lineHeight: 22, fontFamily: 'Inter_400Regular' }, style]}
    />
  );
}

export type OpticalBadgeSize = 16 | 24 | 64 | number;

export const SHORT_STATE_KEYWORDS: Record<
  'en' | 'es',
  Record<CrossingStateKey, string>
> = {
  en: {
    no_rise: 'NO RISE',
    watch: 'WATCH',
    avoid: 'AVOID',
    closed: 'CLOSED',
    unknown: 'UNKNOWN',
  },
  es: {
    no_rise: 'SIN CRECIDA',
    watch: 'VIGILANCIA',
    avoid: 'EVITAR',
    closed: 'CERRADO',
    unknown: 'DESCONOCIDO',
  },
};

export function StateGlyphSvg({
  state,
  size = 24,
  testID,
}: {
  state: CrossingStateKey;
  size?: OpticalBadgeSize;
  testID?: string;
}) {
  const isCompact = size <= 16;
  const isHero = size >= 64;
  const strokeW = isCompact ? 2.2 : isHero ? 1.75 : 2.0;
  const hex = LOCKED_STATE_HEX[state];

  const svg = (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      testID={testID ?? `state-glyph-${state}`}
    >
      {state === 'no_rise' && (
        <>
          <Circle
            cx="12"
            cy="12"
            r="9.5"
            fill="#0A2E36"
            stroke="#2BD9D9"
            strokeWidth={strokeW}
          />
          <Path
            d="M8 12.5L10.8 15.3L16.2 9.5"
            stroke="#2BD9D9"
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      )}

      {state === 'watch' && (
        <>
          <Path
            d="M12 3L22 20H2L12 3Z"
            fill={isCompact ? '#F5A623' : '#332108'}
            stroke="#F5A623"
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M12 9V13.5"
            stroke={isCompact ? '#070B12' : '#F5A623'}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
          <Circle
            cx="12"
            cy="17"
            r="1.2"
            fill={isCompact ? '#070B12' : '#F5A623'}
          />
        </>
      )}

      {state === 'avoid' && (
        <>
          {isHero && (
            <Polygon
              points="7.8,1.2 16.2,1.2 22.8,7.8 22.8,16.2 16.2,22.8 7.8,22.8 1.2,16.2 1.2,7.8"
              fill="none"
              stroke="#FF5470"
              strokeOpacity={0.45}
              strokeWidth={1.1}
            />
          )}
          <Polygon
            points="8.2,2.5 15.8,2.5 21.5,8.2 21.5,15.8 15.8,21.5 8.2,21.5 2.5,15.8 2.5,8.2"
            fill="#380D1A"
            stroke="#FF5470"
            strokeWidth={strokeW}
            strokeLinejoin="round"
          />
          <Path
            d="M12 7.5V13.5"
            stroke="#FF5470"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <Circle cx="12" cy="17" r="1.4" fill="#FF5470" />
        </>
      )}

      {state === 'closed' && (
        <>
          <Polygon
            points="8.2,2.5 15.8,2.5 21.5,8.2 21.5,15.8 15.8,21.5 8.2,21.5 2.5,15.8 2.5,8.2"
            fill="#2A0812"
            stroke="#FF5470"
            strokeWidth={strokeW}
            strokeLinejoin="round"
          />
          <Path
            d="M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5"
            stroke="#FF5470"
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
          {!isCompact && (
            <Path
              d="M5 12H19"
              stroke="#FF5470"
              strokeWidth={strokeW}
              strokeLinecap="round"
            />
          )}
        </>
      )}

      {state === 'unknown' && (
        <>
          <Circle
            cx="12"
            cy="12"
            r="9.5"
            fill="#1A2232"
            stroke="#7A879C"
            strokeWidth={strokeW}
            strokeDasharray={isCompact ? '3.5, 2.5' : '4, 3'}
          />
          <Path
            d="M9.8 9.2C9.8 7.8 11 7 12.2 7C13.5 7 14.5 7.8 14.5 9.1C14.5 10.2 13.5 10.8 12.6 11.4C12.1 11.8 12 12.3 12 13"
            stroke="#7A879C"
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Circle cx="12" cy="16.5" r="1.2" fill="#7A879C" />
        </>
      )}
    </Svg>
  );

  if (isHero && state === 'no_rise') {
    return (
      <View
        style={{
          padding: 4,
          borderRadius: 6,
          backgroundColor: 'rgba(43, 217, 217, 0.20)',
          borderColor: hex,
        }}
      >
        {svg}
      </View>
    );
  }

  return svg;
}

export default function StateBadge({
  state,
  size = 24,
  unmonitored = false,
  compactMapPill = false,
  mode = 'dark',
  labelOverride,
  style,
  testID,
}: {
  state: CrossingStateKey;
  size?: 16 | 24 | 64;
  unmonitored?: boolean;
  compactMapPill?: boolean;
  mode?: ThemeMode;
  labelOverride?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { t, language } = usePreferences();
  const stateToken = STATE_TOKENS[state];
  const langKey = language === 'es' ? 'es' : 'en';

  const fullTranslatedText =
    labelOverride ??
    (unmonitored && state === 'unknown' ? t('state.unmonitored') : t(`state.${state}`));

  const shortText =
    unmonitored && state === 'unknown'
      ? fullTranslatedText
      : SHORT_STATE_KEYWORDS[langKey][state];

  const displayLabel = compactMapPill && size === 16 ? shortText : fullTranslatedText;

  if (compactMapPill && size === 16) {
    return (
      <View
        testID={testID ?? `state-badge-${state}`}
        accessibilityRole="text"
        accessibilityLabel={fullTranslatedText}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            height: 26,
            borderRadius: 13,
            paddingHorizontal: 6,
            backgroundColor: '#0B101B',
            borderWidth: 1.5,
            borderColor: stateToken.fg,
            gap: 5,
          },
          style,
        ]}
      >
        <View style={{ width: 16, height: 16, flexShrink: 0 }}>
          <StateGlyphSvg state={state} size={16} />
        </View>
        <AppText
          numberOfLines={2}
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontWeight: '700',
            fontSize: 11,
            lineHeight: 13,
            color: '#F8FAFC',
            flexShrink: 1,
          }}
        >
          {displayLabel}
        </AppText>
      </View>
    );
  }

  return (
    <View
      testID={testID ?? `state-badge-${state}`}
      accessibilityRole="text"
      accessibilityLabel={fullTranslatedText}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 32,
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: 12,
          backgroundColor: mode === 'light' ? stateToken.lightFill : stateToken.darkBg,
          borderWidth: 1.5,
          borderColor: stateToken.fg,
        },
        style,
      ]}
    >
      <View
        style={{
          width: size,
          height: size,
          marginRight: 8,
          flexShrink: 0,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: mode === 'light' ? 999 : 0,
          backgroundColor: mode === 'light' ? stateToken.bezel : 'transparent',
        }}
      >
        <StateGlyphSvg state={state} size={size} />
      </View>
      <View style={{ flex: 1, flexShrink: 1 }}>
        <AppText
          numberOfLines={2}
          style={[
            TYPOGRAPHY.badgeState,
            {
              color: mode === 'light' ? stateToken.lightText : stateToken.fg,
              flexShrink: 1,
            },
          ]}
        >
          {displayLabel}
        </AppText>
      </View>
    </View>
  );
}
