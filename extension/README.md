# FordCast for Google Maps (Chrome extension, experimental)

Adds a small FordCast panel to **Google Maps** (`https://www.google.com/maps/*`). People who
navigate with Google Maps instead of the FordCast app can still see flooded or closed Austin-area
low-water crossings, and get a route around them.

> **Experimental · not official.** Never drive into water. Obey barricades. Official closures are
> published at <https://www.atxfloods.com>.

## Install (unpacked)

1. Open `chrome://extensions` in Chrome (or `edge://extensions` in Edge).
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and pick this `extension/` folder.
4. Open <https://www.google.com/maps> and look for the FordCast panel in the top-right corner.

If you change the FordCast seed data, run `node tools/build_extension_data.mjs` from the repo root
to regenerate `data.js`, then click the reload icon on the extension card.

## What it does

- **In this map view**: reads the map centre and zoom from the URL (`@lat,lon,15z`) and lists up
  to 8 crossings in view that are
  - **officially closed** on ATXfloods,
  - flagged by a **FordCast stream-sensor warning** (upstream USGS gauge above its trigger level and
    rising — the same rule as the FordCast app, `mobile/src/lib/live.ts`), or rising toward it
    (caution), or
  - inside an NWS **Flash Flood Warning / Emergency** polygon.

  If nothing is flagged, it says "No closures or sensor warnings reported in this view".
- **Your route**: on a directions URL (`/maps/dir/...`) it reads the start, stops and destination
  (from the URL's coordinates, or by geocoding the place names with Photon), rebuilds the driving
  route with the public OpenStreetMap router (Valhalla) and checks for flagged crossings within
  40 m of it.
  - If any are found it shows a red banner for each, asks Valhalla for a route that avoids them,
    and shows **Safer route: +N min** with a button that takes you to the same trip in Google Maps
    with up to 3 extra waypoints. Those waypoints are the points where the new route is farthest
    from the original one, so Google follows the detour.
  - If none are found it shows "No reported hazards on this route" and how many FordCast-watched
    crossings the route passes.
- Data refreshes every 5 minutes, and when the URL changes (at most once a minute).
- If a source can't be reached, the panel says "Couldn't reach <source>" and keeps working with
  the other sources.

## Data sources (free, no API keys)

| Source | Used for |
| --- | --- |
| ATXfloods `api.atxfloods.com/api/closures`, `/api/crossings` | Official closures, crossing locations |
| USGS Water Data `api.waterdata.usgs.gov` (parameter 00065) | Live gauge height for FordCast sensor warnings |
| NWS `api.weather.gov/alerts/active?area=TX` | Flash Flood Warning / Emergency polygons, flood warnings and advisories |
| Valhalla `valhalla1.openstreetmap.de` | Route rebuild and routing around flagged crossings |
| Photon `photon.komoot.io` | Turning place names in directions URLs into coordinates |

Network requests go through the extension's service worker (`background.js`), which uses the
extension's `host_permissions`. If the worker isn't available, the content script calls the APIs
directly (they all allow CORS).

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | MV3 manifest |
| `data.js` | Generated FordCast crossings, gauge links and gauge IDs (`tools/build_extension_data.mjs`) |
| `lib.js` | Pure logic: polyline6 decoding, point-in-polygon, distance to a route, URL parsing, live sensor rule, Google URL builder, max-deviation waypoint picker, hazard classification |
| `fordcast.js` | Content script: shadow-DOM panel, polling, routing |
| `background.js` | Service worker that forwards fetches |
| `panel.css` | Positions the panel's host element (the panel's own styles live in its shadow root) |
| `icons/`, `make_icons.mjs` | Icons and the zero-dependency script that draws them |
| `test.mjs` | Unit tests: `node extension/test.mjs` |
| `smoke.mjs` | Live end-to-end check against the real APIs: `node extension/smoke.mjs [lat,lon] [lat,lon]` |

## Limitations

- **Experimental, not an official warning system.** A crossing with nothing reported can still be
  flooded. Barricades and official closures always win.
- **Austin area only.** It covers ATXfloods crossings plus the 141 FordCast crossings. Sensor
  warnings exist only for the crossings with a calibrated upstream USGS gauge link.
- **The Google Maps page is left untouched.** The extension only adds its own floating panel. It
  doesn't draw on Google's map or change Google's route. The route check uses an OpenStreetMap
  rebuild of your trip, which can differ from the line Google draws.
- **Only 3 waypoints** go into the Google Maps link (a limit of the Google Maps URL format), so a
  route with many separate detours may not follow the alternative exactly.
- "Your location" as a start point can't be read from the URL. Type an address or pick a point.
- Uses free public demo servers (Valhalla, Photon), which may rate-limit or be unavailable.
