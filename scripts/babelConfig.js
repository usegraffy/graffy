export default function (esm) {
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
        {
          corejs: 3,
          regenerator: true,
          helpers: true,
          useESModules: esm,
        },
      ],
      ...(esm ? [] : ['babel-plugin-add-module-exports']),
    ],
  };
}
