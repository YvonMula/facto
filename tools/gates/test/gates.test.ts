import { describe, expect, it } from 'vitest';
import { noLocation } from '../src/no-location.js';
import { noTelemetry } from '../src/no-telemetry.js';
import { noIdentifiers } from '../src/no-identifiers.js';
import { depsReviewed } from '../src/deps-reviewed.js';
import { claims } from '../src/claims.js';
import { i18n } from '../src/i18n.js';
import { lockfilePackages } from '../src/lib.js';
import { CI_OK, depsTable, makeRepo, pkg } from './helpers.js';

const LOCK = `lockfileVersion: '9.0'

packages:

  '@scope/thing@1.0.0':
    resolution: {integrity: sha512-x}

  plain-pkg@2.3.4(react@19.0.0):
    resolution: {integrity: sha512-y}
`;

describe('lockfilePackages', () => {
  it('reads scoped and plain package names, including peer-suffixed entries', () => {
    const root = makeRepo({ 'pnpm-lock.yaml': LOCK });
    expect([...lockfilePackages(root)].sort()).toEqual(['@scope/thing', 'plain-pkg']);
  });
});

describe('no-location', () => {
  it('passes clean code', () => {
    const root = makeRepo({ 'package.json': pkg(), 'apps/mobile/a.ts': 'export const area = "Gombe";' });
    expect(noLocation.run(root)).toEqual([]);
  });
  it.each([
    ['apps/mobile/a.ts', 'navigator.geolocation.getCurrentPosition(cb)'],
    ['apps/mobile/app.json', '{"permissions":["ACCESS_FINE_LOCATION"]}'],
    ['apps/mobile/Info.plist', '<key>NSLocationWhenInUseUsageDescription</key>'],
    ['packages/x/b.ts', "import * as L from 'expo-location';"],
  ])('fails on %s', (file, content) => {
    const root = makeRepo({ 'package.json': pkg(), [file]: content });
    expect(noLocation.run(root).length).toBeGreaterThan(0);
  });
  it('fails on a direct location dependency', () => {
    const root = makeRepo({ 'package.json': pkg(), 'apps/mobile/package.json': pkg({ 'expo-location': '1' }) });
    expect(noLocation.run(root).some((v) => v.message.includes('expo-location'))).toBe(true);
  });
  it('fails on a transitive location dependency in the lockfile', () => {
    const root = makeRepo({ 'package.json': pkg(), 'pnpm-lock.yaml': "packages:\n\n  expo-location@19.0.0:\n    resolution: {}\n" });
    expect(noLocation.run(root).some((v) => v.file === 'pnpm-lock.yaml')).toBe(true);
  });
});

describe('no-telemetry', () => {
  const ci = { '.github/workflows/ci.yml': CI_OK };
  it('passes clean dependencies with telemetry disabled in CI', () => {
    const root = makeRepo({ ...ci, 'package.json': pkg({ zod: '1' }) });
    expect(noTelemetry.run(root)).toEqual([]);
  });
  it.each(['@sentry/react-native', 'firebase', 'expo-updates', 'expo-notifications', 'posthog-react-native', 'expo-application', '@supabase/supabase-js'])(
    'fails on %s',
    (dep) => {
      const root = makeRepo({ ...ci, 'package.json': pkg({ [dep]: '1' }) });
      expect(noTelemetry.run(root).length).toBe(1);
    },
  );
  it('fails on a transitive telemetry package', () => {
    const root = makeRepo({ ...ci, 'package.json': pkg(), 'pnpm-lock.yaml': "packages:\n\n  '@sentry/core@8.0.0':\n    resolution: {}\n" });
    expect(noTelemetry.run(root)).toHaveLength(1);
  });
  it('fails when CI does not disable Expo telemetry', () => {
    const root = makeRepo({ 'package.json': pkg(), '.github/workflows/ci.yml': 'env: {}\n' });
    expect(noTelemetry.run(root)[0]?.message).toMatch(/EXPO_NO_TELEMETRY/);
  });
});

describe('no-identifiers', () => {
  it('passes clean server code', () => {
    const root = makeRepo({ 'services/api/a.ts': 'app.post("/intake", (req) => open(req.body));' });
    expect(noIdentifiers.run(root)).toEqual([]);
  });
  it.each([
    'log(req.ip)',
    "const ip = request.headers['x-forwarded-for']",
    'socket.remoteAddress',
    "request.headers['user-agent']",
    'await Application.getAndroidId()',
  ])('fails on %s', (code) => {
    const root = makeRepo({ 'services/api/a.ts': code });
    expect(noIdentifiers.run(root).length).toBeGreaterThan(0);
  });
});

describe('deps-reviewed', () => {
  it('passes when every dependency is approved', () => {
    const root = makeRepo({
      'package.json': pkg({}, { vitest: '1' }),
      'packages/a/package.json': pkg({ zod: '1', '@facto/schema': 'workspace:*' }),
      'DEPENDENCIES.md': depsTable(['zod', 'APPROVED'], ['vitest', 'APPROVED-DEV']),
    });
    expect(depsReviewed.run(root)).toEqual([]);
  });
  it('fails on an unreviewed dependency', () => {
    const root = makeRepo({ 'package.json': pkg({ leftpad: '1' }), 'DEPENDENCIES.md': depsTable() });
    expect(depsReviewed.run(root)[0]?.message).toMatch(/not reviewed/);
  });
  it('fails on a dev-only approval used at runtime', () => {
    const root = makeRepo({ 'package.json': pkg({ vitest: '1' }), 'DEPENDENCIES.md': depsTable(['vitest', 'APPROVED-DEV']) });
    expect(depsReviewed.run(root)[0]?.message).toMatch(/only approved for development/);
  });
  it('fails while any row needs human review', () => {
    const root = makeRepo({ 'package.json': pkg(), 'DEPENDENCIES.md': depsTable(['maybe', 'NEEDS-HUMAN-REVIEW']) });
    expect(depsReviewed.run(root)[0]?.message).toMatch(/human review/);
  });
  it('fails on a rejected dependency', () => {
    const root = makeRepo({ 'package.json': pkg({ bad: '1' }), 'DEPENDENCIES.md': depsTable(['bad', 'REJECTED']) });
    expect(depsReviewed.run(root)[0]?.message).toMatch(/rejected/);
  });
});

describe('claims', () => {
  it('passes approved wording', () => {
    const root = makeRepo({
      'apps/mobile/src/i18n/locales/en.json': '{"a":"Facto does not ask for your name, phone number, email or location, and does not store your IP address."}',
    });
    expect(claims.run(root)).toEqual([]);
  });
  it.each(['100% anonymous', 'Totally untraceable', '100 % anonyme', 'Intraçable', 'impossible to track you'])('fails on "%s"', (text) => {
    const root = makeRepo({ 'apps/mobile/src/i18n/locales/fr.json': JSON.stringify({ a: text }) });
    expect(claims.run(root).length).toBeGreaterThan(0);
  });
});

describe('i18n', () => {
  const L = 'apps/mobile/src/i18n/locales';
  it('passes matching locales and known keys', () => {
    const root = makeRepo({
      [`${L}/en.json`]: '{"home":{"title":"Home"},"n_one":"1 case","n_other":"{{count}} cases"}',
      [`${L}/fr.json`]: '{"home":{"title":"Accueil"},"n_one":"1 cas","n_other":"{{count}} cas"}',
      'apps/mobile/app/index.tsx': "t('home.title'); t('n', { count })",
    });
    expect(i18n.run(root)).toEqual([]);
  });
  it('fails on a key missing in French', () => {
    const root = makeRepo({ [`${L}/en.json`]: '{"a":"A","b":"B"}', [`${L}/fr.json`]: '{"a":"A"}' });
    expect(i18n.run(root)[0]?.message).toMatch(/missing key "b"/);
  });
  it('fails on an empty translation', () => {
    const root = makeRepo({ [`${L}/en.json`]: '{"a":"A"}', [`${L}/fr.json`]: '{"a":""}' });
    expect(i18n.run(root)[0]?.message).toMatch(/empty/);
  });
  it('fails on a t() key with no translation', () => {
    const root = makeRepo({ [`${L}/en.json`]: '{"a":"A"}', [`${L}/fr.json`]: '{"a":"A"}', 'apps/mobile/app/x.tsx': "t('nope')" });
    expect(i18n.run(root)[0]?.message).toMatch(/nope/);
  });
});
