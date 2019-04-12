module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        loose: true,
        modules: process.env.NODE_ENV === 'test' && 'auto',
      },
    ],
    ['@babel/preset-react'],
  ],
  plugins: [
    process.env.NODE_ENV === 'test'
      ? [
          '@babel/plugin-transform-runtime',
          { regenerator: true, useESModules: false },
        ]
      : undefined,
    '@babel/plugin-proposal-class-properties',
  ].filter(Boolean),
};
