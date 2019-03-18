import resolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import minify from 'rollup-plugin-babel-minify';
import analyze from 'rollup-plugin-analyzer';

const pkg = process.env.PKG;
if (!pkg) {
  console.log('No package to build; did you run this from inside a workspace?');
  console.log('Try yarn workspace <package> prepare');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  console.log('Production build');
}

const input = `src/${pkg}/index.js`;
const manifest = require(`./src/${pkg}/package.json`);
const extDeps = {
  ...(manifest.dependencies || {}),
  ...(manifest.peerDependencies || {}),
};

export default {
  input,
  output: [
    {
      file: `src/${pkg}/bundle.js`,
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: `src/${pkg}/bundle.mjs`,
      format: 'esm',
      sourcemap: true,
    },
  ],
  external: id => {
    if (id[0] === '.') return false;
    const segs = id.split('/');
    id = segs[0][0] === '@' ? segs.slice(0, 2).join('/') : segs[0];
    return !!extDeps[id];
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
    resolve(),
    commonjs({
      include: 'node_modules/**',
    }),
    babel({
      runtimeHelpers: true,
      exclude: 'node_modules/**', // only transpile our source code
    }),
    minify({ comments: false }),
    analyze({ skipFormatted: true, onAnalysis }),
  ],
};

function onAnalysis({ bundleSize, bundleOrigSize, moduleCount, modules }) {
  console.log(
    '\n----------------------------------------- Summary -----------------------------------------',
  );

  const { own, deps, max } = modules
    .filter(({ size }) => size)
    .reduce(
      (acc, { id, size, dependents }) => {
        acc.own[id] = (acc.own[id] || 0) + size;
        dependents.forEach(d => {
          acc.deps[d] = (acc.deps[d] || 0) + size;
        });
        acc.max = Math.max(acc.max, id.length);
        return acc;
      },
      { own: {}, deps: {}, max: 0 },
    );

  Object.keys(own).forEach(id => {
    if (id[0] === '\u0000') return;
    console.log(
      id.padEnd(max + 1),
      `${own[id]}`.padStart(8),
      `${own[id] + (deps[id] || 0)}`.padStart(8),
    );
  });
}
