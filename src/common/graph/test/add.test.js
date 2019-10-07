import { makeQuery } from '../../build';
import add from '../add';

test('unchanged', () => {
  const base = [];
  add(base, makeQuery({ foo: 1, bar: { baz: 1 } }));
  // We need to construct base like this beccause add freezes returned objects

  const changed = add(base, makeQuery({ foo: 1, bar: { baz: 1 } }));
  expect(changed).toBe(false);
  expect(base).toEqual(makeQuery({ foo: 2, bar: { baz: 2 } }));
});

test('changed', () => {
  const base = [];
  add(base, makeQuery({ foo: 1, bar: { baz: 1 } }));
  const changed = add(base, makeQuery({ foo: 1, bar: { bad: 1 } }));
  expect(changed).toBe(true);
  expect(base).toEqual(makeQuery({ foo: 2, bar: { baz: 1, bad: 1 } }));
});
