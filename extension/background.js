/*
 * FordCast for Google Maps — service worker.
 * Relays network requests for the content script so they run with the extension's
 * host_permissions instead of the google.com page origin / page CSP.
 */
const ALLOWED_HOSTS = new Set([
  'api.atxfloods.com',
  'api.waterdata.usgs.gov',
  'api.weather.gov',
  'valhalla1.openstreetmap.de',
  'photon.komoot.io',
]);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== 'fordcast-fetch') return false;
  let host;
  try {
    host = new URL(msg.url).hostname;
  } catch (e) {
    sendResponse({ ok: false, status: 0, error: 'bad url' });
    return false;
  }
  if (!ALLOWED_HOSTS.has(host)) {
    sendResponse({ ok: false, status: 0, error: 'host not allowed' });
    return false;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), msg.timeoutMs || 20000);
  fetch(msg.url, {
    method: msg.method || 'GET',
    headers: msg.headers || {},
    body: msg.body,
    signal: ctrl.signal,
  })
    .then(async (res) => {
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (e) {
        /* non-JSON body */
      }
      sendResponse({ ok: res.ok, status: res.status, data });
    })
    .catch((err) => sendResponse({ ok: false, status: 0, error: String(err && err.message || err) }))
    .finally(() => clearTimeout(timer));
  return true; // async response
});
