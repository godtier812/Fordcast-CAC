import { describe, expect, test } from '@jest/globals';
import * as webGuardian from '../../src/lib/guardian.web';
import { assessRouteCoverage } from '../../src/lib/routing';
import { countDistinctHistoryEvents, groupPhysicalCrossings } from '../../src/lib/danger';
import type { CrossingStatus } from '../../src/lib/monitor-context';

const base = (patch: Partial<CrossingStatus> = {}): CrossingStatus => ({
  id: 'probe-a', name: 'Probe Road at Bear Creek', creek: 'Bear Creek', lat: 30.2672,
  lon: -97.7431, monitored: false, coverage: 'none', state: 'unknown', window: null,
  displayState: null, distanceKm: 1, live: null, official: null, alert: null,
  rain: null, history: null, danger: null, reasons: [], ...patch,
});

describe('round 3 independent peer probes', () => {
  test('web Guardian exports the serializer imported by MonitorProvider', () => {
    expect((webGuardian as Record<string, unknown>).buildGuardianHazardsFromStatuses).toEqual(expect.any(Function));
  });

  test('one out-of-coverage excursion is not hidden by dense in-area vertices', () => {
    const austin = {lat:30.2672,lon:-97.7431};
    const beyond = {lat:30.6265,lon:-96.3385};
    expect(assessRouteCoverage(austin,austin,[...Array(100).fill(austin),beyond,austin]).outsideCoverage).toBe(true);
  });

  test('same NOAA event seen from two crossings counts once despite different distance', () => {
    const history = (distance: number) => ({tier:'elevated' as const, reports:1,deaths:0,
      vehicleDeaths:0,vehicleRelated:0,lastEvent:'2015-05-24',events:[{
        date:'2015-05-24',type:'Flash Flood',dist_km:distance,deaths:0,
        vehicle_related:false,summary:'The same event near these two locations.',
      }]});
    const groups = groupPhysicalCrossings([
      base({history:history(0.2)}),
      base({id:'probe-b',lat:30.2673,history:history(0.3)}),
    ]);
    expect(countDistinctHistoryEvents(groups).distinctEvents).toBe(1);
  });

  test('Bear Creek and Bear Branch remain distinct named waterways', () => {
    expect(groupPhysicalCrossings([
      base(),base({id:'probe-b',name:'Probe Road at Bear Branch',creek:'Bear Branch',lat:30.2673}),
    ])).toHaveLength(2);
  });
});
