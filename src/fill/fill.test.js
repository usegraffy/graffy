import Graffy from '@graffy/core';
import { page, link, graph, query, decorate } from '@graffy/decorate';
import { merge } from '@graffy/struct';
import live from './index.js';

const debug = (graph, indent = '') =>
  '\n' +
  graph
    .map(({ key, end, children, ...props }) =>
      [
        indent,
        key,
        end ? `..${end} { ` : ' { ',
        Object.keys(props)
          .map(key => `${key}:${JSON.stringify(props[key])}`)
          .join(' '),
        children ? debug(children, indent + '  ') : '',
        ' }',
      ].join(''),
    )
    .join('\n');

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
      const payload = graph(payloads[i]);
      // console.log('Payload', payload);
      if (gap) sleep(gap);
      if (state) merge(state, payload);
      i++;
      // console.log('mockStream yields', debug(payload));
      yield payload;
    }
  };
};
const expectNext = async (sub, expected) => {
  expect((await sub.next()).value).toEqual(graph(expected));
};

describe('changes', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
    g.use(live());
  });

  test('simple-skipFill', async () => {
    g.onSub('/foo', mockStream([{ foo: { a: 3 } }, { foo: { a: 4 } }], 0, 10));
    const sub = g.sub(query({ foo: { a: 1 } }, 0), { skipFill: 1 });

    await expectNext(sub, { foo: { a: 3 } });
    await expectNext(sub, { foo: { a: 4 } });
  });

  test('simple', async () => {
    g.onGet('/foo', () => graph({ foo: { a: 3 } }));
    g.onSub('/foo', mockStream([{ foo: { a: 3 } }, { foo: { a: 4 } }], 0, 10));
    const sub = g.sub(query({ foo: { a: 1 } }, 0));

    await expectNext(sub, { foo: { a: 3 } });
    await expectNext(sub, { foo: { a: 4 } });
  });

  test('overlap', async () => {
    g.onGet(() => graph({ foo: { a: 2 }, bar: { b: 2 } }));
    g.onSub('/foo', mockStream([{ foo: { a: 3 } }, { foo: { a: 4 } }], 0, 10));
    g.onSub('/bar', mockStream([{ bar: { a: 7 } }, { bar: { b: 6 } }], 0, 10));
    const sub = g.sub(query({ foo: { a: 1 }, bar: { b: 1 } }, 0), {
      raw: true,
    });

    await expectNext(sub, { foo: { a: 3 }, bar: { b: 2 } });
    await expectNext(sub, { foo: { a: 4 } });
    await expectNext(sub, { bar: { b: 6 } });
  });

  test.only('link', async () => {
    g.onSub(
      '/foo',
      mockStream(
        [{ foo: link(['bar', 'a']) }, { foo: link(['bar', 'b']) }],
        0,
        10,
      ),
    );
    g.onSub(
      '/bar',
      mockStream([{ bar: { a: { x: 7 } } }, { bar: { b: { x: 3 } } }], 30, 10),
    );
    g.onGet('/bar', () => graph({ bar: { a: { x: 3 }, b: { x: 5 } } }));

    const sub = g.sub(query({ foo: { x: 1 } }, 0), { raw: true });
    await expectNext(sub, { foo: link(['bar', 'a']), bar: { a: { x: 3 } } });
    console.log('First assert passed');
    await expectNext(sub, { foo: link(['bar', 'b']), bar: { b: { x: 5 } } });
    console.log('Second assert passed');

    // The /bar/a update should not be sent.
    await expectNext(sub, { bar: { b: { x: 3 } } });
  });

  test('range_deletion', async () => {
    g.onGet('/foo', () =>
      graph({
        foo: page({ a: 1, b: 2, c: 3, d: 4, e: 5 }),
      }),
    );
    g.onSub('/foo', mockStream([{ foo: { b: null } }], 10, 10));

    const sub = g.sub(query({ foo: { '3**': 1 } }, 0), { raw: true });
    await expectNext(sub, { foo: page({ a: 1, b: 2, c: 3 }, '', 'c') });
    await expectNext(sub, { foo: page({ b: null, c: 3, d: 4 }, 'c', 'd') });
  });

  test('range_insertion', async () => {
    g.onGet('/foo', () =>
      graph({
        foo: page({ a: 1, c: 3, d: 4, e: 5 }),
      }),
    );
    const fooStream = (async function*() {
      yield;
      await sleep(10);
      yield graph({ foo: { b: 2 } });
    })();
    g.onSub('/foo', () => fooStream);

    const sub = g.sub(query({ foo: { '3**': 1 } }, 0), { raw: true });
    await expectNext(sub, { foo: page({ a: 1, c: 3, d: 4 }, '', 'd') });
    await expectNext(sub, { foo: { b: 2 } });
  });
});

describe('values', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
    g.use(live());
  });

  test('object', async () => {
    g.onGet('/foo', () => graph({ foo: { a: 3 } }));
    g.onSub('/foo', mockStream([{ foo: { a: 4 } }], 10));

    const sub = g.sub(query({ foo: { a: 1 } }, 0));
    await expectNext(sub, { foo: { a: 3 } });
    await expectNext(sub, { foo: { a: 4 } });
  });

  test('link', async () => {
    let state = graph({ bar: { a: { x: 5 }, b: { x: 6 } } });
    g.onSub(
      '/foo',
      mockStream(
        [{ foo: link(['bar', 'a']) }, { foo: link(['bar', 'b']) }],
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

    const sub = g.sub(query({ foo: { x: 1 } }, 0));
    await expectNext(sub, { foo: { x: 5 } });
    await expectNext(sub, { foo: { x: 6 } });
    // The /bar/a update should not be sent.
    await expectNext(sub, { foo: { x: 3 } });
  });

  test('range_deletion', async () => {
    g.onGet('/foo', () =>
      graph({
        foo: page({ a: 1, b: 2, c: 3, d: 4, e: 5 }),
      }),
    );
    g.onSub('/foo', mockStream([{ foo: { b: null } }], 10, 10));

    const sub = g.sub(query({ foo: { '3**': 1 } }, 0));
    await expectNext(sub, { foo: { a: 1, b: 2, c: 3 } });
    await expectNext(sub, { foo: { a: 1, c: 3, d: 4 } });
  });

  test('accept_range_deletion_substitute', async () => {
    const onGet = jest.fn(() => {
      return { foo: page({ a: 1, b: 2, c: 3, d: 4, e: 5 }) };
    });
    g.onGet('/foo', onGet);
    g.onSub(
      '/foo',
      mockStream([{ foo: page({ b: null, c: 3, d: 4 }, 'c', 'd') }], 10, 10),
    );

    const sub = g.sub(query({ foo: { '3**': 1 } }, 0));
    await expectNext(sub, { foo: { a: 1, b: 2, c: 3 } });
    expect(onGet).toHaveBeenCalledTimes(1);
    await expectNext(sub, { foo: { a: 1, c: 3, d: 4 } });
    expect(onGet).toHaveBeenCalledTimes(1);
  });

  test('range_insertion', async () => {
    g.onGet('/foo', () => graph({ foo: page({ a: 1, c: 3, d: 4, e: 5 }) }));
    g.onSub('/foo', mockStream([{ foo: { b: 2 } }], 10, 10));

    const sub = g.sub(query({ foo: { '3**': 1 } }, 0));
    await expectNext(sub, { foo: { a: 1, c: 3, d: 4 } });
    await expectNext(sub, { foo: { a: 1, b: 2, c: 3 } });
  });
});
