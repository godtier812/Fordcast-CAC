import fs from 'node:fs';
const root = new URL('../../../', import.meta.url);
const gauges = JSON.parse(fs.readFileSync(new URL('mobile/assets/seed/gauges.json',root),'utf8')).features;
const now = new Date();
const start = new Date(+now-3*3600_000).toISOString().replace(/\.\d{3}Z$/,'Z');
const queries = [
  ['ATXFloods', 'https://api.atxfloods.com/api/closures', {}],
  ['NWS', 'https://api.weather.gov/alerts/active?area=TX', {headers:{Accept:'application/geo+json'}}],
  ['USGS', `https://api.waterdata.usgs.gov/ogcapi/v1/collections/continuous/items?f=json&limit=10000&parameter_code=00065&monitoring_location_id=${gauges.map(g=>g.properties.id).join(',')}&time=${start}/..`, {headers:{Accept:'application/geo+json'}}],
  ['Valhalla', 'https://valhalla1.openstreetmap.de/route', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({locations:[{lat:30.2672,lon:-97.7431},{lat:30.1755,lon:-97.7429}],costing:'auto',directions_options:{units:'kilometers'}})}],
  ['Photon', 'https://photon.komoot.io/api/?q=Downtown%20Austin&limit=3&lat=30.2672&lon=-97.7431', {}],
];
const results = await Promise.all(queries.map(async ([name,url,init])=>{const t=Date.now();try{const r=await fetch(url,{...init,signal:AbortSignal.timeout(12000)});const j=await r.json();return {name,ok:r.ok,status:r.status,ms:Date.now()-t,count:j.attributes?.length??j.features?.length??null,returnedGaugeCount:name==='USGS'?new Set((j.features??[]).map(f=>f.properties?.monitoring_location_id)).size:undefined,routeSummary:j.trip?.summary??undefined,shapePresent:!!j.trip?.legs?.[0]?.shape};}catch(e){return {name,ok:false,ms:Date.now()-t,error:String(e.message)};}}));
const report={checkedAt:now.toISOString(),scope:'Public fixed Austin coordinates only. Endpoint reachability and payload shape, not browser CORS, source truth, field safety, or service availability tomorrow.',results};
fs.writeFileSync(new URL('feed-smoke-results.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
