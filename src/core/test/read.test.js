import Graffy from '../Graffy.js';
import fill from '@graffy/fill';

let g;
beforeEach(() => {
  g = new Graffy();
  g.use(fill());
});

test('simple', async () => {
  g.use('foo', (graffy) => {
    graffy.onRead('bar', () => Promise.resolve({ baz: 42 }));
  });
  expect(await g.read('foo', { bar: { baz: 1 } })).toEqual({
    bar: { baz: 42 },
  });
});

test('overlap', async () => {
  g.use('foo', (graffy) => {
    graffy.onRead('baz', () => Promise.resolve({ x: 15 }));
    graffy.onRead('bar', () => Promise.resolve({ x: 42 }));
  });
  expect(await g.read({ foo: { bar: { x: 1 }, baz: { x: 1 } } })).toEqual({
    foo: { bar: { x: 42 }, baz: { x: 15 } },
  });
});

test('remove_null', async () => {
  g.onRead('foo', () => ({ bar: 45, baz: null }));
  expect(await g.read({ foo: { bar: 1, baz: 1 } })).toEqual({
    foo: { bar: 45, baz: null },
  });
});

test('leaf_branch_mismatch', async () => {
  g.onRead('foo', () => ({ bar: 45, baz: { bad: 3 }, f: 3 }));
  expect(
    async () => await g.read({ foo: { bar: 1, baz: 1 } }),
  ).rejects.toThrow();
});

test('getKnown', async () => {
  g.use((graffy) => {
    graffy.onRead('foo', () => Promise.resolve({ baz: 15, bar: 42 }));
  });
  expect(await g.read({ foo: { bar: 1 } })).toEqual({
    foo: { bar: 42 },
  });
});

describe('range-getKnown', () => {
  let provider;
  beforeEach(() => {
    provider = jest.fn(() => {
      return {
        foo: [
          { $key: { x: 'a' }, baz: 15, bar: 42 },
          { $key: { x: 'b' }, baz: 16, bar: 41 },
          { $key: { x: 'c' }, baz: 17, bar: 40 },
          { $key: { x: 'd' }, baz: 18, bar: 39 },
          { $key: { x: 'e' }, baz: 19, bar: 38 },
        ],
      };
    });
    g.onRead(provider);
  });

  test('all', async () => {
    const result = await g.read({
      foo: { $key: { $first: 100 }, bar: 1 },
    });
    expect(provider).toBeCalledWith(
      { foo: [{ $key: { $first: 100 }, bar: true }] },
      {},
    );
    const expected = {
      foo: [
        { $key: { x: 'a' }, bar: 42 },
        { $key: { x: 'b' }, bar: 41 },
        { $key: { x: 'c' }, bar: 40 },
        { $key: { x: 'd' }, bar: 39 },
        { $key: { x: 'e' }, bar: 38 },
      ],
    };
    expected.foo.$page = { $all: true };
    expected.foo.$next = null;
    expected.foo.$prev = null;
    expect(result).toEqual(expected);
  });

  test('simple-first', async () => {
    const result = await g.read({ foo: { $key: { $first: 2 }, bar: 1 } });
    const expected = {
      foo: [
        { $key: { x: 'a' }, bar: 42 },
        { $key: { x: 'b' }, bar: 41 },
      ],
    };
    expected.foo.$page = { $all: true, $until: { x: 'b' } };
    expected.foo.$next = { $first: 2, $after: { x: 'b' } };
    expected.foo.$prev = null;
    expect(result).toEqual(expected);
  });
  test('simple-last', async () => {
    const result = await g.read({ foo: { $key: { $last: 1 }, bar: 1 } });
    const expected = { foo: [{ $key: { x: 'e' }, bar: 38 }] };
    expected.foo.$page = { $all: true, $since: { x: 'e' } };
    expected.foo.$next = null;
    expected.foo.$prev = { $last: 1, $before: { x: 'e' } };
    expect(result).toEqual(expected);
  });
  test('first-since', async () => {
    const result = await g.read({
      foo: { $key: { $first: 2, $since: { x: 'b' } }, bar: 1 },
    });
    const expected = {
      foo: [
        { $key: { x: 'b' }, bar: 41 },
        { $key: { x: 'c' }, bar: 40 },
      ],
    };
    expected.foo.$page = { $all: true, $since: { x: 'b' }, $until: { x: 'c' } };
    expected.foo.$next = { $first: 2, $after: { x: 'c' } };
    expected.foo.$prev = { $last: 2, $before: { x: 'b' } };
    expect(result).toEqual(expected);
  });
  test('last-until', async () => {
    const result = await g.read({
      foo: { $key: { $last: 3, $until: { x: 'd' } }, bar: 1 },
    });
    const expected = {
      foo: [
        { $key: { x: 'b' }, bar: 41 },
        { $key: { x: 'c' }, bar: 40 },
        { $key: { x: 'd' }, bar: 39 },
      ],
    };
    expected.foo.$page = { $all: true, $until: { x: 'd' }, $since: { x: 'b' } };
    expected.foo.$next = { $first: 3, $after: { x: 'd' } };
    expected.foo.$prev = { $last: 3, $before: { x: 'b' } };
    expect(result).toEqual(expected);
  });
  test('first-until-since', async () => {
    const result = await g.read({
      foo: {
        $key: { $since: { x: 'b' }, $until: { x: 'g' }, $first: 2 },
        bar: 1,
      },
    });
    const expected = {
      foo: [
        { $key: { x: 'b' }, bar: 41 },
        { $key: { x: 'c' }, bar: 40 },
      ],
    };
    expected.foo.$page = { $all: true, $since: { x: 'b' }, $until: { x: 'c' } };
    expected.foo.$next = { $first: 2, $after: { x: 'c' } };
    expected.foo.$prev = { $last: 2, $before: { x: 'b' } };
    expect(result).toEqual(expected);
  });
  test('last-until-since', async () => {
    const result = await g.read({
      foo: {
        $key: { $since: { x: 'a' }, $until: { x: 'd' }, $last: 3 },
        bar: 1,
      },
    });
    const expected = {
      foo: [
        { $key: { x: 'b' }, bar: 41 },
        { $key: { x: 'c' }, bar: 40 },
        { $key: { x: 'd' }, bar: 39 },
      ],
    };
    expected.foo.$page = { $all: true, $since: { x: 'b' }, $until: { x: 'd' } };
    expected.foo.$next = { $first: 3, $after: { x: 'd' } };
    expected.foo.$prev = { $last: 3, $before: { x: 'b' } };
    expect(result).toEqual(expected);
  });
  test('first-until-since-filled', async () => {
    const result = await g.read({
      foo: {
        $key: { $since: { x: 'b' }, $until: { x: 'c' }, $first: 4 },
        bar: 1,
      },
    });
    const expected = {
      foo: [
        { $key: { x: 'b' }, bar: 41 },
        { $key: { x: 'c' }, bar: 40 },
      ],
    };
    expected.foo.$page = { $all: true, $since: { x: 'b' }, $until: { x: 'c' } };
    expected.foo.$next = { $first: 4, $after: { x: 'c' } };
    expected.foo.$prev = { $last: 4, $before: { x: 'b' } };
    expect(result).toEqual(expected);
  });
  test('last-until-since-filled', async () => {
    const result = await g.read({
      foo: {
        $key: { $since: { x: 'b' }, $until: { x: 'd' }, $last: 5 },
        bar: 1,
      },
    });
    const expected = {
      foo: [
        { $key: { x: 'b' }, bar: 41 },
        { $key: { x: 'c' }, bar: 40 },
        { $key: { x: 'd' }, bar: 39 },
      ],
    };
    expected.foo.$page = { $all: true, $since: { x: 'b' }, $until: { x: 'd' } };
    expected.foo.$next = { $first: 5, $after: { x: 'd' } };
    expected.foo.$prev = { $last: 5, $before: { x: 'b' } };
    expect(result).toEqual(expected);
  });
});

describe('link', () => {
  beforeEach(() => {
    g.onRead('foo', () => ({ x: { $ref: ['bar'] } }));
    g.onRead('bar', () => ({ baz: 3 }));
  });

  test('friendly', async () => {
    expect(await g.read({ foo: { x: { baz: 1 } } })).toEqual({
      foo: { x: { $ref: ['bar'], baz: 3 } },
    });
  });
});

describe('alias', () => {
  test('simple', async () => {
    g.onRead('foo', () => ({ x: 100 }));
    expect(await g.read({ bar: { $ref: ['foo'], x: 1 } })).toEqual({
      bar: { $ref: ['foo'], x: 100 },
    });
  });

  test('range', async () => {
    g.onRead('foo', () => [
      { $key: { t: 3, $cursor: 1 }, x: 100 },
      { $key: { t: 3, $cursor: 2 }, x: 200 },
      { $key: { t: 3, $cursor: 3 }, x: 300 },
    ]);
    const result = await g.read({
      bar: { $ref: ['foo', { t: 3, $first: 2 }], x: 1 },
    });
    const expectedArray = [
      { $key: { t: 3, $cursor: 1 }, x: 100 },
      { $key: { t: 3, $cursor: 2 }, x: 200 },
    ];
    expectedArray.$page = { $all: true, $until: 2 };
    expectedArray.$next = { $first: 2, $after: 2 };
    expectedArray.$prev = null;
    expectedArray.$ref = ['foo', { t: 3, $first: 2 }];

    expect(result).toEqual({
      bar: expectedArray,
    });
  });
});
