import { getKnown, getUnknown, linkKnown } from './cacheOperations';
import { MIN_KEY, MAX_KEY } from './constants';
import { makeLink as link, makePage as page } from './path.js';

// const link = makeLink;
// const page = makePage;

test('linkKnown1', () => {
  expect(
    linkKnown(
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
    foo: {
      a: { n: true },
      b: { m: true },
      c: { m: true },
      d: { m: true },
      'b*c': { m: true },
      'c*2**': { m: true },
    },
    bar: { a: { n: true }, b: { m: true }, c: { m: true }, d: { m: true } },
  });
});

test('linkKnown2', () => {
  expect(linkKnown({ foo: { a: null } }, { foo: { '**3': { x: 1 } } })).toEqual(
    { foo: { '**3': { x: 1 } } },
  );
});

test('getUnknown1', () => {
  expect(
    getUnknown(
      {
        foo: page({ a: { m: 1 }, b: { m: 2 }, c: { m: 3 } }, '', 'c'),
        bar: { a: link('/foo/a'), b: link('/foo/b'), d: link('/foo/d') },
      },
      {
        foo: { a: true, 'b*3**': { m: true } },
        bar: { a: { n: true }, b: { m: true }, c: { m: true }, d: { m: true } },
      },
    ),
  ).toEqual({
    foo: { a: { n: true }, d: { m: true }, 'c*2**': { m: true } },
    bar: { c: { m: true } },
  });
});

const tree = {
  a: page({
    b: { c: link('/e') },
    d: { c: link('/g') },
    l: { c: link('/m') },
  }),
  e: { f: 5, h: 9 },
  g: { f: 7 },
  k: 8,
};

// const tree = {
//   a: { b: { c: '/e' } }
// };

test('getUnknown2', () => {
  const query = {
    a: { '*': { c: { f: true, h: true } } },
  };
  expect(getUnknown(tree, query)).toEqual({
    g: { h: true },
    m: { f: true, h: true },
  });
});

test('getKnown2', () => {
  const query = {
    a: { '*': { c: { f: true, h: true } } },
  };
  expect(getKnown(tree, query)).toEqual({
    a: page(
      {
        b: { c: link('/e') },
        d: { c: link('/g') },
        l: { c: link('/m') },
      },
      MIN_KEY,
      MAX_KEY,
    ),
    e: { f: 5, h: 9 },
    g: { f: 7 },
  });
});
