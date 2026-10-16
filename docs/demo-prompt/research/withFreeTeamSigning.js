// FordCast Demo Edition: make the iOS project signable by a FREE Apple ID "Personal Team".
// MUST be listed FIRST in app.json "plugins": entitlement mods run in reverse registration order,
// so the first-registered plugin's entitlements action runs LAST (after expo-notifications etc.).
const { withEntitlementsPlist, withPodfile, CodeGenerator } = require('expo/config-plugins');

// Entitlements a free Personal Team cannot (or should not try to) sign.
const STRIP_KEYS = [
  'aps-environment', // Push Notifications: auto-added by expo-notifications (and expo-widgets)
  'com.apple.developer.usernotifications.time-sensitive',
  'com.apple.developer.usernotifications.critical-alerts',
  'com.apple.developer.associated-domains',
  'com.apple.developer.applesignin',
  'com.apple.developer.icloud-container-identifiers',
  'com.apple.developer.icloud-services',
  'com.apple.developer.ubiquity-kvstore-identifier',
];

const withStripPaidEntitlements = (config) =>
  withEntitlementsPlist(config, (cfg) => {
    for (const key of STRIP_KEYS) delete cfg.modResults[key];
    return cfg;
  });

// Xcode 27 rejects pod targets (incl. CocoaPods *resource bundle* targets such as RNSVG-RNSVGFilters)
// whose deployment target is below 15.0. RN 0.86.3 only raises main pod targets, so floor them all.
const withPodDeploymentTargetFloor = (config, floor) =>
  withPodfile(config, (cfg) => {
    const res = CodeGenerator.mergeContents({
      tag: 'fordcast-pod-deployment-target-floor',
      src: cfg.modResults.contents,
      newSrc: [
        '    installer.pods_project.targets.each do |t|',
        '      t.build_configurations.each do |c|',
        "        dt = c.build_settings['IPHONEOS_DEPLOYMENT_TARGET']",
        `        c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${floor}' if dt.nil? || dt.to_f < ${floor}`,
        '      end',
        '    end',
      ].join('\n'),
      anchor: /post_install do \|installer\|/,
      offset: 1,
      comment: '#',
    });
    cfg.modResults.contents = res.contents;
    return cfg;
  });

module.exports = function withFreeTeamSigning(config, props = {}) {
  config = withPodDeploymentTargetFloor(config, props.podDeploymentTargetFloor ?? '16.4');
  config = withStripPaidEntitlements(config);
  return config;
};
