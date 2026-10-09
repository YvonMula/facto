import type { ExpoConfig } from 'expo/config';

/**
 * Facto app configuration. Security-relevant settings here are checked by the CI gates:
 * - permissions must match PRD 7.2 exactly (gate: permissions);
 * - no expo-updates / EAS Update: all code ships in signed builds (PRD 2, "Malicious infrastructure");
 * - no location, telemetry or push packages (gates: no-location, no-telemetry).
 * The bundle identifiers are placeholders until the legal entity exists (PRD 7.4, 10.4).
 */
const config: ExpoConfig = {
  name: 'Facto',
  slug: 'facto',
  scheme: 'facto',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#030F08',
  ios: {
    bundleIdentifier: 'app.facto.mobile',
    supportsTablet: false,
    config: { usesNonExemptEncryption: true },
    infoPlist: {
      // No App Transport Security exceptions: TLS only (PRD 7.3).
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: false },
    },
  },
  android: {
    package: 'app.facto.mobile',
    // Local data must not leave the phone through Android backups (PRD 4.2, 7.2).
    allowBackup: false,
    // Only what the shell needs. CAMERA and RECORD_AUDIO are added with the media features (Phase 3).
    permissions: ['android.permission.INTERNET'],
    blockedPermissions: [
      'com.google.android.gms.permission.AD_ID',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_PHONE_STATE',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.VIBRATE',
      // Added by expo-secure-store's library manifest; Facto has no biometric unlock in V1.
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
    ],
  },
  plugins: [
    'expo-router',
    // No biometric unlock in V1: keeps NSFaceIDUsageDescription out of Info.plist (PRD 7.2 matrix).
    // Android backup rules are not needed: allowBackup is false.
    ['expo-secure-store', { faceIDPermission: false, configureAndroidBackup: false }],
  ],
  experiments: { typedRoutes: false },
};

export default config;
