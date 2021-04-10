// index.test.js

import Graffy from '@graffy/core';
import { encodeGraph, encodeQuery } from '@graffy/common';
import { mockBackend } from '@graffy/testing';
import live from './index.js';

let g, backend;

beforeEach(() => {
  g = new Graffy();
  g.use(live());
  backend = mockBackend();
  g.use(backend.middleware);

  backend.write(
    encodeGraph(
      {
        bar: {
          1: { x: 1 },
          2: { x: 2 },
          3: { x: 3 },
          4: { x: 4 },
          5: { x: 5 },
        },
        foo: [
          { $key: { before: ['a'] } },
          { $key: ['a'], $ref: ['bar', '1'] },
          { $key: { after: ['a'], before: ['b'] } },
          { $key: ['b'], $ref: ['bar', '2'] },
          { $key: { after: ['b'], before: ['c'] } },
          { $key: ['c'], $ref: ['bar', '3'] },
          { $key: { after: ['c'], before: ['d'] } },
          { $key: ['d'], $ref: ['bar', '4'] },
          { $key: { after: ['d'], before: ['e'] } },
          { $key: ['e'], $ref: ['bar', '5'] },
          { $key: { after: ['e'] } },
        ],
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
    encodeQuery({
      foo: { $key: { first: 3 }, x: true },
    }),
  );

  expect((await subscription.next()).value).toEqual(
    encodeGraph(
      {
        bar: {
          1: { x: 1 },
          2: { x: 2 },
          3: { x: 3 },
        },
        foo: [
          { $key: { before: ['a'] } },
          { $key: ['a'], $ref: ['bar', '1'] },
          { $key: { after: ['a'], before: ['b'] } },
          { $key: ['b'], $ref: ['bar', '2'] },
          { $key: { after: ['b'], before: ['c'] } },
          { $key: ['c'], $ref: ['bar', '3'] },
        ],
      },
      0,
    ),
  );

  backend.write(
    encodeGraph(
      {
        bar: { 2: null },
        foo: [{ $key: ['b'] }],
      },
      1,
    ),
  );

  expect((await subscription.next()).value).toEqual([
    {
      key: 'bar',
      version: 1,
      children: encodeGraph(
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
        ...encodeGraph(
          [
            { $key: { before: ['a'] } },
            { $key: ['a'], $ref: ['bar', '1'] },
            { $key: { after: ['a'], before: ['b'] } },
            // While there are no entries in the range
            // { after: ['a'], before: ['b'] },
            // our knowledge of the lack of 'b' is more recent
            // our knowledge of other values in this range.
            { $key: { since: ['b'], until: ['b'] }, $ver: 1 },
            { $key: { after: ['b'], before: ['c'] } },
            { $key: ['c'], $ref: ['bar', '3'] },
            { $key: { after: ['c'], before: ['d'] } },
            { $key: ['d'], $ref: ['bar', '4'] },
          ],
          0,
        ),
      ],
    },
  ]);
});
