// mobile/app.config.ts — FordCast Demo Edition (iOS only, free Personal Team)
import type { ConfigContext, ExpoConfig } from 'expo/config';

// §9.1 rule 2 — set ONCE on Day 1 (com.<lastname>2026.fordcast, lowercase), then never change it: a free team gets
// 10 App IDs per 7 days. Until it is set, every expo command stops here, so no placeholder ID can reach Xcode.
// (The cloud agent sets FORDCAST_ALLOW_PLACEHOLDER_ID=1 only to run prebuild checks; nothing is signed there.)
const BUNDLE_ID = 'com.yourlastname2026.fordcast';
if (BUNDLE_ID.includes('yourlastname') && process.env.FORDCAST_ALLOW_PLACEHOLDER_ID !== '1')
  throw new Error('Set BUNDLE_ID in mobile/app.config.ts to com.<lastname>2026.fordcast before any build (02 §9.1 rule 2).');

// Path B (Xcode 27 + iOS 27) needs UIScene support; Path A (Xcode 26) may leave it off. Set once from §8.3.
const XCODE_27 = process.env.FORDCAST_XCODE27 !== '0';            // default ON (safe on both paths after the smoke test)
const INTER = ['400Regular', '500Medium', '600SemiBold', '700Bold']
  .map((w) => `node_modules/@expo-google-fonts/inter/${w}/Inter_${w}.ttf`);   // [Verified: @expo-google-fonts/inter@0.4.2 layout]

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'FordCast',
  slug: 'fordcast',
  scheme: 'fordcast',                                   // fordcast://crossing/<id> (notification taps)
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',                           // night-first, dark only
  backgroundColor: '#0E1726',
  icon: './assets/images/icon.png',
  ios: {
    bundleIdentifier: BUNDLE_ID,                        // §9.1 rule 2 — never change after the first build
    supportsTablet: false,
    icon: './assets/expo.icon',                         // template's Icon Composer file (§14 replaces its layers)
    infoPlist: {
      LSApplicationQueriesSchemes: ['comgooglemaps', 'waze'],   // "Show detour in…" menu checks (Info.plist only)
      CFBundleAllowMixedLocalizations: true,
    },
    // appleTeamId: 'XXXXXXXXXX',                       // optional (§9.8): leave commented unless signing asks for it
  },
  locales: { es: './locales/app.es.json' },            // Spanish system permission text (§9.6)
  plugins: [
    './plugins/withFreeTeamSigning',                    // MUST stay FIRST (§9.5) — strips aps-environment etc.
    'expo-router',
    ['expo-splash-screen', { backgroundColor: '#0E1726', image: './assets/images/splash-icon.png', imageWidth: 76 }],
    ['expo-font', { fonts: INTER }],
    '@maplibre/maplibre-react-native',                  // REQUIRED: injects $MLRN.post_install into the Podfile
    ['expo-build-properties', { ios: { enableSceneSupport: XCODE_27 } }],
    ['expo-location', {
      locationWhenInUsePermission:
        'FordCast uses your location to show crossings near you and on your route. Your location stays on your phone.',
    }],
    ['expo-localization', { supportedLocales: { ios: ['en', 'es'] } }],
    // expo-notifications is NOT listed: prebuild auto-applies it anyway (§9.5). If you ever list it, put it AFTER
    // the signing plugin. Never add `sounds`, never add 'expo-widgets' unless §10.3's spike passed.
  ],
  experiments: { typedRoutes: true, reactCompiler: false },   // React Compiler OFF (template default is true)
  extra: { builtAt: new Date().toISOString() },         // Director status line "built … · rebuild by …" (§24.6); read via expo-constants
});
