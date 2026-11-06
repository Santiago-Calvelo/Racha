module.exports = ({ config }) => {
  const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN?.trim();
  if (!domain) throw new Error('Completá EXPO_PUBLIC_AUTH0_DOMAIN en mobile/.env antes de compilar.');
  return {
    ...config,
    ios: { ...config.ios, bundleIdentifier: 'com.racha.app' },
    android: { ...config.android, package: 'com.racha.app' },
    plugins: [
      ...(config.plugins ?? []).filter(p => (Array.isArray(p) ? p[0] : p) !== 'react-native-auth0'),
      ['react-native-auth0', { domain, customScheme: 'racha' }],
    ],
  };
};
