import prune from './prune';
import { LINK_KEY } from '../constants';

const tree = {
  a: {
    b: { c: { [LINK_KEY]: ['e'] } },
    d: { c: { [LINK_KEY]: ['g'] } },
    l: { c: { [LINK_KEY]: ['m'] } }
  },
  e: { f: 5, h: 9 },
  g: { f: 7 },
  k: 8
};

test('wildcard', () => {
  const query = {
    a: { '*': { 'c': { f: true, h: true } } }
  };
  expect(prune(tree, query, [])).toEqual({
    a: {
      b: { c: { f: 5, h: 9 }},
      d: { c: { f: 7 }},
      l: {}
    }
  });
});

test('keyset', () => {
  const query = {
    a: {'b,d': {'c': { f: true, h: true }}}
  };
  expect(prune(tree, query, [])).toEqual({
    a: {
      b: { c: { f: 5, h: 9 }},
      d: { c: { f: 7 }}
    }
  });
});

test('raw', () => {
  const query = {
    a: {'b,d': {'c': { f: true, h: true }}}
  };
  expect(prune(tree, query)).toEqual({
    a: {
      b: { c: { [LINK_KEY]: ['e'] } },
      d: { c: { [LINK_KEY]: ['g'] } }
    },
    e: { f: 5, h: 9 },
    g: { f: 7 }
  });
});
