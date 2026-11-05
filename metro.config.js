const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

const ZOD_LOCALES_STUB = path.join(__dirname, 'metro/zod-locales.js');
const SUPABASE_STUB = path.join(__dirname, 'metro/supabase-stub.js');
const hasServer = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
const resolveDefault = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Набір мов zod → лише англійська (див. metro/zod-locales.js)
  if (
    moduleName === '../locales/index.js' &&
    context.originModulePath.includes(`${path.sep}zod${path.sep}v4${path.sep}`)
  )
    return { type: 'sourceFile', filePath: ZOD_LOCALES_STUB };
  // Без сервера — заглушка замість бібліотеки Supabase (див. metro/supabase-stub.js)
  if (!hasServer && moduleName === '@supabase/supabase-js')
    return { type: 'sourceFile', filePath: SUPABASE_STUB };
  // У браузері URL є вбудований — поліфіл потрібен лише на телефоні
  if (platform === 'web' && moduleName === 'react-native-url-polyfill/auto')
    return { type: 'empty' };
  return (resolveDefault ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './src/global.css' });
