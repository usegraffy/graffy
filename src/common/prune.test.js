import prune from './prune';

const tree = {
  a: {
    b: { c: '/e' },
    d: { c: '/g' },
    l: { c: '/m' }
  },
  e: { f: 5, h: 9 },
  g: { f: 7 },
  k: 8
};



test('wildcard', () => {
  const shape = {
    a: { '*': { 'c': { f: true, h: true } } }
  };
  expect(prune(tree, shape)).toEqual({
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
  expect(prune(tree, shape)).toEqual({
    a: {
      b: { c: { f: 5, h: 9 }},
      d: { c: { f: 7 }}
    }
  });
});

test('keepLinks', () => {
  const shape = {
    a: {'b,d': {'c': { f: true, h: true }}}
  };
  expect(prune(tree, shape, [], true)).toEqual({
    a: {
      b: { c: '/e'},
      d: { c: '/g'}
    },
    e: { f: 5, h: 9 },
    g: { f: 7 }
  });
});
