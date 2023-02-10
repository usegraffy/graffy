import { jest } from '@jest/globals';
import Graffy from '../Graffy.js';
import fill from '@graffy/fill';
import { keyref, page, put, ref } from '@graffy/testing';

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
      expect.any(Function),
    );
    const expected = {
      foo: page({ $all: true }, null, [
        { $key: { x: 'a' }, bar: 42 },
        { $key: { x: 'b' }, bar: 41 },
        { $key: { x: 'c' }, bar: 40 },
        { $key: { x: 'd' }, bar: 39 },
        { $key: { x: 'e' }, bar: 38 },
      ]),
    };
    expect(result).toEqual(expected);
  });

  test('simple-first', async () => {
    const result = await g.read({ foo: { $key: { $first: 2 }, bar: 1 } });
    const expected = {
      foo: page({ $until: { x: 'b' } }, 2, [
        { $key: { x: 'a' }, bar: 42 },
        { $key: { x: 'b' }, bar: 41 },
      ]),
    };
    expect(result).toEqual(expected);
  });
  test('simple-last', async () => {
    const result = await g.read({ foo: { $key: { $last: 1 }, bar: 1 } });
    const expected = {
      foo: page({ $since: { x: 'e' } }, 1, [{ $key: { x: 'e' }, bar: 38 }]),
    };
    expect(result).toEqual(expected);
  });
  test('first-since', async () => {
    const result = await g.read({
      foo: { $key: { $first: 2, $since: { x: 'b' } }, bar: 1 },
    });
    const expected = {
      foo: page({ $since: { x: 'b' }, $until: { x: 'c' } }, 2, [
        { $key: { x: 'b' }, bar: 41 },
        { $key: { x: 'c' }, bar: 40 },
      ]),
    };
    expect(result).toEqual(expected);
  });
  test('last-until', async () => {
    const result = await g.read({
      foo: { $key: { $last: 3, $until: { x: 'd' } }, bar: 1 },
    });
    const expected = {
      foo: page({ $until: { x: 'd' }, $since: { x: 'b' } }, 3, [
        { $key: { x: 'b' }, bar: 41 },
        { $key: { x: 'c' }, bar: 40 },
        { $key: { x: 'd' }, bar: 39 },
      ]),
    };
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
      foo: page({ $since: { x: 'b' }, $until: { x: 'c' } }, 2, [
        { $key: { x: 'b' }, bar: 41 },
        { $key: { x: 'c' }, bar: 40 },
      ]),
    };
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
      foo: page({ $since: { x: 'b' }, $until: { x: 'd' } }, 3, [
        { $key: { x: 'b' }, bar: 41 },
        { $key: { x: 'c' }, bar: 40 },
        { $key: { x: 'd' }, bar: 39 },
      ]),
    };
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
      foo: page({ $since: { x: 'b' }, $until: { x: 'c' } }, 4, [
        { $key: { x: 'b' }, bar: 41 },
        { $key: { x: 'c' }, bar: 40 },
      ]),
    };
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
      foo: page({ $since: { x: 'b' }, $until: { x: 'd' } }, 5, [
        { $key: { x: 'b' }, bar: 41 },
        { $key: { x: 'c' }, bar: 40 },
        { $key: { x: 'd' }, bar: 39 },
      ]),
    };
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
      foo: { x: ref(['bar'], { baz: 3 }) },
    });
  });
});

describe('alias', () => {
  test('simple', async () => {
    g.onRead('foo', () => ({ x: 100 }));
    expect(await g.read({ bar: { $ref: ['foo'], x: 1 } })).toEqual({
      bar: ref(['foo'], { x: 100 }),
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
    const expectedArray = ref(
      ['foo', { t: 3, $first: 2 }],
      page({ $until: 2 }, 2, [
        { $key: { t: 3, $cursor: 1 }, x: 100 },
        { $key: { t: 3, $cursor: 2 }, x: 200 },
      ]),
    );

    expect(result).toEqual({
      bar: expectedArray,
    });
  });
});

describe.skip('middleware_coding', () => {
  test('no_path', async () => {
    const composedResult = [
      keyref({ foo: 'bar', $cursor: [3847, 'p1'] }, ['participant', 'p1'], {
        name: 'Participant1',
      }),
      keyref({ foo: 'bar', $cursor: [4826, 'p2'] }, ['participant', 'p2'], {
        name: 'Participant2',
      }),
    ];

    const decomposedResult = put(
      [
        { $key: 'p1', name: 'Participant1' },
        { $key: 'p2', name: 'Participant2' },
        keyref({ foo: 'bar', $cursor: [3847, 'p1'] }, ['participant', 'p1']),
        keyref({ foo: 'bar', $cursor: [4826, 'p2'] }, ['participant', 'p2']),
      ],
      [{ foo: 'bar', $until: [4826, 'p2'] }],
    );

    g.onRead(async (query, options, next) => {
      const result = await next(query, options);
      expect(result).toEqual({ participant: decomposedResult });
      return result;
    });
    g.onRead(async (query) => {
      return { participant: composedResult };
    });

    const res = await g.read(['participant', { foo: 'bar', $first: 2 }], {
      name: true,
    });
    const exp = page({ foo: 'bar', $until: [4826, 'p2'] }, 2, composedResult);
    expect(res).toEqual(exp);
  });

  test('downstream_path', async () => {
    const composedResult = [
      keyref({ foo: 'bar', $cursor: [3847, 'p1'] }, ['participant', 'p1'], {
        name: 'Participant1',
      }),
      keyref({ foo: 'bar', $cursor: [4826, 'p2'] }, ['participant', 'p2'], {
        name: 'Participant2',
      }),
    ];

    const decomposedResult = put(
      [
        { $key: 'p1', name: 'Participant1' },
        { $key: 'p2', name: 'Participant2' },
        keyref({ foo: 'bar', $cursor: [3847, 'p1'] }, ['participant', 'p1']),
        keyref({ foo: 'bar', $cursor: [4826, 'p2'] }, ['participant', 'p2']),
      ],
      [{ foo: 'bar', $until: [4826, 'p2'] }],
    );

    g.onRead(async (query, options, next) => {
      const result = await next(query, options);
      expect(result).toEqual({ participant: decomposedResult });
      return result;
    });
    g.onRead('participant', async (query) => {
      return composedResult;
    });

    const res = await g.read(['participant', { foo: 'bar', $first: 2 }], {
      name: true,
    });
    const exp = page({ foo: 'bar', $until: [4826, 'p2'] }, 2, composedResult);
    expect(res).toEqual(exp);
  });
});
