module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // React Native Reanimated for smooth animations
      'react-native-reanimated/plugin',
      // Optimize imports for better tree-shaking
      [
        'module-resolver',
        {
          root: ['.'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './',
            '@components': './components',
            '@constants': './constants',
            '@context': './context',
            '@hooks': './hooks',
            '@lib': './lib',
            '@services': './services',
          },
        },
      ],
      // Transform named imports to direct requires for performance
      [
        'transform-inline-environment-variables',
        {
          include: ['NODE_ENV'],
        },
      ],
    ],
    env: {
      production: {
        plugins: [
          // Remove console.log in production
          [
            'transform-remove-console',
            {
              exclude: ['error', 'warn'],
            },
          ],
          // Optimize React for production
          'transform-react-remove-prop-types',
        ],
      },
    },
  };
};
