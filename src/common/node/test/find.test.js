import assert from 'node:assert/strict';
import { test } from 'node:test';
import { find } from '../../util.js';

test('exact matches', () => {
  assert.strictEqual(
    find([1, 2, 3, 4, 5], (n) => n - 3),
    2,
  );
  assert.strictEqual(
    find([1, 2, 3, 4, 5], (n) => n - 2),
    1,
  );
  assert.strictEqual(
    find([1, 2, 3, 4, 5], (n) => n - 1),
    0,
  );
  assert.strictEqual(
    find([1, 2, 3, 4, 5], (n) => n - 4),
    3,
  );
  assert.strictEqual(
    find([1, 2, 3, 4, 5], (n) => n - 5),
    4,
  );
});

test('insert positions', () => {
  assert.strictEqual(
    find([1, 2, 3, 4, 5], (n) => n - 0),
    0,
  );
  assert.strictEqual(
    find([1, 2, 3, 4, 5], (n) => n - 2.5),
    2,
  );
  assert.strictEqual(
    find([1, 2, 3, 4, 5], (n) => n - 7),
    5,
  );
});
