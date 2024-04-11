import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import { build as viteBuild } from 'vite';
import { depVersions, peerDepVersions, use } from './deps.js';
import { dst, ownPattern, read, src } from './utils.js';

const depPattern = /^[^@][^/]*|^@[^/]*\/[^/]*/;

// ESM-only deps are built into the bundle rather than
// keeping them external, to prevent
const esmOnlyDeps = ['sql-template-tag', 'nanoid'];

export default async function build(name, version, watch, onUpdate) {
  let packageName;
  let description;

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
        external: (id, _parentId, _isResolved) => {
          if (id[0] === '/' || id[0] === '.') return false;
          const dep = id.match(depPattern)[0];
          if (esmOnlyDeps.includes(dep)) return false;

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

    out.on('change', (fileName) => {
      if (onUpdate) onUpdate(name, fileName);
    });

    out.on('event', async (e) => {
      if (e.code !== 'BUNDLE_END') return;

      console.log(
        `INFO [${name}] updated${importsUpdated ? ' (new imports)' : ''}`,
      );

      if (importsUpdated || signalInitialBuild) {
        importsUpdated = false;
        await writePackageJson(imports);
      }

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
  }
  writePackageJson(imports);
  console.log(`INFO [${name}] built`);
  return true;

  async function writePackageJson(imports) {
    let dependencies;
    let peerDependencies;

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
