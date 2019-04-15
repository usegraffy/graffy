import Graffy from '@graffy/core';
import { LINK_KEY, PAGE_KEY, makeLink, makePage } from '@graffy/common';
import cache from './index.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('changes', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
    g.use(cache());
  });

  test('simple-skipCache', async () => {
    g.onSub('/foo', async function*() {
      yield { foo: { a: 3 } };
      await sleep(10);
      yield { foo: { a: 4 } };
    });
    const sub = g.sub({ foo: { a: 1 } }, { skipCache: 1 });

    expect((await sub.next()).value).toEqual({ foo: { a: 3 } });
    expect((await sub.next()).value).toEqual({ foo: { a: 4 } });
  });

  test('simple', async () => {
    g.onSub('/foo', async function*() {
      yield { foo: { a: 3 } };
      await sleep(10);
      yield { foo: { a: 4 } };
    });
    const sub = g.sub({ foo: { a: 1 } });

    expect((await sub.next()).value).toEqual({ foo: { a: 3 } });
    expect((await sub.next()).value).toEqual({ foo: { a: 4 } });
  });

  test('overlap', async () => {
    g.onGet(() => ({ foo: { a: 2 }, bar: { b: 2 } }));
    g.onSub('/foo', () => {
      console.log('Foo called');
      return (async function*() {
        console.log('Foo entered');
        yield { foo: { a: 3 } };
        await sleep(10);
        yield { foo: { a: 4 } };
      })();
    });

    g.onSub('/bar', () => {
      console.log('Bar called');
      return (async function*() {
        console.log('Bar entered');
        yield { bar: { a: 7 } };
        await sleep(10);
        console.log('Yielding bar:b:6');
        yield { bar: { b: 6 } };
      })();
    });

    const sub = g.sub({ foo: { a: 1 }, bar: { b: 1 } }, { raw: true });

    expect((await sub.next()).value).toEqual({ foo: { a: 3 }, bar: { b: 2 } });
    expect((await sub.next()).value).toEqual({ foo: { a: 4 } });
    console.log('OK');
    expect((await sub.next()).value).toEqual({ bar: { b: 6 } });
  });

  test('link', async () => {
    const fooStream = (async function*() {
      yield { foo: makeLink(['bar', 'a']) };
      await sleep(10);
      yield { foo: makeLink(['bar', 'b']) };
    })();

    const barStream = (async function*() {
      console.log('bar first');
      yield;
      await sleep(110);
      console.log('bar second');
      yield { bar: { a: { x: 7 } } };
      await sleep(10);
      console.log('bar third');
      yield { bar: { b: { x: 1 } } };
    })();

    g.onSub('/foo', () => {
      console.log('foo called');
      return fooStream;
    });

    g.onGet('/bar', () => ({ bar: { a: { x: 3 }, b: { x: 5 } } }));

    g.onSub('/bar', () => {
      console.log('bar called');
      return barStream;
    });

    const sub = g.sub({ foo: { x: 1 } }, { raw: 1 });
    expect((await sub.next()).value).toEqual({
      foo: makeLink(['bar', 'a']),
      bar: { a: { x: 3 } },
    });
    console.log('First assertion passed;');
    expect((await sub.next()).value).toEqual({
      foo: makeLink(['bar', 'b']),
      bar: { b: { x: 5 } /*, a: null */ },
      // TODO: Should we explicitly remove data that is no longer kept up to
      // date, or leave that for the consumer to figure out?
    });
    console.log('Second assertion passed;');

    // The /bar/a update should not be sent.
    expect((await sub.next()).value).toEqual({ bar: { b: { x: 5 } } });
    console.log('Third assertion passed;');
  });

  test('range_deletion', async () => {
    g.onSub('/foo', () => ({ foo: { a: 1, b: 2, c: 3, d: 4, e: 5 } }));
    setTimeout(() => g.pub({ foo: { b: null } }), 10);

    const sub = g.sub({ foo: { '3**': 1 } }, { raw: 1 });
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

    const sub = g.sub({ foo: { '3**': 1 } }, { raw: 1 });
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
    const sub = g.sub({ foo: { a: 1 } });
    expect((await sub.next()).value).toEqual({ foo: { a: 3 } });
    expect((await sub.next()).value).toEqual({ foo: { a: 4 } });
  });

  test('link', async () => {
    g.onSub('/foo', () => ({ foo: makeLink(['bar', 'a']) }));
    g.onSub('/bar', () => ({ bar: { a: { x: 3 }, b: { x: 5 } } }));
    setTimeout(() => g.pub({ foo: makeLink(['bar', 'b']) }), 10);
    setTimeout(() => g.pub({ bar: { a: { x: 7 } } }), 20);
    setTimeout(() => g.pub({ bar: { b: { x: 1 } } }), 20);

    const sub = g.sub({ foo: { x: 1 } });
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

    const sub = g.sub({ foo: { '3**': 1 } });
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

    const sub = g.sub({ foo: { '3**': 1 } });
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

    const sub = g.sub({ foo: { '3**': 1 } });
    expect((await sub.next()).value).toEqual({
      foo: { a: 1, c: 3, d: 4 },
    });
    expect((await sub.next()).value).toEqual({
      foo: { a: 1, b: 2, c: 3 },
    });
  });
});
