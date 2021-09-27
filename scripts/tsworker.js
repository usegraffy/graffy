/* eslint-disable no-console */
import { parentPort, workerData } from 'worker_threads';
import ts from 'typescript';
import { src, dst } from './utils.js';

const { name, watch } = workerData;
try {
  console.log('>>>Starting declarations:' + name);
  (watch ? watchTypes : buildTypes)(name);
  console.log(
    `INFO [${name}] generated declarations${
      watch ? ', watching for changes' : ''
    }`,
  );
  parentPort.postMessage(true);
} catch (e) {
  console.error(`INFO [${name}] generating declarations failed`);
  console.error(e.message);
}

function buildTypes(name) {
  const program = ts.createProgram([src(name, 'index.js')], {
    allowJs: true,
    declaration: true,
    emitDeclarationOnly: true,
    outDir: dst(name, 'types'),
  });

  program.emit();
}

function watchTypes(name) {
  function reportDiagnostic(...args) {
    console.error(`ERROR [${name}] Typescript diagnostic`, ...args);
  }

  function reportWatchStatus() {
    console.error(`INFO [${name}] types updated`);
  }

  const host = ts.createWatchCompilerHost(
    [src(name, 'index.js')],
    {
      watch: true,
      preserveWatchOutput: true,
      allowJs: true,
      declaration: true,
      emitDeclarationOnly: true,
      outDir: dst(name, 'types'),
    },
    ts.sys,
    ts.createEmitAndSemanticDiagnosticsBuilderProgram,
    reportDiagnostic,
    reportWatchStatus,
  );

  ts.createWatchProgram(host);
}
