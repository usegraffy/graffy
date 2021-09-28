/* eslint-disable no-console */
import { parentPort } from 'worker_threads';
import ts from 'typescript';
import { src, dst } from './utils.js';

parentPort.on('message', (message) => {
  const { name, fileName } = message;

  const args = fileName ? getFileArgs(name, fileName) : getPkgArgs(name);

  console.log(`INFO [${name}] generating declarations`);

  try {
    const program = ts.createProgram(...args);
    program.emit();
    console.log(`INFO [${name}] generated declarations`);
    parentPort.postMessage(true);
  } catch (e) {
    console.error(`INFO [${name}] generating declarations failed`);
    console.error(e.message);
  }
});

function getPkgArgs(name) {
  const options = {
    allowJs: true,
    declaration: true,
    emitDeclarationOnly: true,
    outDir: dst(name, 'types'),
  };

  return [[src(name, 'index.js')], options];
}

function getFileArgs(name, fileName) {
  const srcRoot = src(name);

  if (fileName.substr(0, srcRoot.length) !== srcRoot) {
    throw Error('Updated file ' + fileName + ' is not in ' + srcRoot);
  }

  const filePath = fileName.substr(srcRoot.length);

  const options = {
    allowJs: true,
    declaration: true,
    emitDeclarationOnly: true,
    noResolve: true,
    outFile: dst(name, 'types', filePath),
  };

  return [[fileName], options];
}
