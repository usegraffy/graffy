import Graffy from '@graffy/core';
import { PAGE_KEY, makeLink, makePage, merge } from '@graffy/common';
import cache from './index.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const mockStream = (payloads, delay, gap, state) => {
  let i = 0;
  return async function*() {
    if (delay) {
      // console.log('Stream yields undefined');
      yield;
      sleep(delay);
      delay = 0;
    }
    while (i < payloads.length) {
      // console.log('Stream yields', payloads[i]);
      if (gap) sleep(gap);
      if (state) merge(state, payloads[i]);
      yield payloads[i++];
    }
  };
};

describe('changes', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
    g.use(cache());
  });

  test('simple-skipCache', async () => {
    g.onSub('/foo', mockStream([{ foo: { a: 3 } }, { foo: { a: 4 } }], 0, 10));
    const sub = g.sub({ foo: { a: 1 } }, { skipCache: 1 });

    expect((await sub.next()).value).toEqual({ foo: { a: 3 } });
    expect((await sub.next()).value).toEqual({ foo: { a: 4 } });
  });

  test('simple', async () => {
    g.onSub('/foo', mockStream([{ foo: { a: 3 } }, { foo: { a: 4 } }], 0, 10));
    const sub = g.sub({ foo: { a: 1 } });

    expect((await sub.next()).value).toEqual({ foo: { a: 3 } });
    expect((await sub.next()).value).toEqual({ foo: { a: 4 } });
  });

  test('overlap', async () => {
    g.onGet(() => ({ foo: { a: 2 }, bar: { b: 2 } }));
    g.onSub('/foo', mockStream([{ foo: { a: 3 } }, { foo: { a: 4 } }], 0, 10));
    g.onSub('/bar', mockStream([{ bar: { a: 7 } }, { bar: { b: 6 } }], 0, 10));
    const sub = g.sub({ foo: { a: 1 }, bar: { b: 1 } }, { raw: true });

    expect((await sub.next()).value).toEqual({ foo: { a: 3 }, bar: { b: 2 } });
    expect((await sub.next()).value).toEqual({ foo: { a: 4 } });
    expect((await sub.next()).value).toEqual({ bar: { b: 6 } });
  });

  test('link', async () => {
    g.onSub(
      '/foo',
      mockStream(
        [{ foo: makeLink(['bar', 'a']) }, { foo: makeLink(['bar', 'b']) }],
        0,
        10,
      ),
    );
    g.onSub(
      '/bar',
      mockStream([{ bar: { a: { x: 7 } } }, { bar: { b: { x: 3 } } }], 30, 10),
    );
    g.onGet('/bar', () => ({ bar: { a: { x: 3 }, b: { x: 5 } } }));

    const sub = g.sub({ foo: { x: 1 } }, { raw: true });
    expect((await sub.next()).value).toEqual({
      foo: makeLink(['bar', 'a']),
      bar: { a: { x: 3 } },
    });
    expect((await sub.next()).value).toEqual({
      foo: makeLink(['bar', 'b']),
      bar: { b: { x: 5 } },
    });

    // The /bar/a update should not be sent.
    expect((await sub.next()).value).toEqual({ bar: { b: { x: 3 } } });
  });

  test('range_deletion', async () => {
    g.onGet('/foo', () => ({
      foo: makePage({ a: 1, b: 2, c: 3, d: 4, e: 5 }),
    }));
    g.onSub('/foo', mockStream([{ foo: { b: null } }], 10, 10));

    const sub = g.sub({ foo: { '3**': 1 } }, { raw: true });
    expect((await sub.next()).value).toEqual({
      foo: { [PAGE_KEY]: ['', 'c'], a: 1, b: 2, c: 3 },
    });
    expect((await sub.next()).value).toEqual({
      foo: { [PAGE_KEY]: ['c', 'd'], b: null, c: 3, d: 4 },
    });
  });

  test('range_insertion', async () => {
    g.onGet('/foo', () => ({
      foo: makePage({ a: 1, c: 3, d: 4, e: 5 }),
    }));
    const fooStream = (async function*() {
      yield;
      await sleep(10);
      yield { foo: { b: 2 } };
    })();
    g.onSub('/foo', () => fooStream);

    const sub = g.sub({ foo: { '3**': 1 } }, { raw: true });
    expect((await sub.next()).value).toEqual({
      foo: { [PAGE_KEY]: ['', 'd'], a: 1, c: 3, d: 4 },
    });
    expect((await sub.next()).value).toEqual({
      foo: { b: 2 },
    });
  });
});

describe('values', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
    g.use(cache());
  });

  test('object', async () => {
    g.onGet('/foo', () => ({ foo: { a: 3 } }));
    g.onSub('/foo', mockStream([{ foo: { a: 4 } }], 10));

    const sub = g.sub({ foo: { a: 1 } });
    expect((await sub.next()).value).toEqual({ foo: { a: 3 } });
    expect((await sub.next()).value).toEqual({ foo: { a: 4 } });
  });

  test('link', async () => {
    let state = { bar: { a: { x: 5 }, b: { x: 6 } } };
    g.onSub(
      '/foo',
      mockStream(
        [{ foo: makeLink(['bar', 'a']) }, { foo: makeLink(['bar', 'b']) }],
        0,
        10,
        state,
      ),
    );
    g.onSub(
      '/bar',
      mockStream(
        [{ bar: { a: { x: 7 } } }, { bar: { b: { x: 3 } } }],
        30,
        10,
        state,
      ),
    );
    g.onGet(() => state);

    const sub = g.sub({ foo: { x: 1 } });
    expect((await sub.next()).value).toEqual({
      foo: { x: 5 },
    });
    expect((await sub.next()).value).toEqual({
      foo: { x: 6 },
    });
    // The /bar/a update should not be sent.
    expect((await sub.next()).value).toEqual({ foo: { x: 3 } });
  });

  test('range_deletion', async () => {
    g.onGet('/foo', () => ({
      foo: makePage({ a: 1, b: 2, c: 3, d: 4, e: 5 }),
    }));
    g.onSub('/foo', mockStream([{ foo: { b: null } }], 10, 10));

    const sub = g.sub({ foo: { '3**': 1 } });
    expect((await sub.next()).value).toEqual({
      foo: { a: 1, b: 2, c: 3 },
    });
    expect((await sub.next()).value).toEqual({
      foo: { a: 1, c: 3, d: 4 },
    });
  });

  test('accept_range_deletion_substitute', async () => {
    const onGet = jest.fn(() => {
      return { foo: makePage({ a: 1, b: 2, c: 3, d: 4, e: 5 }) };
    });
    g.onGet('/foo', onGet);
    g.onSub(
      '/foo',
      mockStream(
        [{ foo: { [PAGE_KEY]: ['c', 'd'], b: null, c: 3, d: 4 } }],
        10,
        10,
      ),
    );

    const sub = g.sub({ foo: { '3**': 1 } });
    expect((await sub.next()).value).toEqual({
      foo: { a: 1, b: 2, c: 3 },
    });
    expect(onGet).toHaveBeenCalledTimes(1);
    expect((await sub.next()).value).toEqual({
      foo: { a: 1, c: 3, d: 4 },
    });
    expect(onGet).toHaveBeenCalledTimes(1);
  });

  test('range_insertion', async () => {
    g.onGet('/foo', () => ({ foo: makePage({ a: 1, c: 3, d: 4, e: 5 }) }));
    g.onSub('/foo', mockStream([{ foo: { b: 2 } }], 10, 10));

    const sub = g.sub({ foo: { '3**': 1 } });
    expect((await sub.next()).value).toEqual({
      foo: { a: 1, c: 3, d: 4 },
    });
    expect((await sub.next()).value).toEqual({
      foo: { a: 1, b: 2, c: 3 },
    });
  });
});
