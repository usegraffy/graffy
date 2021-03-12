const {
  dependencies: extraDeps,
  devDependencies: depVersions,
  peerDependencies: peerDepVersions,
} = require('../package.json');

const used = {};

function use(dep) {
  used[dep] = true;
}

function printUnused() {
  [extraDeps, depVersions, peerDepVersions].map((deps) => {
    for (const dep in deps) {
      // eslint-disable-next-line no-console
      if (!used[dep]) console.log(dep);
    }
  });
}

module.exports = { extraDeps, depVersions, peerDepVersions, use, printUnused };
