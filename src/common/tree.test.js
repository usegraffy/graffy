import { prune, sprout, strike } from './tree';
import { MIN_KEY, MAX_KEY, makeLink, makePage } from './constants';

const link = makeLink;
const page = makePage;

test('strike', () => {
  expect(
    strike(
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
    b: { c: link('/e') },
    d: { c: link('/g') },
    l: { c: link('/m') },
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
