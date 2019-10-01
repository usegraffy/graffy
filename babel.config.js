const testConf = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 10,
        },
      },
    ],
    ['@babel/preset-react'],
  ],
};

const devConf = {
  presets: [
    [
      '@babel/preset-env',
      {
        loose: true,
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

if (process.env.NODE_ENV === 'test') {
  module.exports = testConf;
} else {
  module.exports = devConf;
}
