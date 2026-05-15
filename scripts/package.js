#!/usr/bin/env node

import { mkdir, readdir } from 'node:fs/promises';
import os from 'node:os';
import pMap from 'p-map';
import { rimrafSync as rimraf } from 'rimraf';
import yargs from 'yargs';

import build from './build.js';
import interlink from './interlink.js';
import link from './link.js';
import publish from './publish.js';
import tag from './tag.js';
import { dst, src } from './utils.js';
import version from './version.js';

const argv = yargs(process.argv.slice(2))
  .usage('$0 <version> [--publish] [--link] [--provenance]')
  .boolean('publish')
  .boolean('link')
  .boolean('provenance')
  .demandCommand(1).argv;

if (argv.provenance && !argv.publish) {
  console.log('ERR --provenance requires --publish');
  process.exit(-1);
}

(async () => {
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
        if (!(await build(name, ver))) return;
        if (argv.publish) await publish(name, ver, argv.provenance);
        if (argv.link) await link(name);
        return name;
      },
      { concurrency: os.availableParallelism() },
    )
  ).filter(Boolean);

  if (argv.link) await Promise.all(dirs.map((name) => interlink(name)));
  if (argv.publish) await tag(ver);

  console.log('INFO done');
})();
