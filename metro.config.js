const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

// Expo's default config plus Sentry debug IDs, so crash stack traces map back to source.
let config = getSentryExpoConfig(__dirname);
config = withNativeWind(config, { input: './tailwind.css' });

const reactNativeMapsWebStub = path.resolve(
  __dirname,
  'shims/react-native-maps.web.tsx',
);
const previousResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { type: 'sourceFile', filePath: reactNativeMapsWebStub };
  }
  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
