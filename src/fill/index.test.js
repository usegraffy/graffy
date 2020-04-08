// index.test.js

import Graffy from '@graffy/core';
import { page, link, makeGraph, makeQuery } from '@graffy/common';
import { mockBackend } from '@graffy/testing';
import live from './index.js';

let g, backend;

beforeEach(() => {
  g = new Graffy();
  g.use(live());
  backend = mockBackend();
  g.use(backend.middleware);

  backend.write(
    makeGraph(
      {
        bar: {
          1: { x: 1 },
          2: { x: 2 },
          3: { x: 3 },
          4: { x: 4 },
          5: { x: 5 },
        },
        foo: page({
          a: link(['bar', '1']),
          b: link(['bar', '2']),
          c: link(['bar', '3']),
          d: link(['bar', '4']),
          e: link(['bar', '5']),
        }),
      },
      0,
    ),
  );
});

// 1. broken link (linked data is unknown)
// 2. broken link (linked data is null)
// 3. broken link (linked data was there, got removed)
// 4. no broken link (linked data and link removed together)

test('indexes', async () => {
  const subscription = g.call(
    'watch',
    makeQuery({
      foo: [{ first: 3 }, { x: true }],
    }),
  );

  expect((await subscription.next()).value).toEqual(
    makeGraph(
      {
        bar: {
          1: { x: 1 },
          2: { x: 2 },
          3: { x: 3 },
        },
        foo: page(
          {
            a: link(['bar', '1']),
            b: link(['bar', '2']),
            c: link(['bar', '3']),
          },
          '',
          'c',
        ),
      },
      0,
    ),
  );

  backend.write(
    makeGraph(
      {
        bar: {
          2: null,
        },
        foo: {
          b: null,
        },
      },
      1,
    ),
  );

  expect((await subscription.next()).value).toEqual([
    {
      key: 'bar',
      version: 1,
      children: makeGraph(
        {
          1: { x: 1 },
          3: { x: 3 },
          4: { x: 4 },
        },
        0,
      ),
    },
    {
      key: 'foo',
      version: 1,
      children: [
        { key: '', end: '`\uffff', version: 0 },
        { key: 'a', path: ['bar', '1'], version: 0 },
        { key: 'a\0', end: 'a\uffff', version: 0 },
        { key: 'b', end: 'b', version: 1 },
        { key: 'b\0', end: 'b\uffff', version: 0 },
        { key: 'c', path: ['bar', '3'], version: 0 },
        { key: 'c\0', end: 'c\uffff', version: 0 },
        { key: 'd', path: ['bar', '4'], version: 0 },
      ],
    },
  ]);
});
