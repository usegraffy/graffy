/* eslint-disable no-console */
import { src, dst, yarnx } from './utils.js';

export default async function types(name) {
  try {
    await yarnx(
      'run',
      'tsc',
      '--allowJs',
      '--incremental',
      '--tsBuildInfoFile',
      src(name, '.tsbuildinfo'),
      '--declaration',
      '--emitDeclarationOnly',
      '--outDir',
      dst(name, 'types'),
      src(name, 'index.js'),
    );
    console.log(`INFO [${name}] generated declarations`);
  } catch (e) {
    console.error(`INFO [${name}] generating declarations failed`);
    console.error(e.message);
  }
}
