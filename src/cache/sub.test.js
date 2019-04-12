import Graffy from '@graffy/core';
import { LINK_KEY, PAGE_KEY } from '@graffy/common';
import cache from './index.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('changes', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
    g.use(cache());
  });

  test('link', async () => {
    g.onSub('/foo', async function*() {
      console.log('Foo called');
      yield { foo: { [LINK_KEY]: ['bar', 'a'] } };
      await sleep(10);
      yield { foo: { [LINK_KEY]: ['bar', 'b'] } };
    });
    g.onSub('/bar', () => ({ bar: { a: { x: 3 }, b: { x: 5 } } }));
    setTimeout(() => g.pub(), 10);
    setTimeout(() => g.pub({ bar: { a: { x: 7 } } }), 20);
    setTimeout(() => g.pub({ bar: { b: { x: 1 } } }), 20);

    const sub = g.sub({ foo: { x: true } }, { raw: true });
    expect((await sub.next()).value).toEqual({
      foo: { [LINK_KEY]: ['bar', 'a'] },
      bar: { a: { x: 3 } },
    });
    expect((await sub.next()).value).toEqual({
      foo: { [LINK_KEY]: ['bar', 'b'] },
      bar: { b: { x: 5 } /*, a: null */ },
      // TODO: Should we explicitly remove data that is no longer kept up to
      // date, or leave that for the consumer to figure out?
    });
    // The /bar/a update should not be sent.
    expect((await sub.next()).value).toEqual({ bar: { b: { x: 1 } } });
  });

  test('range_deletion', async () => {
    g.onSub('/foo', () => ({ foo: { a: 1, b: 2, c: 3, d: 4, e: 5 } }));
    setTimeout(() => g.pub({ foo: { b: null } }), 10);

    const sub = g.sub({ foo: { '3**': true } }, { raw: true });
    expect((await sub.next()).value).toEqual({
      foo: { [PAGE_KEY]: ['', 'c'], a: 1, b: 2, c: 3 },
    });
    expect((await sub.next()).value).toEqual({
      foo: { [PAGE_KEY]: ['c', 'd'], b: null, c: 3, d: 4 },
    });
  });

  test('range_insertion', async () => {
    g.onSub('/foo', () => ({ foo: { a: 1, c: 3, d: 4, e: 5 } }));
    setTimeout(() => g.pub({ foo: { b: 2 } }), 10);

    const sub = g.sub({ foo: { '3**': true } }, { raw: true });
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
  });

  test('object', async () => {
    g.onSub('/foo', () => ({ foo: { a: 3 } }));
    setTimeout(() => g.pub({ foo: { a: 4 } }), 10);
    const sub = g.sub({ foo: { a: true } });
    expect((await sub.next()).value).toEqual({ foo: { a: 3 } });
    expect((await sub.next()).value).toEqual({ foo: { a: 4 } });
  });

  test('link', async () => {
    g.onSub('/foo', () => ({ foo: { [LINK_KEY]: ['bar', 'a'] } }));
    g.onSub('/bar', () => ({ bar: { a: { x: 3 }, b: { x: 5 } } }));
    setTimeout(() => g.pub({ foo: { [LINK_KEY]: ['bar', 'b'] } }), 10);
    setTimeout(() => g.pub({ bar: { a: { x: 7 } } }), 20);
    setTimeout(() => g.pub({ bar: { b: { x: 1 } } }), 20);

    const sub = g.sub({ foo: { x: true } });
    expect((await sub.next()).value).toEqual({
      foo: { x: 3 },
    });
    expect((await sub.next()).value).toEqual({
      foo: { x: 5 },
      // TODO: Should we explicitly remove data that is no longer kept up to
      // date, or leave that for the consumer to figure out?
    });
    // The /bar/a update should not be sent.
    expect((await sub.next()).value).toEqual({ foo: { x: 1 } });
  });

  test('range_deletion', async () => {
    g.onSub('/foo', () => ({ foo: { a: 1, b: 2, c: 3, d: 4, e: 5 } }));
    setTimeout(() => g.pub({ foo: { b: null } }), 10);

    const sub = g.sub({ foo: { '3**': true } });
    expect((await sub.next()).value).toEqual({
      foo: { a: 1, b: 2, c: 3 },
    });
    expect((await sub.next()).value).toEqual({
      foo: { a: 1, c: 3, d: 4 },
    });
  });

  test('accept_range_deletion_substitute', async () => {
    const onSub = jest.fn(() => {
      return { foo: { a: 1, b: 2, c: 3, d: 4, e: 5 } };
    });
    g.onSub('/foo', onSub);
    setTimeout(
      () => g.pub({ foo: { [PAGE_KEY]: ['c', 'd'], b: null, c: 3, d: 4 } }),
      10,
    );

    const sub = g.sub({ foo: { '3**': true } });
    expect((await sub.next()).value).toEqual({
      foo: { a: 1, b: 2, c: 3 },
    });
    expect(onSub).toHaveBeenCalledTimes(1);
    expect((await sub.next()).value).toEqual({
      foo: { a: 1, c: 3, d: 4 },
    });
    expect(onSub).toHaveBeenCalledTimes(1);
  });

  test('range_insertion', async () => {
    g.onSub('/foo', () => ({ foo: { a: 1, c: 3, d: 4, e: 5 } }));
    setTimeout(() => g.pub({ foo: { b: 2 } }), 10);

    const sub = g.sub({ foo: { '3**': true } });
    expect((await sub.next()).value).toEqual({
      foo: { a: 1, c: 3, d: 4 },
    });
    expect((await sub.next()).value).toEqual({
      foo: { a: 1, b: 2, c: 3 },
    });
  });
});
