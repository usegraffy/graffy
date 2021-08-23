/* eslint-disable no-console */
import { src, dst, yarnx } from './utils.js';

export default async function types(name) {
  console.log('Generating definitions for ' + name);
  await yarnx(
    'run',
    'typedef',
    '--',
    src(name, 'index.js'),
    '--outDir',
    dst(name, 'types'),
  );
}
