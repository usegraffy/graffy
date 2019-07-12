import { query } from '@graffy/decorate';
import add from '../add';

test('unchanged', () => {
  const base = query({ foo: 1, bar: { baz: 1 } });
  const changed = add(base, query({ foo: 1, bar: { baz: 1 } }));
  expect(changed).toBe(false);
  expect(base).toEqual(query({ foo: 2, bar: { baz: 2 } }));
});

test('changed', () => {
  const base = query({ foo: 1, bar: { baz: 1 } });
  const changed = add(base, query({ foo: 1, bar: { bad: 1 } }));
  expect(changed).toBe(true);
  expect(base).toEqual(query({ foo: 2, bar: { baz: 1, bad: 1 } }));
});
