import { View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { AppText, styles } from '@/components/fordcast/UI';
import { usePreferences } from '@/lib/preferences';
import { theme as c } from '@/lib/theme';
import type { Crossing } from '@/lib/data';
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
      <Svg width="100%" height={270} viewBox="0 0 720 270" accessibilityLabel={t('map.preview')}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Line
            key={`v${i}`}
            x1={i * 90}
            y1={0}
            x2={i * 90}
            y2={270}
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
        {features.map((feature) => {
          const [lon = 0, lat = 0] = feature.geometry.coordinates;
          return (
            <Circle
              key={feature.properties.id}
              cx={((lon + 98.2) / 0.8) * 680 + 20}
              cy={((30.7 - lat) / 0.75) * 230 + 20}
              r={4}
              fill={c.land}
              stroke={c.unknown}
              strokeWidth={1.5}
              strokeDasharray="2 2"
              onPress={() => onSelect(feature.properties.id)}
            />
          );
        })}
        <SvgText x={16} y={260} fill={c.subtle} fontSize={10}>
          −98.20°
        </SvgText>
        <SvgText x={650} y={260} fill={c.subtle} fontSize={10}>
          −97.40°
        </SvgText>
      </Svg>
      <AppText style={[styles.footer, { padding: 14 }]}>{t('map.attribution')}</AppText>
    </View>
  );
}
