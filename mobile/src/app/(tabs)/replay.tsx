import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import {
  AppText,
  Button,
  Card,
  Eyebrow,
  Footer,
  Page,
  Title,
  styles,
} from '@/components/fordcast/UI';
import { history } from '@/lib/data';
import { theme as c } from '@/lib/theme';
import { usePreferences } from '@/lib/preferences';
export default function Replay() {
  const { t, language } = usePreferences();
  const [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false),
    [table, setTable] = useState(false);
  const points = history.points as [string, number][];
  const point = points[cursor] ?? points[0]!;
  useFocusEffect(useCallback(() => () => setPlaying(false), []));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setPlaying(false);
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (cursor >= points.length - 2) setPlaying(false);
      setCursor((i) => Math.min(points.length - 1, i + 1));
    }, 350);
    return () => clearTimeout(timer);
  }, [playing, cursor, points.length]);
  const stamp = (value: string) =>
    new Date(value).toLocaleString(language === 'es' ? 'es-US' : 'en-US', {
      timeZone: 'America/Chicago',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  const start = Date.parse(points[0]![0]),
    end = Date.parse(points[points.length - 1]![0]);
  const max = Math.ceil(Math.max(...points.map((p) => p[1])) / 10) * 10;
  const x = (p: [string, number]) => 40 + ((Date.parse(p[0]) - start) / (end - start)) * 610;
  const y = (p: [string, number]) => 205 - (p[1] / max) * 175;
  const path = points
    .slice(0, cursor + 1)
    .map(
      (p, i) =>
        `${i === 0 || Date.parse(p[0]) - Date.parse(points[i - 1]![0]) > 1800000 ? 'M' : 'L'}${x(p)},${y(p)}`,
    )
    .join(' ');
  return (
    <Page>
      <Eyebrow color={c.replay}>{t('replay.eyebrow')}</Eyebrow>
      <Title>{t('replay.title')}</Title>
      <AppText style={styles.muted}>{t('replay.body')}</AppText>
      <Card style={{ borderColor: c.replay }}>
        <Eyebrow color={c.replay}>{t('replay.banner')}</Eyebrow>
        <AppText style={styles.heading}>{t('replay.storm')}</AppText>
        <AppText style={styles.muted}>{t('replay.gauge')}</AppText>
        <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
          <AppText
            style={{
              fontSize: 44,
              lineHeight: 54,
              color: c.water,
              fontFamily: 'Inter_600SemiBold',
              fontVariant: ['tabular-nums'],
            }}
          >
            {point[1].toFixed(2)} <AppText style={styles.footer}>ft</AppText>
          </AppText>
          <AppText style={styles.footer}>{stamp(point[0])}</AppText>
        </View>
        <Svg
          width="100%"
          height={235}
          viewBox="0 0 680 235"
          accessibilityLabel={t('replay.chart_label')}
          accessible
        >
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <Line
              key={`line-${v}`}
              x1={40}
              y1={205 - v * 175}
              x2={650}
              y2={205 - v * 175}
              stroke={c.border}
              strokeDasharray="3 5"
            />
          ))}
          {[0, 0.5, 1].map((v) => (
            <SvgText key={`label-${v}`} x={4} y={209 - v * 175} fill={c.subtle} fontSize={11}>
              {Math.round(max * v)}
            </SvgText>
          ))}
          <Path d={path} stroke={c.water} fill="none" strokeWidth={3} />
          <Circle cx={x(point)} cy={y(point)} r={5} fill={c.water} />
          <Line
            x1={x(point)}
            y1={25}
            x2={x(point)}
            y2={210}
            stroke={c.replay}
            strokeDasharray="2 4"
          />
        </Svg>
        <AppText style={styles.footer}>{t('replay.caption')}</AppText>
        <AppText accessibilityLiveRegion="polite">
          {t('replay.reading', { index: cursor + 1, count: points.length })}
        </AppText>
        <Button
          title={t(playing ? 'replay.pause' : 'replay.play')}
          onPress={() => {
            if (cursor === points.length - 1) setCursor(0);
            setPlaying(!playing);
          }}
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              title={t('replay.previous')}
              disabled={cursor === 0}
              onPress={() => {
                setPlaying(false);
                setCursor((i) => i - 1);
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              title={t('replay.next')}
              disabled={cursor === points.length - 1}
              onPress={() => {
                setPlaying(false);
                setCursor((i) => i + 1);
              }}
            />
          </View>
        </View>
        <Button
          secondary
          title={t('replay.restart')}
          onPress={() => {
            setPlaying(false);
            setCursor(0);
          }}
        />
        <AppText style={styles.footer}>{t('replay.caveat')}</AppText>
      </Card>
      <Button
        secondary
        title={t(table ? 'replay.hide_table' : 'replay.table')}
        onPress={() => setTable(!table)}
      />
      {table && (
        <Card>
          {points.map((p, i) => (
            <AppText key={`${p[0]}-${i}`} style={styles.footer}>
              {stamp(p[0])} · {p[1].toFixed(2)} ft
            </AppText>
          ))}
        </Card>
      )}
      <Card>
        <AppText style={styles.heading}>{t('replay.pending')}</AppText>
        <AppText style={styles.muted}>{t('replay.pending_body')}</AppText>
      </Card>
      <AppText style={styles.footer}>
        {t('common.source')}: {t('replay.archive')}
      </AppText>
      <Footer />
    </Page>
  );
}
