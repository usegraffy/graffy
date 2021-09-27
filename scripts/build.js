/* eslint-disable no-console */

import { mkdir, readFile, writeFile } from 'fs/promises';
import { builtinModules } from 'module';
import { src, dst, ownPattern, read } from './utils.js';
import { depVersions, peerDepVersions, use } from './deps.js';
import { build as viteBuild } from 'vite';

const depPattern = /^[^@][^/]*|^@[^/]*\/[^/]*/;

export default async function build(name, version, watch, onUpdate) {
  let packageName, description;

  // Copy the Readme file first. If there is no readme, skip this directory.
  try {
    ({ name: packageName } = read('src', name, 'package.json'));
    const readme = (await readFile(src(name, 'Readme.md'))).toString();
    description = readme.match(/^[^#].*$/m)[0].trim();
    await mkdir(dst(name));
    writeFile(dst(name, 'Readme.md'), readme);
  } catch (_) {
    console.warn(`WARN [${name}] no package.json or Readme.md; skipping`);
    return false;
  }

  const imports = {};
  let importsUpdated = false;

  // Perform the vite build
  const out = await viteBuild({
    root: src(name),
    build: {
      lib: {
        entry: 'index.js',
        formats: ['es', 'cjs'],
        fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
      },
      outDir: dst(name),
      emptyOutDir: false,
      rollupOptions: {
        external: (id, _, isResolved) => {
          if (isResolved || id[0] === '.') return false;
          if (!imports[id]) {
            imports[id] = true;
            importsUpdated = true;
          }
          return true;
        },
      },
      brotliSize: false,
      minify: false,
      watch: watch ? {} : null,
    },
    clearScreen: false,
    logLevel: 'warn',
  });

  if (watch) {
    let signalInitialBuild = null;

    out.on('event', async (e) => {
      if (e.code !== 'BUNDLE_END') return;

      console.log(
        `INFO [${name}] updated${importsUpdated ? ' (new imports)' : ''}`,
      );

      if (importsUpdated) {
        importsUpdated = false;
        await writePackageJson(imports);
      }

      // We await this to ensure that we signal the initial build
      // only after Typescript definitions are generated. This is
      // required to limit the concurrent processes to the number
      // of CPU cores.
      if (onUpdate) await onUpdate(name);

      if (signalInitialBuild) {
        signalInitialBuild();
        signalInitialBuild = null;
      }
    });

    await new Promise((res) => {
      signalInitialBuild = res;
    });

    console.log(`INFO [${name}] built, watching for changes...`);
    return true;
  } else {
    writePackageJson(imports);
    console.log(`INFO [${name}] built`);
    return true;
  }

  async function writePackageJson(imports) {
    let dependencies, peerDependencies;

    Object.keys(imports).map((imp) => {
      const dep = imp.match(depPattern)[0];
      use(dep);
      if (peerDepVersions[dep]) {
        peerDependencies = peerDependencies || {};
        peerDependencies[dep] = peerDepVersions[dep];
      } else {
        dependencies = dependencies || {};
        if (ownPattern.test(dep)) {
          dependencies[dep] = version;
        } else if (depVersions[dep]) {
          dependencies[dep] = depVersions[dep];
        } else if (builtinModules.includes(dep)) {
          console.log(`INFO [${name}] ignoring built-in ${dep}`);
        } else {
          console.warn(`WARN [${name}] unversioned package ${dep}`);
          dependencies[dep] = 'x';
        }
      }
    });

    // Write package.json
    await writeFile(
      dst(name, 'package.json'),
      JSON.stringify(
        {
          name: packageName,
          description,
          author: 'aravind (https://github.com/aravindet)',
          version,
          main: './index.cjs',
          exports: {
            import: './index.mjs',
            require: './index.cjs',
          },
          module: './index.mjs',
          types: './types/index.d.ts',
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
  }
}

export function onUpdate() {}
