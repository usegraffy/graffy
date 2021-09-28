#!/usr/bin/env node
/* eslint-disable no-console */

import { mkdir, readdir } from 'fs/promises';
import os from 'os';
import mRimraf from 'rimraf';
import yargs from 'yargs';
import pMap from 'p-map';

import version from './version.js';
import build from './build.js';
import publish from './publish.js';
import link from './link.js';
import interlink from './interlink.js';
import tag from './tag.js';
import types, { terminateWorkers } from './types.js';
import { src, dst } from './utils.js';

const { sync: rimraf } = mRimraf;

const argv = yargs(process.argv.slice(2))
  .usage('$0 <version> [--publish] [--link] [--watch] [--notypes]')
  .boolean('publish')
  .boolean('link')
  .boolean('watch')
  .boolean('notypes')
  .demandCommand(1).argv;

if (argv.publish && argv.watch) {
  console.log("ERR Can't both --publish and --watch");
  process.exit(-1);
}

function onUpdate(name, fileName) {
  if (!argv.notypes) types(name, fileName);
}

(async function () {
  const ver = await version(argv._[0]);
  console.log(`INFO packaging version ${ver}`);

  await rimraf(dst());
  await mkdir(dst());

  let dirs = (await readdir(src(), { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map(({ name }) => name);

  dirs = (
    await pMap(
      dirs,
      async (name) => {
        console.log(`INFO [${name}] started`);
        if (!(await build(name, ver, argv.watch, onUpdate))) return;
        if (!argv.notypes) await types(name);
        if (argv.publish) await publish(name, ver);
        if (argv.link) await link(name);
        return name;
      },
      { concurrency: os.cpus().length },
    )
  ).filter(Boolean);

  if (argv.link) await Promise.all(dirs.map((name) => interlink(name)));
  if (argv.publish) await tag(ver);

  if (!argv.watch) {
    await terminateWorkers();
    console.log('INFO done');
  }
})();
