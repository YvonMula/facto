import { defineConfig } from 'vitest/config';

// Unit tests cover platform-free logic only (src/secure, src/i18n data). Native modules are faked.
export default defineConfig({
  test: { include: ['test/**/*.test.ts'], environment: 'node' },
});
