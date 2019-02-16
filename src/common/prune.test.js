import prune from './prune';
import { META_KEY } from './constants';

const tree = {
  a: {
    b: { c: { [META_KEY]: { path: ['e'] } } },
    d: { c: { [META_KEY]: { path: ['g'] } } },
    l: { c: { [META_KEY]: { path: ['m'] } } }
  },
  e: { f: 5, h: 9 },
  g: { f: 7 },
  k: 8
};

test('wildcard', () => {
  const shape = {
    a: { '*': { 'c': { f: true, h: true } } }
  };
  expect(prune(tree, shape, [])).toEqual({
    a: {
      b: { c: { f: 5, h: 9 }},
      d: { c: { f: 7 }},
      l: {}
    }
  });
});

test('keyset', () => {
  const shape = {
    a: {'b,d': {'c': { f: true, h: true }}}
  };
  expect(prune(tree, shape, [])).toEqual({
    a: {
      b: { c: { f: 5, h: 9 }},
      d: { c: { f: 7 }}
    }
  });
});

test('raw', () => {
  const shape = {
    a: {'b,d': {'c': { f: true, h: true }}}
  };
  expect(prune(tree, shape)).toEqual({
    a: {
      b: { c: { [META_KEY]: { path: ['e'] } } },
      d: { c: { [META_KEY]: { path: ['g'] } } }
    },
    e: { f: 5, h: 9 },
    g: { f: 7 }
  });
});
