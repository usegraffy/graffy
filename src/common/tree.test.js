import { prune, sprout, plant } from './tree';
import { LINK_KEY, PAGE_KEY, MIN_KEY, MAX_KEY } from '../constants';
import { makePath } from './path';

const link = path => ({ [LINK_KEY]: makePath(path) });
const page = (node, start, end) => {
  node[PAGE_KEY] = [start, end];
  return node;
};

test('plant', () => {
  expect(
    plant(
      {
        foo: page({ a: { m: 1 }, b: { m: 2 }, c: { m: 3 } }, '', 'c'),
        bar: { a: link('/foo/a'), b: link('/foo/b'), d: link('/foo/d') },
      },
      {
        foo: { a: true, d: true, 'b*3**': { m: true } },
        bar: { a: { n: true }, b: { m: true }, c: { m: true }, d: { m: true } },
      },
    ),
  ).toEqual({
    foo: { b: { m: true }, c: { m: true } },
    bar: { a: true, b: true, d: true },
  });
});

test('sprout 1', () => {
  expect(
    sprout(
      {
        foo: page({ a: { m: 1 }, b: { m: 2 }, c: { m: 3 } }, '', 'c'),
        bar: { a: link('/foo/a'), b: link('/foo/b'), d: link('/foo/d') },
      },
      {
        foo: { a: true, d: true, 'b*3**': { m: true } },
        bar: { a: { n: true }, b: { m: true }, c: { m: true }, d: { m: true } },
      },
    ),
  ).toEqual({
    foo: { a: { n: true }, d: { m: true }, 'c*2**': { m: true } },
    bar: { c: { m: true } },
  });
});

const tree = {
  a: {
    b: { c: { [LINK_KEY]: ['e'] } },
    d: { c: { [LINK_KEY]: ['g'] } },
    l: { c: { [LINK_KEY]: ['m'] } },
  },
  e: { f: 5, h: 9 },
  g: { f: 7 },
  k: 8,
};

// const tree = {
//   a: { b: { c: '/e' } }
// };

test('sprout 2', () => {
  const query = {
    a: { '*': { c: { f: true, h: true } } },
  };
  expect(sprout(tree, query)).toEqual({
    g: { h: true },
    m: { f: true, h: true },
  });
});

test('prune 2', () => {
  const query = {
    a: { '*': { c: { f: true, h: true } } },
  };
  expect(prune(tree, query)).toEqual({
    a: {
      [PAGE_KEY]: [MIN_KEY, MAX_KEY],
      b: { c: { [LINK_KEY]: ['e'] } },
      d: { c: { [LINK_KEY]: ['g'] } },
      l: { c: { [LINK_KEY]: ['m'] } },
    },
    e: { f: 5, h: 9 },
    g: { f: 7 },
  });
});
