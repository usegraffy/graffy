module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        loose: true,
        debug: true,
      },
    ],
    ['@babel/preset-react'],
  ],
  plugins: [
    [
      '@babel/plugin-transform-runtime',
      { corejs: 3, regenerator: true, helpers: true, useESModules: false },
    ],
    '@babel/plugin-proposal-class-properties',
    'babel-plugin-add-module-exports',
  ],
};
