import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { AppText, styles } from '@/components/fordcast/UI';
import { usePreferences } from '@/lib/preferences';
import { theme as c } from '@/lib/theme';
import { creeks, gauges, type Crossing } from '@/lib/data';

const toX = (lon: number) => ((lon + 98.15) / 0.65) * 680 + 20;
const toY = (lat: number) => ((30.55 - lat) / 0.5) * 230 + 20;

export default function MapSurface({
  features,
  onSelect,
}: {
  features: Crossing[];
  onSelect: (id: string) => void;
}) {
  const { t } = usePreferences();
  return (
    <View
      style={{
        backgroundColor: c.land,
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <View style={{ padding: 18 }}>
        <AppText style={{ fontFamily: 'Inter_600SemiBold' }}>{t('map.preview')}</AppText>
        <AppText style={styles.footer}>{t('map.preview_body')}</AppText>
      </View>
      <Svg width="100%" height={280} viewBox="0 0 720 280" accessibilityLabel={t('map.preview')}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Line
            key={`v${i}`}
            x1={i * 90}
            y1={0}
            x2={i * 90}
            y2={280}
            stroke={c.border}
            strokeDasharray="2 7"
          />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <Line
            key={`h${i}`}
            x1={0}
            y1={i * 90}
            x2={720}
            y2={i * 90}
            stroke={c.border}
            strokeDasharray="2 7"
          />
        ))}
        {creeks.map((reach) => {
          const pts = reach.geometry.coordinates;
          const d = pts
            .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${toX(pt[0] ?? 0)},${toY(pt[1] ?? 0)}`)
            .join(' ');
          return (
            <Path
              key={reach.properties.reach_id}
              d={d}
              stroke={c.water}
              strokeOpacity={0.35}
              strokeWidth={2}
              fill="none"
            />
          );
        })}
        {gauges.map((g) => {
          const [lon = 0, lat = 0] = g.geometry.coordinates;
          const gx = toX(lon);
          const gy = toY(lat);
          return (
            <Rect
              key={g.properties.id}
              x={gx - 4}
              y={gy - 4}
              width={8}
              height={8}
              fill={c.water}
              stroke={c.bg}
              strokeWidth={1.2}
            />
          );
        })}
        {features.map((feature) => {
          const [lon = 0, lat = 0] = feature.geometry.coordinates;
          const tier = feature.properties.tier;
          const isMonitored = tier === 'A' || tier === 'B';
          const stroke = tier === 'A' ? c.watch : tier === 'B' ? c.link : c.unknown;
          return (
            <Circle
              key={feature.properties.id}
              cx={toX(lon)}
              cy={toY(lat)}
              r={tier === 'A' ? 6.5 : tier === 'B' ? 5.5 : 3.8}
              fill={isMonitored ? c.surface : c.land}
              stroke={stroke}
              strokeWidth={tier === 'A' ? 2.5 : 1.6}
              strokeDasharray={isMonitored ? undefined : '2 2'}
              onPress={() => onSelect(feature.properties.id)}
            />
          );
        })}
        <SvgText x={16} y={268} fill={c.subtle} fontSize={10}>
          −98.15°W · Austin Watersheds
        </SvgText>
        <SvgText x={580} y={268} fill={c.subtle} fontSize={10}>
          19 USGS Gauges · 30 Monitored
        </SvgText>
      </Svg>
      <AppText style={[styles.footer, { padding: 14 }]}>{t('map.attribution')}</AppText>
    </View>
  );
}
