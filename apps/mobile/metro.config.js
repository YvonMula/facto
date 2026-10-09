// Metro configuration. Expo's defaults handle the monorepo; the only addition lets Metro
// resolve the ESM-style `./file.js` imports used inside our own TypeScript workspace packages
// (packages/*), which point at `./file.ts` sources. Third-party modules are untouched.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const workspacePackages = path.resolve(__dirname, '../../packages') + path.sep;

const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolve ?? context.resolveRequest;
  if (moduleName.startsWith('.') && moduleName.endsWith('.js') && context.originModulePath.startsWith(workspacePackages)) {
    try {
      return resolve(context, moduleName.slice(0, -3), platform);
    } catch {
      // Fall through to the original name (a real .js file).
    }
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
