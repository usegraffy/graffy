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
    [
      '@babel/plugin-transform-runtime',
      { regenerator: true, useESModules: process.env.NODE_ENV !== 'test' },
    ],
    '@babel/plugin-proposal-class-properties',
  ],
};
