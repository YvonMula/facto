import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { type Gate, listPackages, lockfilePackages, read, type Violation } from './lib.js';

/** CLAUDE.md invariant 3; facto-security-review check 3. Matched against direct and transitive packages. */
export const TELEMETRY_DENYLIST: (string | RegExp)[] = [
  'firebase',
  /^@firebase\//,
  /^@react-native-firebase\//,
  /^@sentry\//,
  'sentry-expo',
  /^@?amplitude/,
  /^@amplitude\//,
  /mixpanel/,
  /posthog/,
  /^@segment\//,
  /onesignal/i,
  'expo-notifications',
  'expo-updates',
  'expo-insights',
  /google-analytics/,
  /^@react-native-google-analytics/,
  /^react-native-fbsdk/,
  /^react-native-google-mobile-ads/,
  /^@bugsnag\//,
  /^@datadog\//,
  /^@supabase\//,
];

/** CLAUDE.md invariant 2: packages whose purpose is a stable device or install identifier. */
export const IDENTIFIER_DENYLIST: (string | RegExp)[] = [
  'expo-application',
  'react-native-device-info',
  'expo-tracking-transparency',
  /advertising-id/,
];

const matches = (name: string, list: (string | RegExp)[]) =>
  list.some((p) => (typeof p === 'string' ? p === name : p.test(name)));

export const CI_WORKFLOW = '.github/workflows/ci.yml';

export const noTelemetry: Gate = {
  name: 'no-telemetry',
  description: 'No third-party telemetry, push, OTA updates or device-identifier SDKs (invariants 2 and 3)',
  run(root) {
    const out: Violation[] = [];
    const check = (dep: string, file: string, kind: string) => {
      if (matches(dep, TELEMETRY_DENYLIST)) out.push({ gate: this.name, file, message: `${kind} telemetry/push/OTA package "${dep}"` });
      if (matches(dep, IDENTIFIER_DENYLIST)) out.push({ gate: this.name, file, message: `${kind} device-identifier package "${dep}"` });
    };
    for (const pkg of listPackages(root)) {
      for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) check(dep, pkg.file, 'direct');
    }
    for (const dep of lockfilePackages(root)) check(dep, 'pnpm-lock.yaml', 'transitive');

    if (!existsSync(join(root, CI_WORKFLOW))) {
      out.push({ gate: this.name, file: CI_WORKFLOW, message: 'CI workflow missing' });
    } else if (!/EXPO_NO_TELEMETRY:\s*['"]?1/.test(read(root, CI_WORKFLOW))) {
      out.push({ gate: this.name, file: CI_WORKFLOW, message: 'EXPO_NO_TELEMETRY=1 is not set for CI' });
    }
    return out;
  },
};
