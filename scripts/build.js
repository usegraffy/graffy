/* eslint-disable no-console */

const { mkdir, readFile, writeFile } = require('fs').promises;
const globby = require('globby');
const { src, dst, ownPattern } = require('./utils');

const {
  parseAsync: parse,
  transformFromAstAsync: transform,
} = require('@babel/core');

const {
  dependencies: extraDeps,
  devDependencies: depVersions,
  peerDependencies: peerDepVersions,
} = require('../package.json');

const depPattern = /^[^@][^/]*|^@[^/]*\/[^/]*/;
const depAstNodes = [
  'ImportDeclaration',
  'ExportAllDeclaration',
  'ExportNamedDeclaration',
];

module.exports = async function build(name, version) {
  const cwd = src(name);
  let packageName, description;

  // Copy the Readme file first. If there is no readme, skip this directory.
  try {
    ({ name: packageName } = require(src(name, 'package.json')));
    const readme = (await readFile(src(name, 'Readme.md'))).toString();
    description = readme.match(/^[^#].*$/m)[0].trim();
    await mkdir(dst(name));
    writeFile(dst(name, 'Readme.md'), readme);
  } catch (_) {
    console.warn(`Skipping "${name}": package.json or Readme.md missing`);
    return false;
  }

  // Make destination directories
  await mkdir(dst(name, 'src'));
  for (const dir of await globby('**/*', { cwd, onlyDirectories: true })) {
    await mkdir(dst(name, 'src', dir));
    await mkdir(dst(name, dir));
  }

  // Keep track of dependencies found during source transformation
  let dependencies = extraDeps && { ...extraDeps };
  let peerDependencies;
  function addDeps(ast) {
    ast.program.body
      .filter(({ type, source }) => depAstNodes.includes(type) && source)
      .map(({ source }) => source.value)
      .forEach((imp) => {
        if (imp[0] === '.') return;
        const dep = imp.match(depPattern)[0];
        if (peerDepVersions[dep]) {
          peerDependencies = peerDependencies || {};
          peerDependencies[dep] = peerDepVersions[dep];
        } else {
          dependencies = dependencies || {};
          if (ownPattern.test(imp)) {
            dependencies[dep] = version;
          } else if (depVersions[dep]) {
            dependencies[dep] = depVersions[dep];
          } else if (require.resolve(dep) === dep) {
            console.log('Ignoring built-in', dep);
            // This is a node built-in; ignore.
          } else {
            console.warn('No version found for package:', dep);
            dependencies[dep] = 'x';
          }
        }
      });
  }

  // Transform source files
  const paths = await globby(['**/*.js', '!**/*.test*.js'], { cwd });
  await Promise.all(
    paths.map(async (path) => {
      try {
        const source = (await readFile(src(name, path))).toString();
        writeFile(dst(name, 'src', path), source);
        const ast = await parse(source);

        await writeFile(dst(name, path), (await transform(ast, source)).code);

        addDeps(ast);
      } catch (e) {
        console.error(`Skipping file ${path}:`, e.message);
      }
    }),
  );

  // Write package.json
  await writeFile(
    dst(name, 'package.json'),
    JSON.stringify(
      {
        name: packageName,
        description,
        author: 'aravind (https://github.com/aravindet)',
        version,
        main: 'index.js',
        source: 'src/index.js',
        esnext: 'src/index.js',
        repository: {
          type: 'git',
          url: 'git+https://github.com/usegraffy/graffy.git',
        },
        license: 'Apache-2.0',
        dependencies,
        peerDependencies,
      },
      null,
      2,
    ),
  );

  return true;
};
