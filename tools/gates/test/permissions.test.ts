import { describe, expect, it } from 'vitest';
import { ANDROID_MANIFEST, ANDROID_REQUIRED_REMOVALS, checkMergedManifest, permissions } from '../src/permissions.js';
import { makeRepo } from './helpers.js';

const manifest = (extra = '', removals = ANDROID_REQUIRED_REMOVALS) => `<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="android.permission.CAMERA"/>
${removals.map((r) => `  <uses-permission android:name="${r}" tools:node="remove"/>`).join('\n')}
${extra}
</manifest>`;

const plist = (extra = '') => `<plist><dict>
  <key>CFBundleName</key><string>Facto</string>
  <key>NSCameraUsageDescription</key><string>x</string>
${extra}
</dict></plist>`;

const repo = (m: string, p: string) =>
  makeRepo({ [ANDROID_MANIFEST]: m, 'apps/mobile/ios/Facto/Info.plist': p, 'apps/mobile/package.json': '{}' });

describe('permissions', () => {
  it('passes a manifest and plist that match the matrix', () => {
    expect(permissions.run(repo(manifest(), plist()))).toEqual([]);
  });
  it('fails on an extra Android permission', () => {
    const v = permissions.run(repo(manifest('  <uses-permission android:name="android.permission.READ_CONTACTS"/>'), plist()));
    expect(v[0]?.message).toMatch(/READ_CONTACTS/);
  });
  it('fails when AD_ID is not explicitly removed', () => {
    const v = permissions.run(repo(manifest('', ANDROID_REQUIRED_REMOVALS.filter((r) => !r.endsWith('AD_ID'))), plist()));
    expect(v[0]?.message).toMatch(/AD_ID/);
  });
  it('fails on a location usage key in Info.plist', () => {
    const v = permissions.run(repo(manifest(), plist('<key>NSLocationWhenInUseUsageDescription</key><string>x</string>')));
    expect(v.some((x) => /NSLocation/.test(x.message))).toBe(true);
  });
  it('fails on an unlisted iOS usage key and background modes', () => {
    const v = permissions.run(repo(manifest(), plist('<key>NSContactsUsageDescription</key><string>x</string><key>UIBackgroundModes</key><array/>')));
    expect(v).toHaveLength(2);
  });
  it('fails when prebuild output is missing', () => {
    const v = permissions.run(makeRepo({ 'apps/mobile/package.json': '{}' }));
    expect(v.map((x) => x.message).join()).toMatch(/prebuild/);
  });
  it('skips when there is no mobile app yet', () => {
    expect(permissions.run(makeRepo({ 'package.json': '{}' }))).toEqual([]);
  });
});

describe('permissions, merged manifest mode', () => {
  const merged = (extra: string) => `<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="app.facto.mobile">
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="app.facto.mobile.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"/>
${extra}
</manifest>`;
  it('passes when only matrix permissions and the app-private receiver permission remain', () => {
    expect(checkMergedManifest(merged(''), 'm.xml')).toEqual([]);
  });
  it('fails on a permission a library merged in', () => {
    const v = checkMergedManifest(merged('  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>'), 'm.xml');
    expect(v[0]?.message).toMatch(/ACCESS_NETWORK_STATE/);
  });
  it('fails on AD_ID or location surviving the merge', () => {
    expect(checkMergedManifest(merged('  <uses-permission android:name="com.google.android.gms.permission.AD_ID"/>'), 'm.xml')).toHaveLength(1);
    expect(checkMergedManifest(merged('  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>'), 'm.xml')).toHaveLength(1);
  });
  it('does not accept another package\'s receiver permission', () => {
    expect(checkMergedManifest(merged('  <uses-permission android:name="com.other.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"/>'), 'm.xml')).toHaveLength(1);
  });
});
