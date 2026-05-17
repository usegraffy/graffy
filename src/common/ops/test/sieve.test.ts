import assert from 'node:assert/strict';
import { test } from 'node:test';
import { e } from '@graffy/testing/encoder.ts';
import { encodeGraph } from '../../coding/index.ts';
import { MAX_KEY, MIN_KEY } from '../../util.ts';
import sieve from '../sieve.ts';
import { keyAfter as aft, keyBefore as bef } from '../step.ts';

test('empty', () => {
  const g = [];
  const change = sieve(g, encodeGraph({ foo: 42 }, 0));
  assert.deepStrictEqual(change, []);
  assert.deepStrictEqual(g, []);
});

test('full', () => {
  const g = [{ key: MIN_KEY, end: MAX_KEY, version: 0 }];
  const change = sieve(g, encodeGraph({ foo: 42 }, 0));
  assert.deepStrictEqual(change, encodeGraph({ foo: 42 }, 0));
  assert.deepStrictEqual(g, [
    { key: MIN_KEY, end: bef(e.foo), version: 0 },
    { key: e.foo, value: 42, version: 0 },
    { key: aft(e.foo), end: MAX_KEY, version: 0 },
  ]);
});

test('full-add-branch', () => {
  const g = [{ key: MIN_KEY, end: MAX_KEY, version: 0 }];
  const change = sieve(g, encodeGraph({ foo: { bar: 42 } }, 0));
  assert.deepStrictEqual(change, encodeGraph({ foo: { bar: 42 } }, 0));
  assert.deepStrictEqual(g, [
    { key: MIN_KEY, end: bef(e.foo), version: 0 },
    {
      key: e.foo,
      version: 0,
      children: [
        { key: MIN_KEY, end: bef(e.bar), version: 0 },
        { key: e.bar, value: 42, version: 0 },
        { key: aft(e.bar), end: MAX_KEY, version: 0 },
      ],
    },
    { key: aft(e.foo), end: MAX_KEY, version: 0 },
  ]);
});

test('ignore-unchanged', () => {
  const g = encodeGraph({ foo: { bar: 42 } }, 0);
  const change = sieve(g, encodeGraph({ foo: { bar: 42 } }, 1));
  assert.deepStrictEqual(change, []);
  assert.deepStrictEqual(g, encodeGraph({ foo: { bar: 42 } }, 1));
});

test('empty knowledge', () => {
  const data = [{ key: MIN_KEY, end: MAX_KEY, version: -1 }];
  const change = [
    {
      key: e.foo,
      version: 0,
      children: [{ key: MIN_KEY, end: MAX_KEY, version: 1 }],
    },
  ];
  const sieved = sieve(data, change);
  assert.deepStrictEqual(data, [
    { key: MIN_KEY, end: bef(e.foo), version: -1 },
    {
      key: e.foo,
      version: 0,
      children: [{ key: MIN_KEY, end: MAX_KEY, version: 1 }],
    },
    { key: aft(e.foo), end: MAX_KEY, version: -1 },
  ]);
  assert.deepStrictEqual(sieved, change);
});
