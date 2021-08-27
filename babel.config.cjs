/* We support environments where async iterators are available. */

/*
  IMPORTANT: This config is not used for building the NPM package.
  That is in scripts/babelConfig.js

  This file is used by Next.js and for running tests.
*/

const testConf = {
  presets: [
    ['@babel/preset-env', { targets: ['current node'] }],
    '@babel/preset-react',
  ],
};

if (process.env.NEXTJS) {
  module.exports = {
    presets: ['next/babel'],
    plugins: [],
  };
} else {
  module.exports = testConf;
}
