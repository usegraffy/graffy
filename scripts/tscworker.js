import { cpSync } from 'node:fs';
import { dirname } from 'node:path';
import { parentPort } from 'node:worker_threads';
import ts from 'typescript';
import { dst, src } from './utils.js';

parentPort.on('message', async (message) => {
  const { name, fileName } = message;

  // Copy hand-written type definitions if they exist.
  try {
    cpSync(src(name, 'types'), dst(name, 'types'), { recursive: true });
    // const defs = (await readFile(src(name, 'types', 'index.d.ts'))).toString();
    console.log(`INFO [${name}] copying type definitions`);
    // await mkdir(dst(name, 'types'));
    // await writeFile(dst(name, 'types', 'index.d.ts'), defs);
    parentPort.postMessage(true);
    return;
  } catch (e) {
    // console.log(e);
    console.log(`INFO [${name}] no hand-written type definitions`);
  }

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
    throw Error(`Updated file ${fileName} is not in ${srcRoot}`);
  }

  const filePath = fileName.substr(srcRoot.length);

  const options = {
    allowJs: true,
    declaration: true,
    emitDeclarationOnly: true,
    noResolve: true,
    outDir: dirname(dst(name, 'types', filePath)),
  };

  return [[fileName], options];
}
