import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encodeQuery } from '../../coding/index.ts';
import add from '../add.ts';

test('unchanged', () => {
  const base = [];
  add(base, encodeQuery({ foo: 1, bar: { baz: 1 } }));
  // We need to construct base like this because add freezes returned objects

  const changed = add(base, encodeQuery({ foo: 1, bar: { baz: 1 } }));
  assert.strictEqual(changed, false);
  assert.deepStrictEqual(base, encodeQuery({ foo: 2, bar: { baz: 2 } }));
});

test('changed', () => {
  const base = [];
  add(base, encodeQuery({ foo: 1, bar: { baz: 1 } }));
  const changed = add(base, encodeQuery({ foo: 1, bar: { bad: 1 } }));
  assert.strictEqual(changed, true);
  assert.deepStrictEqual(
    base,
    encodeQuery({ foo: 2, bar: { baz: 1, bad: 1 } }),
  );
});
