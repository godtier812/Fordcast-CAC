import type { TextStyle } from 'react-native';

export type ThemeMode = 'dark' | 'light';
export type CrossingStateKey = 'no_rise' | 'watch' | 'avoid' | 'closed' | 'unknown';

/**
 * Invariant 1 & Invariant 2: Locked State Hex Constants.
 * Strictly zero traffic-light green (#00FF00 / emerald) anywhere in the palette.
 */
export const LOCKED_STATE_HEX: Record<CrossingStateKey, string> = {
  no_rise: '#2BD9D9',
  watch: '#F5A623',
  avoid: '#FF5470',
  closed: '#FF5470',
  unknown: '#7A879C',
} as const;

export const STATE_TOKENS: Record<
  CrossingStateKey,
  {
    fg: string;
    darkBg: string;
    lightText: string;
    lightFill: string;
    bezel: string;
  }
> = {
  no_rise: {
    fg: '#2BD9D9',
    darkBg: '#0A2E36',
    lightText: '#0D7474',
    lightFill: '#E0FAFA',
    bezel: '#0F172A',
  },
  watch: {
    fg: '#F5A623',
    darkBg: '#332108',
    lightText: '#9A5B06',
    lightFill: '#FEF3C7',
    bezel: '#0F172A',
  },
  avoid: {
    fg: '#FF5470',
    darkBg: '#380D1A',
    lightText: '#B91C38',
    lightFill: '#FFE4E8',
    bezel: '#0F172A',
  },
  closed: {
    fg: '#FF5470',
    darkBg: '#2A0812',
    lightText: '#9F122C',
    lightFill: '#FFD1D9',
    bezel: '#0F172A',
  },
  unknown: {
    fg: '#7A879C',
    darkBg: '#1A2232',
    lightText: '#334155',
    lightFill: '#E2E8F0',
    bezel: '#0F172A',
  },
} as const;

export const SURFACES = {
  dark: {
    canvasMap: '#111827',
    canvasWater: '#16283E',
    primary: '#131C2B',
    elevated1: '#1B273A',
    elevated2: '#24334B',
    glassHud: 'rgba(27, 39, 58, 0.90)',
    lockedFuture: '#0F1622',
    borderSubtle: '#2E3F59',
    borderFocus: '#60A5FA',
    textPrimary: '#F1F5F9',
    textSecondary: '#A8B8CD',
    textMuted: '#9AABC2',
  },
  light: {
    canvasMap: '#E6ECF2',
    canvasWater: '#B8CDE0',
    primary: '#F4F7FA',
    elevated1: '#FFFFFF',
    elevated2: '#EDF2F7',
    glassHud: 'rgba(255, 255, 255, 0.90)',
    lockedFuture: '#E2E8F0',
    borderSubtle: '#CBD5E1',
    borderFocus: '#1D4ED8',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
  },
} as const;

export const HYDROGRAPH_TOKENS = {
  dark: {
    upstreamStroke: '#38BDF8',
    downstreamStroke: '#60A5FA',
    latencyCurtain: 'rgba(245, 166, 35, 0.14)',
    blackoutZone: 'rgba(255, 84, 112, 0.16)',
    nwps: {
      action: '#EAB308',
      minor: '#F97316',
      mod: '#EF4444',
      maj: '#C084FC',
    },
  },
  light: {
    upstreamStroke: '#0284C7',
    downstreamStroke: '#7E22CE',
    latencyCurtain: 'rgba(245, 166, 35, 0.18)',
    blackoutZone: 'rgba(255, 84, 112, 0.20)',
    nwps: {
      action: '#CA8A04',
      minor: '#EA580C',
      mod: '#DC2626',
      maj: '#9333EA',
    },
  },
} as const;

export const TYPOGRAPHY: Record<
  | 'hudHero'
  | 'hudBucket'
  | 'sheetTitle'
  | 'badgeState'
  | 'metricValue'
  | 'bodyCompact'
  | 'chartAxis',
  TextStyle
> = {
  hudHero: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '800',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.64,
  },
  hudBucket: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.28,
    fontVariant: ['tabular-nums'],
  },
  sheetTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  badgeState: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.13,
  },
  metricValue: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  bodyCompact: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  chartAxis: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '500',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    fontVariant: ['tabular-nums'],
  },
} as const;

export const tokens = {
  state: STATE_TOKENS,
  lockedStateHex: LOCKED_STATE_HEX,
  surface: SURFACES,
  chart: HYDROGRAPH_TOKENS,
  type: TYPOGRAPHY,
} as const;
