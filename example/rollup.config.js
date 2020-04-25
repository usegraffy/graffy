import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import babel from 'rollup-plugin-babel';
import analyze from 'rollup-plugin-analyzer';

const input = `example/client.js`;

export default {
  input,
  output: {
    file: `example/public/bundle.js`,
    format: 'iife',
    sourcemap: true,
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
    babel({
      runtimeHelpers: true,
      exclude: 'node_modules/**', // only transpile our source code
    }),
    resolve(),
    commonjs({
      include: 'node_modules/**',
      namedExports: {
        'node_modules/react/index.js': ['useState'],
      },
    }),
    analyze({ skipFormatted: true, onAnalysis }),
  ],
};

function onAnalysis({ bundleSize, bundleOrigSize, moduleCount, modules }) {
  const { own, deps, max } = modules
    .filter(({ size }) => size)
    .reduce(
      (acc, { id, size, dependents }) => {
        acc.own[id] = (acc.own[id] || 0) + size;
        dependents.forEach((d) => {
          acc.deps[d] = (acc.deps[d] || 0) + size;
        });
        acc.max = Math.max(acc.max, id.length);
        return acc;
      },
      { own: {}, deps: {}, max: 0 },
    );

  console.log(
    '\nHeaviest modules'.padEnd(max + 2) +
      'Own'.padStart(8) +
      '+Deps'.padStart(8) +
      `\n${'-'.repeat(max + 16)}\n` +
      Object.keys(own)
        .filter((id) => id[0] !== '\u0000')
        .map((id) => ({ id, size: own[id] + (deps[id] || 0) }))
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .map(
          ({ id, size }) =>
            id.padEnd(max + 1) +
            `${own[id]}`.padStart(8) +
            `${size}`.padStart(8),
        )
        .join('\n'),
  );
}
