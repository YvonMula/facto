import { type Gate, listFiles, listPackages, lockfilePackages, read, scanLines, type Violation } from './lib.js';

/** CLAUDE.md invariant 1, PRD 7.2 "Location isolation". */
export const LOCATION_PACKAGES = [
  'expo-location',
  'expo-task-manager',
  '@react-native-community/geolocation',
  'react-native-geolocation-service',
  'react-native-location',
  'react-native-background-geolocation',
  '@react-native-community/netinfo', // exposes SSID/BSSID, which can reveal location
];

const PATTERNS = [
  { re: /ACCESS_(FINE|COARSE|BACKGROUND)_LOCATION/, message: 'Android location permission' },
  { re: /NSLocation\w*UsageDescription|NSLocation\w*/, message: 'iOS location usage key' },
  { re: /expo-location/, message: 'expo-location reference' },
  { re: /\bGeolocation\b/, message: 'Geolocation API' },
  { re: /getCurrentPosition|watchPosition/, message: 'location API call' },
];

/**
 * Line numbers inside an Expo config `blockedPermissions: [ ... ]` array. Naming a location
 * permission there removes it from the merged manifest, which PRD 7.2 requires, so only Android
 * permission names on those lines are exempt; every other pattern still applies.
 */
export function blockedPermissionLines(text: string): Set<number> {
  const lines = new Set<number>();
  let inside = false;
  text.split('\n').forEach((line, i) => {
    if (!inside && /\bblockedPermissions\b["']?\s*:\s*\[/.test(line)) inside = true;
    if (inside) {
      lines.add(i + 1);
      if (line.includes(']')) inside = false;
    }
  });
  return lines;
}

const ANDROID_PERMISSION_ONLY = /^\s*['"]android\.permission\.ACCESS_(FINE|COARSE|BACKGROUND)_LOCATION['"],?\s*(\/\/.*)?$/;

export const noLocation: Gate = {
  name: 'no-location',
  description: 'No location permission, SDK or API call anywhere (invariant 1)',
  run(root) {
    const out: Violation[] = scanLines(this.name, root, listFiles(root), PATTERNS).filter((v) => {
      if (!/(^|\/)app\.(config\.(ts|js)|json)$/.test(v.file) || v.line === undefined) return true;
      const text = read(root, v.file);
      const exempt = blockedPermissionLines(text).has(v.line) && ANDROID_PERMISSION_ONLY.test(text.split('\n')[v.line - 1] ?? '');
      return !exempt;
    });
    for (const pkg of listPackages(root)) {
      for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
        if (LOCATION_PACKAGES.includes(dep)) out.push({ gate: this.name, file: pkg.file, message: `location package "${dep}"` });
      }
    }
    for (const dep of lockfilePackages(root)) {
      if (LOCATION_PACKAGES.includes(dep)) out.push({ gate: this.name, file: 'pnpm-lock.yaml', message: `transitive location package "${dep}"` });
    }
    return out;
  },
};
