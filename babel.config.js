/* We support environments where async iterators are available. */

const canUse = require('caniuse-api');

function browsersWith(features) {
  const support = features
    .map((feature) => canUse.getSupport(feature))
    .map((support) =>
      Object.entries(support).reduce((sup, [browser, { y }]) => {
        if (y) sup[browser] = y;
        return sup;
      }, {}),
    )
    .reduce((allSupport, support) => {
      if (!allSupport) return support;
      Object.keys(support).forEach((browser) => {
        if (!allSupport[browser]) return;
        allSupport[browser] = Math.max(allSupport[browser], support[browser]);
      });
      return allSupport;
    }, undefined);

  return Object.entries(support).map(
    ([browser, version]) => `${browser} >= ${version}`,
  );
}
// 'and_chr >= 81\n' +

const testConf = {
  presets: [
    ['@babel/preset-env', { targets: ['current node'] }],
    '@babel/preset-react',
  ],
};

const devConf = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: [
          'maintained node versions',
          ...browsersWith(['async-iterations-and-generators']),
        ],
        loose: true,
      },
    ],
    '@babel/preset-react',
  ],
  plugins: [
    [
      '@babel/plugin-transform-runtime',
      { corejs: 3, regenerator: false, helpers: true, useESModules: false },
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
