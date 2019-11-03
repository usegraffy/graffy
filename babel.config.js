const testConf = {
  presets: [
    ['@babel/preset-env', { targets: { node: 10 } }],
    '@babel/preset-react',
  ],
};

const devConf = {
  presets: [['@babel/preset-env', { loose: true }], '@babel/preset-react'],
  plugins: [
    [
      '@babel/plugin-transform-runtime',
      { corejs: 3, regenerator: true, helpers: true, useESModules: false },
    ],
    '@babel/plugin-proposal-class-properties',
    'babel-plugin-add-module-exports',
  ],
};

// switch (process.env.npm_lifecycle_event) {
//   case 'next':
//     module.exports = nextConf;
// }

if (process.env.npm_lifecycle_event.indexOf('next') === 0) {
  console.log('Using next config');
  module.exports = {
    presets: ['next/babel'],
    plugins: [],
  };
} else if (process.env.NODE_ENV === 'test') {
  module.exports = testConf;
} else {
  module.exports = devConf;
}
