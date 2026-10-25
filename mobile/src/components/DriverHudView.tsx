import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { AppText } from '@/components/fordcast/UI';
import { StateGlyphSvg } from '@/components/StateBadge';
import { usePreferences } from '@/lib/preferences';
import {
  LOCKED_STATE_HEX,
  STATE_TOKENS,
  SURFACES,
  TYPOGRAPHY,
  type CrossingStateKey,
} from '@/theme/tokens';

function WaveformSvg({ active }: { active: boolean }) {
  const fill = active ? '#070B12' : '#94A3B8';
  return (
    <Svg width={20} height={18} viewBox="0 0 20 18">
      <Rect x={2} y={5} width={3.2} height={8} rx={1.6} fill={fill} />
      <Rect x={8.4} y={2} width={3.2} height={14} rx={1.6} fill={fill} />
      <Rect x={14.8} y={4} width={3.2} height={10} rx={1.6} fill={fill} />
    </Svg>
  );
}

export default function DriverHudView({
  crossingName,
  creekName,
  distanceLabel,
  badgeLabel,
  state,
  window,
  spokenText,
  sourceReason,
  muted,
  lockoutLocked = false,
  simMph = 0,
  onRepeatVoice,
  onToggleMute,
  onExitHud,
  onPrevCrossing,
  onNextCrossing,
  onToggleSpeedSim,
  onPassengerOverride,
}: {
  crossingName: string;
  creekName: string;
  distanceLabel: string;
  badgeLabel: string;
  state: CrossingStateKey;
  window?: [number, number] | null;
  spokenText: string;
  sourceReason?: string;
  muted: boolean;
  lockoutLocked?: boolean;
  simMph?: number;
  onRepeatVoice: () => void;
  onToggleMute: () => void;
  onExitHud: () => void;
  onPrevCrossing?: () => void;
  onNextCrossing?: () => void;
  onToggleSpeedSim?: () => void;
  onPassengerOverride?: () => void;
}) {
  const { t, language, setLanguage } = usePreferences();
  const { width, height } = useWindowDimensions();
  const compact = width < 420 || height < 740;
  const stateHex = LOCKED_STATE_HEX[state];
  const stateToken = STATE_TOKENS[state];
  const isZeroLowerBound = window != null && window[0] === 0;

  return (
    <View
      testID="driver-hud-view"
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: '#070B12',
        paddingVertical: compact ? 8 : 14,
      }}
    >
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1, gap: 12, paddingBottom: 12 }}>
      {/* ZONE 1: Top Status & Corridor Bar (12% Height, paddingHorizontal: 20) */}
      <View
        style={{
          paddingHorizontal: compact ? 14 : 20,
          flexDirection: compact ? 'column' : 'row',
          alignItems: compact ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <View
              style={{
                backgroundColor: '#131B2E',
                borderRadius: 6,
                borderWidth: 1,
                borderColor: stateHex,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <AppText
                style={{
                  fontSize: 10,
                  lineHeight: 14,
                  fontFamily: 'Inter_600SemiBold',
                  fontWeight: '700',
                  color: stateHex,
                }}
              >
                ● {badgeLabel}
              </AppText>
            </View>
            <AppText
              style={[
                TYPOGRAPHY.chartAxis,
                { color: SURFACES.dark.textSecondary, fontSize: 11, flexShrink: 1 },
              ]}
            >
              {t('drive.ahead', { dist: distanceLabel, creek: creekName })}
            </AppText>
          </View>
          <AppText
            numberOfLines={2}
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontWeight: '700',
              fontSize: 20,
              lineHeight: 26,
              color: '#E2E8F0',
            }}
          >
            {crossingName}
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          {onToggleSpeedSim && (
            <Pressable
              role="button"
              accessibilityRole="button"
              accessibilityLabel={t('drive.speed_sim', { mph: simMph })}
              onPress={onToggleSpeedSim}
              style={{
                height: 48,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: '#131B2E',
                borderWidth: 1,
                borderColor: '#23304D',
                justifyContent: 'center',
              }}
            >
              <AppText
                style={[
                  TYPOGRAPHY.chartAxis,
                  { color: '#94A3B8', fontWeight: '700', fontSize: 11 },
                ]}
              >
                {simMph} MPH
              </AppText>
            </Pressable>
          )}
          <Pressable
            role="button"
            accessibilityRole="button"
            accessibilityLabel={language === 'en' ? 'Español' : 'English'}
            onPress={() => setLanguage?.(language === 'en' ? 'es' : 'en')}
            style={{
              width: 68,
              height: 48,
              borderRadius: 12,
              backgroundColor: '#131B2E',
              borderWidth: 1.5,
              borderColor: '#5294FF',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <AppText
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontWeight: '700',
                fontSize: 12,
                lineHeight: 16,
                color: '#F8FAFC',
              }}
            >
              {language === 'en' ? 'EN | ES' : 'ES | EN'}
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* ZONE 2: Massive Triple-Redundancy Hero Card (48% Height) */}
      <View
        style={{
          flexGrow: 1,
          marginHorizontal: compact ? 14 : 20,
          borderRadius: 16,
          borderWidth: 3,
          borderColor: stateHex,
          backgroundColor: '#0B101B',
          paddingHorizontal: compact ? 16 : 22,
          paddingVertical: compact ? 16 : 22,
          justifyContent: 'center',
          alignItems: 'center',
          gap: compact ? 10 : 16,
        }}
      >
        <View
          style={{
            width: compact ? 60 : 96,
            height: compact ? 60 : 96,
            borderRadius: 48,
            backgroundColor: stateToken.darkBg,
            borderWidth: 3,
            borderColor: stateHex,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <StateGlyphSvg state={state} size={compact ? 40 : 64} />
        </View>

        <AppText
          adjustsFontSizeToFit={true}
          minimumFontScale={0.78}
          numberOfLines={2}
          style={[
            TYPOGRAPHY.hudHero,
            {
              color: '#F8FAFC',
              textAlign: 'center',
              ...(compact ? { fontSize: 28, lineHeight: 34 } : {}),
            },
          ]}
        >
          {t(`state.${state}`)}
        </AppText>

        <AppText
          numberOfLines={2}
          accessibilityLiveRegion="polite"
          style={{
            fontSize: 13.5,
            lineHeight: 19,
            color: '#94A3B8',
            textAlign: 'center',
            fontFamily: 'Inter_600SemiBold',
          }}
        >
          {sourceReason ?? spokenText}
        </AppText>

        {!lockoutLocked && (onPrevCrossing || onNextCrossing) ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {onPrevCrossing && (
              <Pressable
                role="button"
                accessibilityRole="button"
                accessibilityLabel={t('drive.prev_crossing')}
                onPress={onPrevCrossing}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  minHeight: 44,
                  justifyContent: 'center',
                  borderRadius: 8,
                  backgroundColor: '#131B2E',
                  borderWidth: 1,
                  borderColor: '#23304D',
                }}
              >
                <AppText style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter_600SemiBold' }}>
                  {t('drive.prev_crossing')}
                </AppText>
              </Pressable>
            )}
            {onNextCrossing && (
              <Pressable
                role="button"
                accessibilityRole="button"
                accessibilityLabel={t('drive.next_crossing')}
                onPress={onNextCrossing}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  minHeight: 44,
                  justifyContent: 'center',
                  borderRadius: 8,
                  backgroundColor: '#131B2E',
                  borderWidth: 1,
                  borderColor: '#23304D',
                }}
              >
                <AppText style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter_600SemiBold' }}>
                  {t('drive.next_crossing')}
                </AppText>
              </Pressable>
            )}
          </View>
        ) : lockoutLocked && onPassengerOverride ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <AppText style={{ fontSize: 11, color: '#F5A623', fontFamily: 'Inter_600SemiBold' }}>
              {t('drive.lockout_active')}
            </AppText>
            <Pressable
              role="button"
              accessibilityRole="button"
              accessibilityLabel={t('drive.passenger_override')}
              onPress={onPassengerOverride}
              style={{
                minWidth: 44,
                minHeight: 44,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: '#332108',
                borderWidth: 1,
                borderColor: '#F5A623',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText style={{ fontSize: 11, color: '#F5A623', fontFamily: 'Inter_600SemiBold' }}>
                {t('drive.passenger_override')}
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* ZONE 3: Glanceable Arrival Bucket / t('state.now') Alert (20% Height) */}
      <View
        style={{
          marginHorizontal: compact ? 14 : 20,
          justifyContent: 'center',
        }}
      >
        {isZeroLowerBound ? (
          <View
            testID="hud-zero-lower-bound-banner"
            role="alert"
            accessibilityRole="alert"
            aria-live="assertive"
            accessibilityLiveRegion="assertive"
            style={{
              minHeight: 72,
              borderRadius: 10,
              backgroundColor: '#380D1A',
              borderWidth: 3,
              borderColor: '#FF5470',
              paddingHorizontal: 16,
              paddingVertical: 10,
              justifyContent: 'center',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <AppText
              adjustsFontSizeToFit={true}
              minimumFontScale={0.78}
              numberOfLines={2}
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontWeight: '800',
                fontSize: 26,
                lineHeight: 32,
                color: '#F8FAFC',
                textAlign: 'center',
              }}
            >
              {t('state.now')}
            </AppText>
            <AppText
              style={[
                TYPOGRAPHY.hudBucket,
                { fontSize: 16, lineHeight: 20, color: '#FF5470' },
              ]}
            >
              {t('state.range', { lo: 0, hi: 15 })}
            </AppText>
          </View>
        ) : window ? (
          <View
            style={{
              height: 64,
              borderRadius: 10,
              backgroundColor: stateToken.darkBg,
              borderWidth: 2,
              borderColor: stateHex,
              paddingHorizontal: 16,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <AppText
              style={[
                TYPOGRAPHY.hudBucket,
                { color: '#F8FAFC', textAlign: 'center', fontSize: 22, lineHeight: 28 },
              ]}
            >
              {t('state.range', { lo: window[0], hi: window[1] })}
            </AppText>
          </View>
        ) : (
          <View
            style={{
              height: 64,
              borderRadius: 10,
              backgroundColor: '#131B2E',
              borderWidth: 1.5,
              borderColor: '#23304D',
              paddingHorizontal: 16,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <AppText
              style={[
                TYPOGRAPHY.hudBucket,
                { fontSize: 20, lineHeight: 26, color: '#94A3B8', textAlign: 'center' },
              ]}
            >
              {t('drive.tadd')}
            </AppText>
          </View>
        )}
      </View>
      </ScrollView>

      {/* ZONE 4: Tactile Bottom Audio & Exit Deck (20% Height) */}
      <View
        style={{
          paddingHorizontal: compact ? 14 : 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: compact ? 8 : 16,
          paddingTop: 8,
        }}
      >
        <Pressable
          role="button"
          accessibilityRole="button"
          accessibilityLabel={t('drive.repeat')}
          onPress={onRepeatVoice}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            minHeight: compact ? 56 : 72,
            borderRadius: 8,
            backgroundColor: '#F8FAFC',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: compact ? 6 : 14,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          {!compact && <WaveformSvg active={!muted} />}
          <AppText
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontWeight: '700',
              fontSize: compact ? 12 : 16,
              lineHeight: 20,
              color: '#070B12',
              flexShrink: 1,
              textAlign: 'center',
            }}
          >
            {t('drive.repeat')}
          </AppText>
        </Pressable>

        <Pressable
          role="button"
          accessibilityRole="button"
          accessibilityLabel={t(muted ? 'drive.unmute' : 'drive.mute')}
          onPress={onToggleMute}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            minHeight: compact ? 56 : 72,
            paddingHorizontal: compact ? 6 : 16,
            borderRadius: 8,
            backgroundColor: '#131B2E',
            borderWidth: 1.5,
            borderColor: '#23304D',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <AppText
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontWeight: '700',
              fontSize: compact ? 12 : 14,
              lineHeight: 18,
              color: '#F8FAFC',
              flexShrink: 1,
              textAlign: 'center',
            }}
          >
            {t(muted ? 'drive.unmute' : 'drive.mute')}
          </AppText>
        </Pressable>

        <Pressable
          role="button"
          accessibilityRole="button"
          accessibilityLabel={t('drive.stop_sim')}
          onPress={onExitHud}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            minHeight: compact ? 56 : 72,
            borderRadius: 8,
            backgroundColor: '#1C2740',
            borderWidth: 2,
            borderColor: '#5294FF',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: compact ? 6 : 14,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <AppText
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontWeight: '700',
              fontSize: compact ? 12 : 16,
              lineHeight: 20,
              color: '#F8FAFC',
              flexShrink: 1,
              textAlign: 'center',
            }}
          >
            {t('drive.stop_sim')}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}
