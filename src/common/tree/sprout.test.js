import sprout from './sprout';
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

// const tree = {
//   a: { b: { c: '/e' } }
// };

test('wildcard', () => {
  const query = {
    a: { '*': { c: { f: true, h: true } } }
  };
  expect(sprout(tree, query)).toEqual({
    g: { h: true },
    m: { f: true, h: true }
  });
});

test('keyset', () => {
  const query = {
    a: { 'b,d': { c: { f: true, h: true } } }
  };
  expect(sprout(tree, query)).toEqual({
    e: { f: true, h: true },
    g: { f: true, h: true }
  });
});
