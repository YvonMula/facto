import { type Gate, listFiles, listPackages, lockfilePackages, scanLines, type Violation } from './lib.js';

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

export const noLocation: Gate = {
  name: 'no-location',
  description: 'No location permission, SDK or API call anywhere (invariant 1)',
  run(root) {
    const out: Violation[] = scanLines(this.name, root, listFiles(root), PATTERNS);
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
