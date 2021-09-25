/* eslint-disable no-console */

import { mkdir, readFile, writeFile } from 'fs/promises';
import { builtinModules } from 'module';
import { src, dst, ownPattern, read } from './utils.js';
import { depVersions, peerDepVersions, use } from './deps.js';
import { build as viteBuild } from 'vite';

const depPattern = /^[^@][^/]*|^@[^/]*\/[^/]*/;

export default async function build(name, version) {
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
        external: (id, _, isResolved) => !isResolved && id[0] !== '.',
      },
      brotliSize: false,
    },
    clearScreen: false,
    logLevel: 'warn',
  });

  let dependencies, peerDependencies;

  out[0].output[0].imports.map((imp) => {
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

  console.log(`INFO [${name}] built`);
  return true;
}

// export default async function build(name, version) {
//   const cwd = src(name);
//   let packageName, description;

//   // Copy the Readme file first. If there is no readme, skip this directory.
//   try {
//     ({ name: packageName } = read('src', name, 'package.json'));
//     const readme = (await readFile(src(name, 'Readme.md'))).toString();
//     description = readme.match(/^[^#].*$/m)[0].trim();
//     await mkdir(dst(name));
//     writeFile(dst(name, 'Readme.md'), readme);
//   } catch (_) {
//     console.warn(`WARN [${name}] no package.json or Readme.md; skipping`);
//     return false;
//   }

//   // Make destination directories
//   await mkdir(dst(name, 'cjs'));
//   // await mkdir(dst(name, 'esm'));
//   for (const dir of await globby('**/*', { cwd, onlyDirectories: true })) {
//     await mkdir(dst(name, 'cjs', dir));
//     // await mkdir(dst(name, 'esm', dir));
//   }

//   // Keep track of dependencies found during source transformation
//   let dependencies = extraDeps && { ...extraDeps };
//   let peerDependencies;
//   function addDeps(ast) {
//     ast.program.body
//       .filter(({ type, source }) => depAstNodes.includes(type) && source)
//       .map(({ source }) => source.value)
//       .forEach((imp) => {
//         if (imp[0] === '.') return;
//         const dep = imp.match(depPattern)[0];
//         // use(dep);
//         if (peerDepVersions[dep]) {
//           peerDependencies = peerDependencies || {};
//           peerDependencies[dep] = peerDepVersions[dep];
//         } else {
//           dependencies = dependencies || {};
//           if (ownPattern.test(imp)) {
//             dependencies[dep] = version;
//           } else if (depVersions[dep]) {
//             dependencies[dep] = depVersions[dep];
//           } else if (isBuiltin(dep)) {
//             console.log(`INFO [${name}] ignoring built-in ${dep}`);
//           } else {
//             console.warn(`WARN [${name}] unversioned package ${dep}`);
//             dependencies[dep] = 'x';
//           }
//         }
//       });
//   }

//   // Transform source files
//   const paths = await globby(['**/*.{js,jsx}', '!**/*.test*.{js,jsx}'], {
//     cwd,
//   });
//   try {
//     await Promise.all(
//       paths.map(async (path) => {
//         try {
//           const source = (await readFile(src(name, path))).toString();
//           const ast = await parse(source, babelConfig(false));

//           await Promise.all([
//             writeFile(
//               dst(name, 'cjs', path),
//               (
//                 await transform(ast, source, babelConfig(false))
//               ).code,
//             ),
//             // writeFile(
//             //   dst(name, 'esm', path),
//             //   (await transform(ast, source, babelConfig(true))).code,
//             // ),
//           ]);

//           addDeps(ast);
//         } catch (e) {
//           console.error(`ERROR [${name}] error transpiling ${path}; skipping`);
//           console.error(e);
//           throw e;
//         }
//       }),
//     );
//   } catch (_) {
//     return false;
//   }

//   // Write package.json
//   await writeFile(
//     dst(name, 'package.json'),
//     JSON.stringify(
//       {
//         name: packageName,
//         description,
//         author: 'aravind (https://github.com/aravindet)',
//         version,
//         main: './cjs/index.js',
//         // exports: {
//         //   import: './esm/index.js',
//         //   require: './cjs/index.js',
//         // },
//         // module: './esm/index.js',
//         types: './types/index.d.ts',
//         repository: {
//           type: 'git',
//           url: 'git+https://github.com/usegraffy/graffy.git',
//         },
//         license: 'Apache-2.0',
//         dependencies,
//         peerDependencies,
//       },
//       null,
//       2,
//     ),
//   );

//   console.log(`INFO [${name}] built`);
//   return true;
// }
