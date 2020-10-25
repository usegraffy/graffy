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

module.exports = function (esm) {
  return {
    configFile: false,
    babelrc: false,
    presets: [
      [
        '@babel/preset-env',
        {
          targets: esm
            ? [
                'maintained node versions',
                ...browsersWith(
                  esm
                    ? ['async-iterations-and-generators', 'es6-module']
                    : ['async-iterations-and-generators'],
                ),
              ]
            : ['defaults'],
          ...(esm ? { modules: false } : {}),
          loose: true,
        },
      ],
      '@babel/preset-react',
    ],
    plugins: [
      [
        '@babel/plugin-transform-runtime',
        esm
          ? {
              corejs: false,
              regenerator: false,
              helpers: true,
              useESModules: true,
            }
          : {
              corejs: 3,
              regenerator: true,
              helpers: true,
              useESModules: true,
            },
      ],
      ...(esm ? [] : ['babel-plugin-add-module-exports']),
    ],
  };
};
