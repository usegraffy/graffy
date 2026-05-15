import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import { /* dirname, */ join /*, relative*/ } from 'node:path';
import ts from 'typescript';
import { depVersions, peerDepVersions, use } from './deps.js';
import { dst, ownPattern, read, src } from './utils.js';

const depPattern = /^[^@][^/]*|^@[^/]*\/[^/]*/;
// Matches bare-specifier `from 'pkg'` and `import 'pkg'` (excludes relative/node: paths)
const importRe = /(?:from|import)\s+['"]([^'"./][^'"]*)['"]/gm;

export default async function build(name, version) {
  let packageName;
  let description;

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

  // ESM compilation with declarations.
  // preserveSymlinks: true keeps workspace @graffy/* paths as node_modules/...
  // paths, preventing tsc from emitting their source files into this package's
  // output directory.
  const esmOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    rewriteRelativeImportExtensions: true,
    preserveSymlinks: true,
    jsx: ts.JsxEmit.ReactJSX,
    declaration: true,
    skipLibCheck: true,
    strict: false,
    esModuleInterop: true,
    noEmitOnError: false,
    outDir: dst(name),
  };

  const esmProgram = ts.createProgram([src(name, 'index.ts')], esmOptions);
  /* const { diagnostics: esmDiags } = */ esmProgram.emit();
  // reportDiags(name, [...ts.getPreEmitDiagnostics(esmProgram), ...esmDiags]);

  // tsc does not rewrite .ts→.js in .d.ts files when rewriteRelativeImportExtensions
  // is set; fix that manually.
  await fixDtsExtensions(dst(name));

  // CJS: transpile each source file in this package individually.
  // ts.transpileModule avoids the moduleResolution: Bundler + CommonJS conflict.

  const pkgSrcPrefix = `${src(name)}/`;
  const pkgSourceFiles = esmProgram
    .getSourceFiles()
    .filter(
      (sf) =>
        !sf.isDeclarationFile &&
        sf.fileName.startsWith(pkgSrcPrefix) &&
        /\.tsx?$/.test(sf.fileName),
    );

  /*
  await mkdir(dst(name, 'cjs'), { recursive: true });

  for (const sf of pkgSourceFiles) {
    const relPath = relative(src(name), sf.fileName);
    const outPath = join(dst(name, 'cjs'), relPath).replace(/\.tsx?$/, '.js');
    await mkdir(dirname(outPath), { recursive: true });

    const { outputText } = ts.transpileModule(sf.getFullText(), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
      fileName: sf.fileName,
    });

    // ts.transpileModule does not rewrite .ts→.js in require() paths
    await writeFile(outPath, rewriteTsExtensions(outputText));
  }

  await writeFile(
    dst(name, 'cjs', 'package.json'),
    JSON.stringify({ type: 'commonjs' }),
  );
  */

  const imports = scanImports(pkgSourceFiles);
  await writePackageJson(name, packageName, description, version, imports);

  console.log(`INFO [${name}] built`);
  return true;
}

// function rewriteTsExtensions(js) {
//   return js.replace(
//     /require\((['"])(\.[^'"]+)\.tsx?(['"])\)/g,
//     'require($1$2.js$3)',
//   );
// }

async function fixDtsExtensions(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await fixDtsExtensions(fullPath);
    } else if (entry.name.endsWith('.d.ts')) {
      const content = await readFile(fullPath, 'utf8');
      const fixed = content.replace(
        /(\bfrom\s+['"])(\..*?)\.tsx?(['"]\s*;?)/g,
        '$1$2.js$3',
      );
      if (fixed !== content) await writeFile(fullPath, fixed);
    }
  }
}

// function reportDiags(name, diags) {
//   const host = ts.createCompilerHost({});
//   for (const diag of diags) {
//     // Skip errors from node_modules (cross-package implicit-any noise)
//     const file = diag.file?.fileName ?? '';
//     if (file.includes('/node_modules/')) continue;
//     const msg = ts.formatDiagnostic(diag, host).trim();
//     if (diag.category === ts.DiagnosticCategory.Error) {
//       console.error(`ERR  [${name}] ${msg}`);
//     } else {
//       console.warn(`WARN [${name}] ${msg}`);
//     }
//   }
// }

function scanImports(sourceFiles) {
  const imports = {};
  for (const sf of sourceFiles) {
    const content = sf.getFullText();
    importRe.lastIndex = 0;
    let match;
    // biome-ignore lint/suspicious/noAssignInExpressions: This is much more concise than the alternative
    while ((match = importRe.exec(content)) !== null) {
      const spec = match[1];
      const dep = spec.match(depPattern)?.[0];
      if (dep && !builtinModules.includes(dep) && !dep.startsWith('node:')) {
        imports[spec] = true;
      }
    }
  }
  return imports;
}

async function writePackageJson(
  name,
  packageName,
  description,
  version,
  imports,
) {
  let dependencies;
  let peerDependencies;

  Object.keys(imports).forEach((imp) => {
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
      } else if (builtinModules.includes(dep) || dep.startsWith('node:')) {
        console.log(`INFO [${name}] ignoring built-in ${dep}`);
      } else {
        console.warn(`WARN [${name}] unversioned package ${dep}`);
        dependencies[dep] = 'x';
      }
    }
  });

  await writeFile(
    dst(name, 'package.json'),
    JSON.stringify(
      {
        name: packageName,
        description,
        author: 'aravind (https://github.com/aravindet)',
        version,
        main: './cjs/index.js',
        exports: {
          '.': {
            import: './index.js',
            // require: './cjs/index.js',
            types: './index.d.ts',
          },
          './*': {
            import: './*.js',
            // require: './cjs/*.js',
            types: './*.d.ts',
          },
        },
        types: './index.d.ts',
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
