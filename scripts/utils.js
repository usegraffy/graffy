import { join } from 'path';
import { fileURLToPath } from 'url';
import { execFile as cExecFile } from 'child_process';
import { promisify } from 'util';
import { readFileSync } from 'fs';

const pExecFile = promisify(cExecFile);
const execFile = (...args) => {
  console.log('DEBUG execFile', args);
  return pExecFile(...args);
};

const base = join(fileURLToPath(import.meta.url), '..', '..');
export const read = (...args) =>
  JSON.parse(readFileSync(join(base, ...args)).toString());

export const src = (...args) => join(base, 'src', ...args);
export const dst = (...args) => join(base, 'dist', ...args);

const yarnPath = process.env.npm_execpath;
export const yarn = (name, ...args) =>
  execFile(yarnPath, args, { cwd: dst(name) });
export const git = (...args) => execFile('git', args, { cwd: base });
export const yarnx = (...args) => execFile(yarnPath, args, { cwd: base });

export const ownPattern = /^@graffy\//;

export default { src, dst, yarn, git, yarnx, ownPattern };
