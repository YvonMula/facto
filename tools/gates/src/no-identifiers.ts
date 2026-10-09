import { type Gate, listFiles, scanLines } from './lib.js';

/** CLAUDE.md invariant 2; facto-security-review check 2. Any read of these values in shipped code fails. */
const PATTERNS = [
  { re: /\b(req|request)\.ip\b|\b(req|request)\.ips\b/, message: 'reads the client IP address' },
  { re: /x-forwarded-for|x-real-ip|cf-connecting-ip|true-client-ip/i, message: 'reads a client IP header' },
  { re: /remoteAddress/, message: 'reads the socket remote address' },
  { re: /['"]user-agent['"]|\buserAgent\b/i, message: 'reads the user agent' },
  { re: /getUniqueId|getAndroidId|androidId|advertisingId|\bIDFA\b|getIosIdForVendorAsync|installationId/, message: 'reads a device or install identifier' },
];

export const noIdentifiers: Gate = {
  name: 'no-identifiers',
  description: 'No IP, user agent, device, install or advertising identifier read in code (invariant 2)',
  run(root) {
    const files = listFiles(root).filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f));
    return scanLines(this.name, root, files, PATTERNS);
  },
};
