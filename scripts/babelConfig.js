module.exports = function (esm) {
  return {
    configFile: false,
    babelrc: false,
    presets: [
      [
        '@babel/preset-env',
        {
          targets: ['defaults'],
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
              useESModules: false,
            },
      ],
      ...(esm ? [] : ['babel-plugin-add-module-exports']),
    ],
  };
};
