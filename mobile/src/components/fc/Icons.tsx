/**
 * Clean geometric SVG icon set for FordCast (zero emojis across the UI).
 * Rendered on a 24x24 viewBox with crisp 2px rounded strokes.
 */
import { memo } from 'react';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

export type FcIconName =
  | 'map'
  | 'route'
  | 'creeks'
  | 'car'
  | 'play'
  | 'pause'
  | 'replay'
  | 'volume'
  | 'mute'
  | 'settings'
  | 'pin'
  | 'bell'
  | 'share'
  | 'layers'
  | 'target'
  | 'plus'
  | 'minus'
  | 'close'
  | 'chevron-right'
  | 'star'
  | 'star-outline'
  | 'home'
  | 'work'
  | 'arrow-right'
  | 'alert'
  | 'shield'
  | 'radar'
  | 'flag'
  | 'flask'
  | 'check'
  | 'gauge'
  | 'moon';

export const FcIcon = memo(function FcIcon({
  name,
  size = 16,
  color = '#F1F5F9',
}: {
  name: FcIconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'map' ? (
        <>
          <Polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <Line x1="9" y1="3" x2="9" y2="18" />
          <Line x1="15" y1="6" x2="15" y2="21" />
        </>
      ) : name === 'route' ? (
        <>
          <Polygon points="3 11 22 2 13 21 11 13 3 11" />
        </>
      ) : name === 'creeks' ? (
        <>
          <Path d="M2 9c2.5-2.5 5.5-2.5 8 0s5.5 2.5 8 0 3.5-1.5 4-1" />
          <Path d="M2 16c2.5-2.5 5.5-2.5 8 0s5.5 2.5 8 0 3.5-1.5 4-1" />
        </>
      ) : name === 'car' ? (
        <>
          <Path d="M5 17h14v-5l-2-5H7L5 12v5Z" />
          <Circle cx="7.5" cy="17.5" r="1.5" fill={color} />
          <Circle cx="16.5" cy="17.5" r="1.5" fill={color} />
          <Line x1="5" y1="12" x2="19" y2="12" />
        </>
      ) : name === 'play' ? (
        <Polygon points="6 4 20 12 6 20 6 4" fill={color} />
      ) : name === 'pause' ? (
        <>
          <Rect x="6" y="4" width="4" height="16" rx="1" fill={color} />
          <Rect x="14" y="4" width="4" height="16" rx="1" fill={color} />
        </>
      ) : name === 'replay' ? (
        <>
          <Polyline points="1 4 1 10 7 10" />
          <Path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </>
      ) : name === 'volume' ? (
        <>
          <Polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <Path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <Path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>
      ) : name === 'mute' ? (
        <>
          <Polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <Line x1="23" y1="9" x2="17" y2="15" />
          <Line x1="17" y1="9" x2="23" y2="15" />
        </>
      ) : name === 'settings' ? (
        <>
          <Circle cx="12" cy="12" r="3" />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </>
      ) : name === 'pin' ? (
        <>
          <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
          <Circle cx="12" cy="10" r="3" />
        </>
      ) : name === 'bell' ? (
        <>
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </>
      ) : name === 'share' ? (
        <>
          <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <Polyline points="16 6 12 2 8 6" />
          <Line x1="12" y1="2" x2="12" y2="15" />
        </>
      ) : name === 'layers' ? (
        <>
          <Polygon points="12 2 2 7 12 12 22 7 12 2" />
          <Polyline points="2 17 12 22 22 17" />
          <Polyline points="2 12 12 17 22 12" />
        </>
      ) : name === 'target' ? (
        <>
          <Circle cx="12" cy="12" r="7" />
          <Circle cx="12" cy="12" r="2.5" fill={color} />
          <Line x1="12" y1="2" x2="12" y2="5" />
          <Line x1="12" y1="19" x2="12" y2="22" />
          <Line x1="2" y1="12" x2="5" y2="12" />
          <Line x1="19" y1="12" x2="22" y2="12" />
        </>
      ) : name === 'plus' ? (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" />
          <Line x1="5" y1="12" x2="19" y2="12" />
        </>
      ) : name === 'minus' ? (
        <Line x1="5" y1="12" x2="19" y2="12" />
      ) : name === 'close' ? (
        <>
          <Line x1="18" y1="6" x2="6" y2="18" />
          <Line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : name === 'chevron-right' ? (
        <Polyline points="9 18 15 12 9 6" />
      ) : name === 'star' ? (
        <Polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
          fill={color}
        />
      ) : name === 'star-outline' ? (
        <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      ) : name === 'home' ? (
        <>
          <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <Polyline points="9 22 9 12 15 12 15 22" />
        </>
      ) : name === 'work' ? (
        <>
          <Rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </>
      ) : name === 'arrow-right' ? (
        <>
          <Line x1="5" y1="12" x2="19" y2="12" />
          <Polyline points="12 5 19 12 12 19" />
        </>
      ) : name === 'alert' ? (
        <>
          <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <Line x1="12" y1="9" x2="12" y2="13" />
          <Circle cx="12" cy="17" r="1" fill={color} />
        </>
      ) : name === 'shield' ? (
        <>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <Polyline points="9 12 11 14 15 10" />
        </>
      ) : name === 'radar' ? (
        <>
          <Circle cx="12" cy="12" r="2" fill={color} />
          <Path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
        </>
      ) : name === 'flag' ? (
        <>
          <Path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill={color} />
          <Line x1="4" y1="22" x2="4" y2="15" />
        </>
      ) : name === 'flask' ? (
        <>
          <Path d="M10 2v7.31L4.72 18.55A2 2 0 0 0 6.46 21.5h11.08a2 2 0 0 0 1.74-2.95L14 9.31V2" />
          <Line x1="8.5" y1="2" x2="15.5" y2="2" />
          <Line x1="7" y1="15" x2="17" y2="15" />
        </>
      ) : name === 'check' ? (
        <Polyline points="20 6 9 17 4 12" />
      ) : name === 'gauge' ? (
        <Polygon points="12 3 21 12 12 21 3 12 12 3" fill={color} />
      ) : (
        <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      )}
    </Svg>
  );
});
