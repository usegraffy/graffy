#!/usr/bin/env node
/* eslint-disable no-console */

import { mkdir } from 'fs/promises';
import mRimraf from 'rimraf';
import { globby } from 'globby';
import yargs from 'yargs';

import version from './version.js';
import build from './build.js';
import publish from './publish.js';
import link from './link.js';
import interlink from './interlink.js';
import tag from './tag.js';
import types from './types.js';
import { src, dst } from './utils.js';

const { sync: rimraf } = mRimraf;

const argv = yargs(process.argv.slice(2))
  .usage('$0 <version> [--publish] [--link] [--notypes]')
  .boolean('publish')
  .boolean('link')
  .boolean('notypes')
  .demandCommand(1).argv;

(async function () {
  const ver = await version(argv._[0]);
  console.log('Building version', ver);

  await rimraf(dst());
  await mkdir(dst());

  let dirs = await globby('*', { cwd: src(), onlyDirectories: true });
  dirs = (
    await Promise.all(
      dirs.map(async (dir) => {
        if (!(await build(dir, ver))) return;
        if (!argv.notypes) await types(dir);
        if (argv.publish) await publish(dir, ver);
        if (argv.link) await link(dir);
        return dir;
      }),
    )
  ).filter(Boolean);

  if (argv.link) await Promise.all(dirs.map((dir) => interlink(dir)));
  if (argv.publish) tag(ver);

  console.log('Done.');
})();
