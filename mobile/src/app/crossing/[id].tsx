import { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import ArrivalBucketStrip from '@/components/ArrivalBucketStrip';
import CausalHydrograph from '@/components/CausalHydrograph';
import { AppText } from '@/components/fordcast/UI';
import ProvenanceCard, { CorridorPropagationBar } from '@/components/ProvenanceCard';
import { FcIcon } from '@/components/fc/Icons';
import { ActionButton, BigStatus, cleanName, Panel, SectionLabel, Sparkline, agoText, shareText, statusLabel } from '@/components/fc/Kit';
import { crossings, gauges, replays, visibleSamples } from '@/lib/data';
import { cleanPhysicalCrossingName } from '@/lib/danger';
import { formatStormClock } from '@/lib/drill';
import { formatMiles } from '@/lib/geo';
import { LIVE_STALE_MIN, primaryLink, rise30, type GaugeReading } from '@/lib/live';
import { useMonitor } from '@/lib/monitor-context';
import { usePreferences } from '@/lib/preferences';
import { SURFACES } from '@/theme/tokens';

const S = SURFACES.dark;

export default function CrossingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language, saved, toggleSaved, activeStormId } = usePreferences();
  const m = useMonitor();
  const [science, setScience] = useState(false);
  const [expandHistory, setExpandHistory] = useState(false);
  const crossing = crossings.find((f) => f.properties.id === id);
  const status = id ? m.statusById[id] : undefined;

  if (!status) {
    return (
      <View style={{ flex: 1, padding: 24, backgroundColor: S.primary }}>
        <AppText style={{ fontSize: 22, fontFamily: 'Inter_700Bold' }}>{t('crossing.not_found')}</AppText>
      </View>
    );
  }

  const physicalTitle = cleanPhysicalCrossingName(cleanName(status.name)) || cleanName(status.name);

  // Official ATXfloods crossing outside FordCast's 141 catalog: show official status + preparedness card.
  if (!crossing) {
    const isSavedOfficial = saved.includes(status.id);
    const label = statusLabel(t, status);
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: S.primary }}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48, width: '100%', maxWidth: 760, alignSelf: 'center' }}
      >
        <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 26, lineHeight: 32 }}>{physicalTitle}</AppText>
        <AppText style={{ fontSize: 14, color: S.textSecondary }}>
          {[status.creek ? cleanName(status.creek) : '', t('home.away', { dist: formatMiles(status.distanceKm) })]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
        <BigStatus status={status} />
        {status.official?.comment ? <AppText style={{ color: S.textSecondary }}>“{status.official.comment}”</AppText> : null}

        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <ActionButton
            icon="route"
            label={t('home.plan_here')}
            onPress={() => {
              m.setMode('live');
              m.setHomeTab('route');
              void m.planRoute({ name: physicalTitle, detail: cleanName(status.creek), lat: status.lat, lon: status.lon });
              router.navigate('/');
            }}
          />
          <ActionButton
            kind="secondary"
            icon="map"
            label={t('detail.show_on_map')}
            onPress={() => {
              m.focusOnMap(status.id);
              router.navigate('/');
            }}
          />
          <ActionButton
            compact
            kind="secondary"
            icon={isSavedOfficial ? 'star' : 'star-outline'}
            label={isSavedOfficial ? t('detail.saved') : t('detail.save')}
            onPress={() => toggleSaved(status.id)}
          />
          <ActionButton
            compact
            kind="secondary"
            icon="share"
            label={t('home.share')}
            onPress={() =>
              void shareText(
                `FordCast Preparedness Card: ${physicalTitle}`,
                `${physicalTitle} (${status.creek || 'Austin'}): ${label}. Official closures: https://www.atxfloods.com/ · Never drive around barricades.`,
              )
            }
          />
        </View>

        <PreparednessCard
          title={physicalTitle}
          creek={status.creek}
          gaugeId={null}
          language={language}
          onShare={() =>
            void shareText(
              `FordCast Preparedness Card: ${physicalTitle}`,
              `${physicalTitle} (${status.creek || 'Austin'}): ${label}. Official closures: https://www.atxfloods.com/ · Report flooded road: Austin 311.`,
            )
          }
        />

        <AppText style={{ fontSize: 12.5, lineHeight: 18, color: S.textMuted }}>{t('disclaimer')}</AppText>
      </ScrollView>
    );
  }

  const p = crossing.properties;
  const isSaved = saved.includes(p.id);
  const link = status.live?.link ?? primaryLink(p.id);
  const gaugeName = link
    ? cleanName(gauges.find((g) => g.properties.id === link.gauge_id)?.properties.name ?? link.gauge_id)
    : null;
  const drill = m.mode === 'drill';
  const replay = replays[drill ? m.drill.stormId : activeStormId] ?? replays['memorial-day-2015']!;
  const simT = drill
    ? m.drill.simT
    : replay.hero?.first_alert_at
      ? Date.parse(replay.hero.first_alert_at)
      : Date.parse(replay.storm.start) + 6 * 3600_000;

  // Sensor readings for the chart: strictly live feed in live mode, or archived replay in drill mode.
  let rows: GaugeReading[] = [];
  if (link) {
    if (!drill) rows = m.liveSeries?.[link.gauge_id] ?? [];
    else {
      const g = replay.gauges.find((x) => x.id === link.gauge_id);
      rows = g
        ? visibleSamples(g, simT)
            .filter((s) => s.stageFt != null && s.t >= simT - 3 * 3600_000)
            .map((s) => ({ t: s.t, v: s.stageFt as number }))
        : [];
    }
  }
  const last = rows[rows.length - 1] ?? null;
  const refNow = Math.max(m.nowMs ?? 0, m.liveFetchedAt ?? 0, m.latestObsAt ?? 0);
  const isStaleLive = !drill && last != null && refNow > 0 && refNow - last.t > LIVE_STALE_MIN * 60_000;
  const change = !isStaleLive ? rise30(rows) : null;
  const stormName = language === 'es' ? replay.storm.name_es : replay.storm.name_en;
  const combinedState = status.displayState ?? status.state;
  const eventsToShow = status.history?.events
    ? expandHistory
      ? status.history.events
      : status.history.events.slice(0, 3)
    : [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: S.primary }}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48, width: '100%', maxWidth: 760, alignSelf: 'center' }}
    >
      <View style={{ gap: 4 }}>
        <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 26, lineHeight: 32 }}>{physicalTitle}</AppText>
        <AppText style={{ fontSize: 14, color: S.textSecondary }}>
          {[p.creek ? cleanName(p.creek) : null, p.jurisdiction, t('home.away', { dist: formatMiles(status.distanceKm) })]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
        <AppText style={{ fontSize: 12.5, color: drill ? '#9B8AFB' : S.textMuted, fontFamily: 'Inter_600SemiBold' }}>
          {drill
            ? `SIMULATION · ${t('detail.mode_drill', { storm: stormName })} · ${formatStormClock(simT, language)}`
            : t('detail.mode_live')}
        </AppText>
      </View>

      <BigStatus status={status} />

      {/* Focused Action Bar: 1 primary navigation action + compact secondary actions */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <ActionButton
          icon="route"
          label={t('home.plan_here')}
          onPress={() => {
            m.setMode('live');
            m.setHomeTab('route');
            void m.planRoute({ name: physicalTitle, detail: cleanName(status.creek), lat: status.lat, lon: status.lon });
            router.navigate('/');
          }}
        />
        <ActionButton
          kind="secondary"
          icon="map"
          label={t('detail.show_on_map')}
          onPress={() => {
            m.focusOnMap(status.id);
            router.navigate('/');
          }}
        />
        <ActionButton
          compact
          kind="secondary"
          icon={isSaved ? 'star' : 'star-outline'}
          label={isSaved ? t('detail.saved') : t('detail.save')}
          onPress={() => toggleSaved(p.id)}
        />
        <ActionButton
          compact
          kind="secondary"
          icon="share"
          label={t('home.share')}
          onPress={() =>
            void shareText(
              `FordCast Preparedness Card: ${physicalTitle}`,
              `${physicalTitle} (${status.creek || 'Austin'}): ${statusLabel(t, status)}. ${
                status.history?.reports
                  ? `${status.history.reports} nearby NOAA flood reports since 1996 (within 2 km). `
                  : ''
              }Official closures: https://www.atxfloods.com/ · Never drive into water.`,
            )
          }
        />
      </View>

      {status.monitored && link ? (
        <>
          <SectionLabel>{t('detail.sensor_title')}</SectionLabel>
          <Panel>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>{gaugeName}</AppText>
              <AppText style={{ fontSize: 11.5, color: drill ? '#9B8AFB' : S.textMuted, fontFamily: 'Inter_600SemiBold' }}>
                {drill ? `ARCHIVED (${stormName})` : `LIVE USGS · ${link.gauge_id}`}
              </AppText>
            </View>
            {last ? (
              isStaleLive ? (
                <View style={{ gap: 4 }}>
                  <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: '#F5A623' }}>
                    {t('crossing.stale_reading_label')}
                  </AppText>
                  <AppText style={{ fontSize: 13, color: S.textMuted, fontVariant: ['tabular-nums'] }}>
                    {`${last.v.toFixed(2)} ft · ${t('detail.sensor_updated', { ago: agoText(t, last.t, refNow) })}`}
                  </AppText>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 26, fontVariant: ['tabular-nums'] }}>
                    {t('detail.sensor_now', { ft: last.v.toFixed(2) })}
                  </AppText>
                  {change != null ? (
                    <AppText style={{ fontSize: 14, color: change > 0.2 ? '#F5A623' : S.textSecondary, fontVariant: ['tabular-nums'] }}>
                      {t('detail.sensor_change', { change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}` })}
                    </AppText>
                  ) : null}
                </View>
              )
            ) : (
              <AppText style={{ color: S.textSecondary }}>{t('detail.sensor_none')}</AppText>
            )}
            {last && !drill && !isStaleLive ? (
              <AppText style={{ fontSize: 12.5, color: S.textMuted }}>
                {t('detail.sensor_updated', { ago: agoText(t, last.t, refNow) })}
              </AppText>
            ) : null}
            <AppText style={{ fontSize: 12, lineHeight: 17, color: S.textMuted }}>
              {language === 'es'
                ? 'Altura medida respecto al nivel base de la estación USGS — no es la profundidad del agua sobre el camino. Un valor negativo solo indica agua por debajo del cero de referencia del sensor.'
                : 'Gauge height is measured relative to the USGS station datum — not water depth on the road. Negative values simply mean water is below the sensor datum zero.'}
            </AppText>
            {rows.length > 1 ? (
              <>
                <AppText style={{ fontSize: 12.5, color: S.textMuted }}>
                  {drill
                    ? `${stormName} · 3h window ending ${formatStormClock(simT, language)}`
                    : t('detail.chart_title')}
                </AppText>
                <Sparkline rows={rows} watchFt={link.watch_stage_ft} triggerFt={link.trigger_stage_ft} />
              </>
            ) : null}
            <AppText style={{ fontSize: 13.5, lineHeight: 19, color: S.textSecondary }}>
              {t('detail.sensor_levels', { watch: link.watch_stage_ft.toFixed(1), trigger: link.trigger_stage_ft.toFixed(1) })}
            </AppText>
            <AppText style={{ fontSize: 13.5, lineHeight: 19, color: S.textSecondary }}>
              {t('detail.sensor_travel', { lo: link.tau_lo_min, hi: link.tau_hi_min })}
            </AppText>
          </Panel>
        </>
      ) : null}

      {status.rain ? (
        <>
          <SectionLabel>{t('detail.rain_title')}</SectionLabel>
          <Panel>
            <AppText style={{ fontSize: 14.5, lineHeight: 21 }}>
              {t('detail.rain_body', { past: status.rain.past3hIn.toFixed(2), next: status.rain.next3hIn.toFixed(2) })}
            </AppText>
            <AppText style={{ fontSize: 12, color: S.textMuted }}>Open-Meteo · ~10 km grid</AppText>
          </Panel>
        </>
      ) : null}

      <SectionLabel>{t('detail.history_title')}</SectionLabel>
      <Panel>
        {status.history && status.history.reports > 0 ? (
          <>
            <AppText style={{ fontSize: 14.5, lineHeight: 21 }}>
              {t('detail.history_body', { reports: status.history.reports, vehicle: status.history.vehicleRelated })}
            </AppText>
            {status.history.deaths > 0 ? (
              <AppText style={{ fontSize: 14, color: '#F5A623', fontFamily: 'Inter_600SemiBold' }}>
                {t('detail.history_deaths', { deaths: status.history.deaths, vehicle: status.history.vehicleDeaths })}
              </AppText>
            ) : null}
            {eventsToShow.map((e) => (
              <View key={`${e.date}-${e.dist_km}`} style={{ borderTopWidth: 1, borderColor: S.borderSubtle, paddingTop: 8, gap: 2 }}>
                <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
                  {e.date} · {e.type} ({e.dist_km} km from crossing)
                </AppText>
                {e.summary ? <AppText style={{ fontSize: 12.5, lineHeight: 18, color: S.textSecondary }}>{e.summary}</AppText> : null}
              </View>
            ))}
            {status.history.events.length > 3 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setExpandHistory((v) => !v)}
                style={{ paddingVertical: 4 }}
              >
                <AppText style={{ fontSize: 12.5, color: '#60A5FA', fontFamily: 'Inter_600SemiBold' }}>
                  {expandHistory
                    ? language === 'es'
                      ? 'Mostrar menos reportes'
                      : 'Show fewer reports'
                    : language === 'es'
                      ? `Ver los ${status.history.events.length} reportes recientes`
                      : `Show all ${status.history.events.length} recent reports`}
                </AppText>
              </Pressable>
            ) : null}
            <AppText style={{ fontSize: 12, color: S.textMuted }}>{t('detail.history_note')}</AppText>
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL('https://www.ncei.noaa.gov/stormevents/')}
            >
              <AppText style={{ fontSize: 12, color: '#60A5FA', fontFamily: 'Inter_600SemiBold' }}>
                {language === 'es'
                  ? 'Fuente: Base de Datos de Eventos de Tormenta de NOAA NCEI →'
                  : 'Source: NOAA NCEI Storm Events Database →'}
              </AppText>
            </Pressable>
          </>
        ) : (
          <AppText style={{ color: S.textSecondary }}>{t('detail.history_none')}</AppText>
        )}
      </Panel>

      {/* Shareable Crossing-Area Preparedness Card (Upgrade #5) */}
      <PreparednessCard
        title={physicalTitle}
        creek={p.creek ?? status.creek}
        gaugeId={link?.gauge_id ?? null}
        language={language}
        onShare={() =>
          void shareText(
            `FordCast Preparedness Card: ${physicalTitle}`,
            `${physicalTitle} (${p.creek || 'Austin'}): ${statusLabel(t, status)}. ${
              status.history?.reports
                ? `${status.history.reports} nearby NOAA flood reports since 1996 (within 2 km). `
                : ''
            }Official closures: https://www.atxfloods.com/ · Never drive around barricades.`,
          )
        }
      />

      <ActionButton
        kind="secondary"
        icon="flask"
        label={science ? t('detail.science_hide') : t('detail.science')}
        onPress={() => setScience((v) => !v)}
      />

      {science ? (
        <View style={{ gap: 14 }}>
          <ArrivalBucketStrip state={combinedState} window={status.window} />
          {link ? (
            <CorridorPropagationBar
              crossingId={p.id}
              upstreamStageFt={isStaleLive ? null : (last?.v ?? null)}
              upstreamSlopeFtHr={change != null ? change * 2 : null}
              state={combinedState}
            />
          ) : null}
          {drill && link && replay.gauges.some((g) => g.id === link.gauge_id) ? (
            <View style={{ gap: 8 }}>
              <View
                style={{
                  backgroundColor: 'rgba(155, 138, 251, 0.14)',
                  borderColor: '#9B8AFB',
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 10,
                }}
              >
                <AppText style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: '#C4B5FD' }}>
                  {language === 'es'
                    ? `HIDROGRAMA DE SIMULACRO ARCHIVADO · ${stormName} · ${formatStormClock(simT, language)}`
                    : `ARCHIVED STORM REPLAY HYDROGRAPH · ${stormName} · ${formatStormClock(simT, language)}`}
                </AppText>
              </View>
              <CausalHydrograph
                crossingId={p.id}
                replay={replay}
                tSim={simT}
                upstreamGaugeId={link.gauge_id}
                state={combinedState}
                arrivalWindow={status.window}
              />
            </View>
          ) : !drill && link && replay.gauges.some((g) => g.id === link.gauge_id) ? (
            <Panel style={{ gap: 8 }}>
              <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
                {language === 'es'
                  ? 'Hidrograma histórico separado del modo en vivo'
                  : 'Historical storm hydrograph kept separate from live data'}
              </AppText>
              <AppText style={{ fontSize: 12.5, lineHeight: 18, color: S.textSecondary }}>
                {language === 'es'
                  ? `Estás viendo datos en vivo. Para inspeccionar el hidrograma causal archivado de ${stormName} en este corredor, cambia explícitamente al modo Simulacro.`
                  : `You are viewing live data. To inspect the archived causal hydrograph for ${stormName} on this corridor, switch explicitly to Storm drill mode.`}
              </AppText>
              <ActionButton
                compact
                kind="secondary"
                icon="play"
                label={
                  language === 'es'
                    ? `Cambiar a Simulacro (${stormName})`
                    : `Switch to Storm Drill (${stormName})`
                }
                onPress={() => m.startDrill(replay.storm.id)}
              />
            </Panel>
          ) : null}
          <ProvenanceCard crossing={crossing} />
        </View>
      ) : null}

      <AppText style={{ fontSize: 12.5, lineHeight: 18, color: S.textMuted }}>{t('disclaimer')}</AppText>
    </ScrollView>
  );
}

function PreparednessCard({
  title,
  creek,
  gaugeId,
  language,
  onShare,
}: {
  title: string;
  creek: string;
  gaugeId: string | null;
  language: 'en' | 'es';
  onShare: () => void;
}) {
  const es = language === 'es';
  return (
    <Panel style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <FcIcon name="shield" size={16} color="#60A5FA" />
        <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 15 }}>
          {es ? 'Qué hacer cuando este cruce está cerrado' : 'What to do when this crossing is closed'}
        </AppText>
      </View>
      <AppText style={{ fontSize: 13, lineHeight: 19, color: S.textSecondary }}>
        {es
          ? `1. Nunca rodees barricadas en ${title}${creek ? ` (${cleanName(creek)})` : ''}; el asfalto bajo el agua puede estar socavado.\n2. Usa el planificador de ruta de FordCast para calcular un desvío antes de salir.\n3. Verifica cierres oficiales en ATXFloods y reporta agua sobre la vía al 311 de Austin (o 911 en emergencias).`
          : `1. Never drive around barricades at ${title}${creek ? ` (${cleanName(creek)})` : ''}; the roadbed beneath moving water may be washed out.\n2. Use FordCast's route planner to check an alternate route before driving.\n3. Verify official closures on ATXFloods and report unbarricaded water on the road to Austin 311 (or 911 in an emergency).`}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <ActionButton
          compact
          kind="secondary"
          icon="share"
          label={es ? 'Compartir tarjeta de preparación' : 'Share preparedness card'}
          onPress={onShare}
        />
        <ActionButton
          compact
          kind="secondary"
          icon="shield"
          label="ATXFloods.com"
          onPress={() => void Linking.openURL('https://www.atxfloods.com/crossings')}
        />
        {gaugeId ? (
          <ActionButton
            compact
            kind="secondary"
            icon="creeks"
            label={`USGS ${gaugeId}`}
            onPress={() => void Linking.openURL(`https://waterdata.usgs.gov/monitoring-location/${gaugeId}/`)}
          />
        ) : null}
        <ActionButton
          compact
          kind="secondary"
          icon="alert"
          label="Austin 311"
          onPress={() => void Linking.openURL('https://www.austintexas.gov/department/311')}
        />
      </View>
    </Panel>
  );
}
