// mobile/src/demo/data/demo-data.ts — gauges, crossings, links for the Demo Edition (§21).
// Gauges: real USGS site ids + names; coordinates from the USGS/Geoconnex site records where verified (§21.3; [Unverified] coordinates are a Day-0 check).
//   READINGS ARE SIMULATED.
// Crossings: real names/locations, copied verbatim from the City of Austin's open-source ATXfloods legacy list
//   (github.com/cityofaustin/ctxfloods-backend, populateDB/data/legacyCrossings.csv, MIT).
//   STATES ARE SIMULATED. Link parameters (τ, trigger) are AUTHORED demo values, not learned from real storms.
import type { Crossing, Gauge, Link } from '../engine/types';

const G = (id: string, name: string, short: string, lat: number, lon: number, baseFt: number, o: Partial<Gauge> = {}): Gauge =>
  ({ id: `USGS-${id}`, name, short, lat, lon, baseFt, dtMin: 15, delayMin: 10, staleAfterMin: 45, nws: null, ...o });
export const GAUGES: Gauge[] = [
  G('08158922', 'Williamson Ck at Brush Cntry Blvd, Oak Hill, TX', 'Williamson Ck at Brush Country Blvd', 30.2263215, -97.8414188, 2.1),
  G('08158930', 'Williamson Ck at Manchaca Rd, Austin, TX', 'Williamson Ck at Manchaca Rd', 30.22132064, -97.7936168, 1.9),
  G('08158970', 'Williamson Ck at Jimmy Clay Rd, Austin, TX', 'Williamson Ck at Jimmy Clay Rd', 30.189, -97.733, 2.5),           // approx
  G('08158700', 'Onion Ck nr Driftwood, TX', 'Onion Ck nr Driftwood', 30.082989, -98.007786, 2.4),
  G('08158800', 'Onion Ck at Buda, TX', 'Onion Ck at Buda', 30.0860467, -97.8480606, 3.0),
  G('08158827', 'Onion Ck at Twin Creeks Rd nr Manchaca, TX', 'Onion Ck at Twin Creeks Rd', 30.12632345, -97.8211161, 3.2),
  G('08159000', 'Onion Ck at US Hwy 183, Austin, TX', 'Onion Ck at US Hwy 183', 30.177778, -97.688333, 4.2),
  G('08158840', 'Slaughter Ck at FM 1826 nr Austin, TX', 'Slaughter Ck at FM 1826', 30.2090972, -97.9033409, 1.2),
  G('08156800', 'Shoal Ck at W 12th St, Austin, TX', 'Shoal Ck at W 12th St', 30.276598, -97.7503052, 1.0),
  G('08157000', 'Waller Ck at 38th St, Austin, TX', 'Waller Ck at 38th St', 30.29715196, -97.7269497, 0.8),
  G('08154700', 'Bull Ck at Loop 360 nr Austin, TX', 'Bull Ck at Loop 360', 30.37215, -97.78473, 0.9),
  G('08158200', 'Walnut Ck at Dessau Rd, Austin, TX', 'Walnut Ck at Dessau Rd', 30.375205, -97.6605601, 1.5),
  G('08155200', 'Barton Ck at SH 71 nr Oak Hill, TX', 'Barton Ck at SH 71', 30.29631587, -97.925565, 0.5),
  G('08155400', 'Barton Ck abv Barton Spgs at Austin, TX', 'Barton Ck abv Barton Springs', 30.26354168, -97.772228, 0.4),
];

const X = (id: string, name: string, address: string, lat: number, lon: number, tier: Crossing['tier'], creek: string | null,
  creekVerified: boolean, communityId: number, legacyId: number, o: Partial<Crossing> = {}): Crossing =>
  ({ id, name, address, lat, lon, tier, creek, creekVerified, source: { dataset: 'ctxfloods-legacyCrossings', communityId, legacyId, address }, ...o });
const sp = (en: string, es: string) => ({ spoken: { en, es } });
export const CROSSINGS: Crossing[] = [
  // Williamson Creek — HERO system (rain over Oak Hill flows east past Brush Country → Westgate → Jones → Manchaca → Jimmy Clay)
  X('atx-37', 'Williamson Creek at Jones Road', '2400 Jones Rd, Austin TX 78745', 30.223421, -97.799438, 'A', 'Williamson Creek', true, 9009, 37,
    sp('Williamson Creek at Jones Road', 'Williamson Creek en Jones Road')),
  X('atx-680', 'Westgate Blvd @ Williamson Creek', '5407 West Gate Blvd, Austin, TX 78745', 30.221277, -97.804886, 'A', 'Williamson Creek', true, 9009, 680,
    sp('Westgate Boulevard at Williamson Creek', 'Westgate Boulevard en Williamson Creek')),
  X('atx-692', 'Manchaca Rd & Jones Rd', 'Manchaca Rd & Jones Rd Austin, TX 78745', 30.220797, -97.794067, 'A', null, false, 9009, 692,
    { targetGaugeId: 'USGS-08158930', overtopStageFt: 9.0, ...sp('Manchaca Road and Jones Road', 'Manchaca Road y Jones Road') }),
  X('atx-32', 'Jimmy Clay Golf Course', '5400 Jimmy Clay Dr, Austin, TX 78744', 30.189495, -97.73278, 'A', null, false, 9009, 32,
    { targetGaugeId: 'USGS-08158970', overtopStageFt: 14.0 }),
  X('atx-38', 'Williamson Creek (Kincheon Branch) at Latta Dr', '7000 Latta Dr, Austin, TX 78749', 30.216385, -97.846275, 'C', 'Kincheon Branch', true, 9009, 38,
    sp('Williamson Creek, Kincheon Branch, at Latta Drive', 'Williamson Creek, Kincheon Branch, en Latta Drive')),
  X('tc-85', 'Williamson Creek Dr @ Williamson Creek', 'Travis County, TX', 30.246428, -97.915123, 'C', 'Williamson Creek', true, 9010, 85,
    sp('Williamson Creek Drive at Williamson Creek', 'Williamson Creek Drive en Williamson Creek')),   // upstream of every gauge → not monitored
  X('tc-87', 'Mowinkle Dr @ Williamson Creek', 'Travis County, TX', 30.242262, -97.90667, 'C', 'Williamson Creek', true, 9010, 87,
    sp('Mowinkle Drive at Williamson Creek', 'Mowinkle Drive en Williamson Creek')),
  // Onion Creek — Storms-tab system
  X('hays-663', 'W RR 150 @ Onion Creek (Double Crossings)', 'Hays County', 30.083231, -98.008339, 'B', 'Onion Creek', true, 9016, 663,
    sp('West Ranch Road 150 at Onion Creek, Double Crossings', 'West Ranch Road 150 en Onion Creek, Double Crossings')),
  X('bud-1117', 'Garrison Rd @ Onion Creek', 'City of Buda', 30.09465, -97.838821, 'A', 'Onion Creek', true, 9016, 1117,
    sp('Garrison Road at Onion Creek', 'Garrison Road en Onion Creek')),
  X('tc-68', 'Old San Antonio Rd @ Onion Creek', 'Travis County, TX', 30.133249, -97.810425, 'A', 'Onion Creek', true, 9010, 68,
    sp('Old San Antonio Road at Onion Creek', 'Old San Antonio Road en Onion Creek')),
  X('tc-1626', 'Bluff Springs Rd @ Onion Creek', 'Travis County, TX', 30.159344, -97.769737, 'A', 'Onion Creek', true, 9010, 1626,
    sp('Bluff Springs Road at Onion Creek', 'Bluff Springs Road en Onion Creek')),
  X('atx-39', 'South Boggy Creek at Dittmar', 'W Dittmar Rd, Austin, TX 78748', 30.183256, -97.783516, 'C', 'South Boggy Creek', true, 9009, 39),
  // Slaughter Creek
  X('atx-120', 'Slaughter Creek Trail', '9925 FM 1826, Austin, TX 78737', 30.209352, -97.903442, 'B', null, false, 9009, 120,
    { targetGaugeId: 'USGS-08158840', overtopStageFt: 6.0 }),                         // ~35 m from the FM 1826 gauge
  X('atx-31', 'Circle C Park', '6301 W Slaughter Ln, Austin, TX 78739', 30.201567, -97.886627, 'A', null, false, 9009, 31),
  X('tc-94', 'Slaughter Creek Dr @ Tributary to Slaughter Creek', 'Travis County, TX', 30.166294, -97.82132, 'C', 'Tributary to Slaughter Creek', true, 9010, 94,
    sp('Slaughter Creek Drive at a tributary to Slaughter Creek', 'Slaughter Creek Drive en un afluente de Slaughter Creek')),
  // Central (Shoal, Waller)
  X('atx-40', 'Shoal Creek at Lamar', '910 N Lamar Blvd, Austin, TX 78703', 30.274645, -97.752441, 'B', 'Shoal Creek', true, 9009, 40),
  X('atx-41', 'Waller at 8th Street', '715 E 8th St, Austin, TX 78701', 30.268042, -97.735733, 'A', 'Waller Creek', true, 9009, 41),
  X('atx-1361', 'Red River @ 12th', '500 E 12th St, Austin, TX 78701', 30.272472, -97.735596, 'A', null, false, 9009, 1361,
    sp('Red River at 12th Street', 'Red River en la calle 12')),
  // Bull Creek
  X('atx-8', 'Low Water Crossing #10', '6700 Lakewood Dr, Austin, TX 78731', 30.366344, -97.787018, 'B', null, false, 9009, 8,
    sp('Low Water Crossing number 10, Lakewood Drive', 'Cruce bajo número 10, Lakewood Drive')),
  X('atx-33', 'Bull Creek Park', '7900 N Capital of Texas Hwy, Austin, TX 78750', 30.378298, -97.778931, 'C', null, false, 9009, 33),
  X('atx-3', 'Low Water Crossing #3', '6650 Spicewood Springs Rd, Austin, TX 78759', 30.397104, -97.7789, 'C', null, false, 9009, 3,
    sp('Low Water Crossing number 3, Spicewood Springs Road', 'Cruce bajo número 3, Spicewood Springs Road')),
  // Walnut, Barton
  X('tc-59', 'Springdale Rd @ Walnut Creek', 'Travis County, TX', 30.33741, -97.650215, 'A', 'Walnut Creek', true, 9010, 59,
    sp('Springdale Road at Walnut Creek', 'Springdale Road en Walnut Creek')),
  X('tc-1790', 'Henry Marx @ Barton Creek', 'Travis County, TX', 30.27062, -97.887207, 'A', 'Barton Creek', true, 9010, 1790,
    sp('Henry Marx at Barton Creek', 'Henry Marx en Barton Creek')),
  X('atx-716', 'Barton Springs Road', '2000 W Barton Springs Road, Austin, TX 78704', 30.264969, -97.764992, 'B', null, false, 9009, 716),
  X('tc-76', 'Fitzhugh Rd @ Barton Creek', 'Travis County, TX', 30.242487, -98.011162, 'C', 'Barton Creek', true, 9010, 76,
    sp('Fitzhugh Road at Barton Creek', 'Fitzhugh Road en Barton Creek')),
];

// watchFt = baseline + 0.6·(trigger − baseline), as C §18.4 defines it (rounded to 0.1).
// Tier B links use the C §17.13 transfer shape: p25 = 0.6·τ, p75 = 1.4·τ (rounded); nStorms = 0 (transferred, not learned).
const L = (crossingId: string, gaugeId: string, isPrimary: boolean, lag: number, p25: number, p75: number, nStorms: number,
  triggerFt: number, baselineFt: number, channelKm: number): Link => ({ crossingId, gaugeId: `USGS-${gaugeId}`, relation: 'upstream', isPrimary,
  lagMin: lag, lagP25Min: p25, lagP75Min: p75, nStorms, triggerFt, baselineFt, minRiseFt30m: 0.1, channelKm,
  watchFt: Math.round((baselineFt + 0.6 * (triggerFt - baselineFt)) * 10) / 10 });
export const LINKS: Link[] = [
  L('atx-37', '08158922', true, 40, 33, 44, 6, 6.0, 2.1, 5.3),      // HERO: τ range 30–45, trigger 6.0, watch 4.4
  L('atx-680', '08158922', true, 34, 29, 39, 6, 8.5, 2.1, 4.6),     // higher road deck → higher trigger
  L('atx-692', '08158922', true, 45, 38, 52, 6, 7.5, 2.1, 6.0),
  L('atx-32', '08158930', true, 70, 60, 82, 5, 7.0, 1.9, 9.0),
  L('atx-32', '08158922', false, 110, 95, 125, 5, 9.0, 2.1, 14.3),
  L('hays-663', '08158700', true, 10, 6, 14, 0, 6.0, 2.4, 0.3),     // tier B: gauge ~60 m away → "5–15 min"
  L('bud-1117', '08158800', true, 15, 10, 20, 5, 9.0, 3.0, 1.4),
  L('bud-1117', '08158700', false, 135, 125, 145, 5, 9.0, 2.4, 23.0),
  L('tc-68', '08158800', true, 45, 38, 52, 5, 9.0, 3.0, 8.3),
  L('tc-68', '08158827', false, 10, 6, 14, 5, 10.0, 3.2, 1.4),
  L('tc-1626', '08158827', true, 40, 33, 44, 5, 10.0, 3.2, 7.4),    // ONLY link → the gauge-silent UNKNOWN moment
  L('atx-120', '08158840', true, 5, 3, 7, 0, 4.5, 1.2, 0.04),       // tier B: at the gauge
  L('atx-31', '08158840', true, 20, 15, 25, 4, 5.0, 1.2, 2.3),
  L('atx-40', '08156800', true, 8, 5, 11, 0, 6.0, 1.0, 0.4),        // tier B
  L('atx-41', '08157000', true, 25, 20, 30, 4, 5.5, 0.8, 4.4),
  L('atx-1361', '08157000', true, 22, 17, 27, 4, 5.5, 0.8, 3.8),
  L('atx-8', '08154700', true, 10, 6, 14, 0, 5.0, 0.9, 0.8),        // tier B
  L('tc-59', '08158200', true, 45, 38, 52, 4, 8.0, 1.5, 5.5),
  L('tc-1790', '08155200', true, 50, 42, 58, 4, 7.0, 0.5, 6.5),
  L('atx-716', '08155400', true, 8, 5, 11, 0, 6.0, 0.4, 0.7),       // tier B
];
