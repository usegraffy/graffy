import { execFile as cExecFile } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execFile = promisify(cExecFile);

export const base = join(fileURLToPath(import.meta.url), '..', '..');
export const read = (...args) =>
  JSON.parse(readFileSync(join(base, ...args)).toString());

export const root = (...args) => join(base, ...args.filter(Boolean));
export const src = (...args) => join(base, 'src', ...args.filter(Boolean));
export const dst = (...args) => join(base, 'dist', ...args.filter(Boolean));

const yarnPath = process.env.npm_execpath;
export const yarn = (name, ...args) =>
  execFile(yarnPath, args.filter(Boolean), { cwd: dst(name) });
export const git = (...args) =>
  execFile('git', args.filter(Boolean), { cwd: base });
export const yarnx = (...args) =>
  execFile(yarnPath, args.filter(Boolean), { cwd: base });

export const ownPattern = /^@graffy\//;

export default { src, dst, yarn, git, yarnx, ownPattern };
