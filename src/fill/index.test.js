// index.test.js

import Graffy from '@graffy/core';
import { makeGraph, makeQuery } from '@graffy/common';
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
        foo: [
          { _key_: { before: ['a'] } },
          { _key_: ['a'], _ref_: ['bar', '1'] },
          { _key_: { after: ['a'], before: ['b'] } },
          { _key_: ['b'], _ref_: ['bar', '2'] },
          { _key_: { after: ['b'], before: ['c'] } },
          { _key_: ['c'], _ref_: ['bar', '3'] },
          { _key_: { after: ['c'], before: ['d'] } },
          { _key_: ['d'], _ref_: ['bar', '4'] },
          { _key_: { after: ['d'], before: ['e'] } },
          { _key_: ['e'], _ref_: ['bar', '5'] },
          { _key_: { after: ['e'] } },
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
    makeQuery({
      foo: { _key_: { first: 3 }, x: true },
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
        foo: [
          { _key_: { before: ['a'] } },
          { _key_: ['a'], _ref_: ['bar', '1'] },
          { _key_: { after: ['a'], before: ['b'] } },
          { _key_: ['b'], _ref_: ['bar', '2'] },
          { _key_: { after: ['b'], before: ['c'] } },
          { _key_: ['c'], _ref_: ['bar', '3'] },
        ],
      },
      0,
    ),
  );

  backend.write(
    makeGraph(
      {
        bar: { 2: null },
        foo: [{ _key_: ['b'] }],
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
        ...makeGraph(
          [
            { _key_: { before: ['a'] } },
            { _key_: ['a'], _ref_: ['bar', '1'] },
            { _key_: { after: ['a'], before: ['b'] } },
            // While there are no entries in the range
            // { after: ['a'], before: ['b'] },
            // our knowledge of the lack of 'b' is more recent
            // our knowledge of other values in this range.
            { _key_: { since: ['b'], until: ['b'] }, _ver_: 1 },
            { _key_: { after: ['b'], before: ['c'] } },
            { _key_: ['c'], _ref_: ['bar', '3'] },
            { _key_: { after: ['c'], before: ['d'] } },
            { _key_: ['d'], _ref_: ['bar', '4'] },
          ],
          0,
        ),
      ],
    },
  ]);
});
