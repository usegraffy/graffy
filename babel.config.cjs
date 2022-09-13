/* We support environments where async iterators are available. */

/*
  IMPORTANT: This config is not used for building the NPM package.
  That is done by Vite.js without using Babel.

  This file is used for running tests.
*/

module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-react'],
  targets: {
    esmodules: true,
  },
};
