/* eslint-disable no-console */
import { parentPort, workerData } from 'worker_threads';
import ts from 'typescript';
import { src, dst } from './utils.js';

const { name, watch } = workerData;

const options = {
  allowJs: true,
  declaration: true,
  emitDeclarationOnly: true,
  outDir: dst(name, 'types'),
};

if (watch) {
  options.incremental = true;
  options.tsBuildInfoFile = dst(name, '.tsbuildinfo');
}

// TODO: When rebuilding, specify individual files (instead of index.js) and
// use the noResolve option to speed up rebuilding.

console.log(`INFO [${name}] generating declarations`);

try {
  const program = ts.createProgram([src(name, 'index.js')], options);
  program.emit();
  console.log(`INFO [${name}] generated declarations`);
  parentPort.postMessage(true);
} catch (e) {
  console.error(`INFO [${name}] generating declarations failed`);
  console.error(e.message);
}
