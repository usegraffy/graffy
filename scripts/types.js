/* eslint-disable no-console */
const { src, dst, yarnx } = require('./utils.js');

module.exports = async function types(name) {
  console.log('Generating definitions for ' + name);
  await yarnx(
    'run',
    'typedef',
    '--',
    src(name, 'index.js'),
    '--outDir',
    dst(name, 'types'),
  );
};
