const { join } = require('path');
const execFile = require('util').promisify(require('child_process').execFile);

const base = join(__dirname, '..');
const src = (...args) => join(base, 'src', ...args);
const dst = (...args) => join(base, 'dist', ...args);

const yarnPath = process.env.npm_execpath;
const yarn = (name, ...args) => execFile(yarnPath, args, { cwd: dst(name) });
const git = (...args) => execFile('git', args, { cwd: base });

const ownPattern = /^@graffy\//;

module.exports = { src, dst, yarn, git, ownPattern };
