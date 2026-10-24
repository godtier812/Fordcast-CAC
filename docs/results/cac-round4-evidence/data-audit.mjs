import fs from 'node:fs';
const root = new URL('../../../', import.meta.url);
const read = p => JSON.parse(fs.readFileSync(new URL(p, root), 'utf8'));
const trips = read('mobile/assets/demo/trips.json').trips;
const study = read('mobile/assets/seed/crossings.json').features;
const regional = read('mobile/assets/seed/official_crossings.json').crossings;
const history = read('mobile/assets/history/crossing_history.json');
const links = read('mobile/assets/seed/links.json');
const results = read('mobile/assets/results/results.json');
const km = (a,b) => { const r = Math.PI/180; const s=Math.sin((b[0]-a[0])*r/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin((b[1]-a[1])*r/2)**2;return 12742*Math.asin(Math.min(1,Math.sqrt(s)));};
const sum = coords => coords.reduce((n,p,i)=>n+(i?km(coords[i-1],p):0),0);
const output = {
  counts: {study:study.length,regional:regional.length,historyEvents:history.total_events_in_area,historyPeriod:history.period,primaryLinks:links.filter(x=>x.is_primary).map(x=>({crossing:x.crossing_id,gauge:x.gauge_id}))},
  metrics: Object.fromEntries(Object.entries(results.methods).filter(([,v])=>v?.avoid).map(([k,v])=>[k,v.avoid.pooled])),
  exampleRecords: study.filter(x=>['tc-167','atx-19','atx-20','atx-21'].includes(x.properties.id)).map(x=>({id:x.properties.id,name:x.properties.name,creek:x.properties.creek,coords:x.geometry.coordinates,review:x.properties.review_status})),
  trips: trips.map(t=>{const speed=sum(t.baseline.coords)/50;const decision=sum(t.baseline.coords.slice(0,t.decisionIndex+1));const detourTotal=t.reroute?decision+sum(t.reroute.coords):sum(t.baseline.coords);return {storm:t.stormId,crossing:t.crossingId,name:t.crossingName,trigger:t.trigger,decisionSeconds:decision/speed,expectedTriggerSeconds:decision/speed-3,expectedArrivalSecondsWithDetour:detourTotal/speed,baselineMin:t.baseline.min,detourMin:t.reroute?.min,hasDetour:!!t.reroute};}),
  studyMetadataPresent: study.filter(x=>x.properties.review_status==='unverified_road_and_topology').length,
};
fs.writeFileSync(new URL('data-summary.json',import.meta.url),JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
