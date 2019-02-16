import sprout from './sprout';
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

// const tree = {
//   a: { b: { c: '/e' } }
// };

test('wildcard', () => {
  const shape = {
    a: { '*': { c: { f: true, h: true } } }
  };
  expect(sprout(tree, shape)).toEqual({
    e: { f: true, h: true },
    g: { f: true, h: true },
    m: { f: true, h: true }
  });
});

test('keyset', () => {
  const shape = {
    a: { 'b,d': { c: { f: true, h: true } } }
  };
  expect(sprout(tree, shape)).toEqual({
    e: { f: true, h: true },
    g: { f: true, h: true }
  });
});
