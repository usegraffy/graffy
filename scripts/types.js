/* eslint-disable no-console */
import { src, dst, yarnx } from './utils.js';

export default async function types(name) {
  try {
    await yarnx(
      'run',
      'typedef',
      '--',
      src(name, 'index.js'),
      '--outDir',
      dst(name, 'types'),
    );
    console.log(`INFO [${name}] generated definitions`);
  } catch (e) {
    console.error(`INFO [${name}] generating definitions failed`);
    console.error(e.message);
  }
}
