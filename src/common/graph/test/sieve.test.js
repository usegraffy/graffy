import { sieve } from '..';
import { graph } from '../../build';

test('empty', () => {
  const g = [];
  const change = sieve(g, graph({ foo: 42 }));
  expect(change).toEqual([]);
  expect(g).toEqual([]);
});

test('full', () => {
  const g = [{ key: '', end: '\uffff', clock: 0 }];
  const change = sieve(g, graph({ foo: 42 }));
  expect(change).toEqual(graph({ foo: 42 }));
  expect(g).toEqual([
    { key: '', end: 'fon\uffff', clock: 0 },
    { key: 'foo', value: 42, clock: 0 },
    { key: 'foo\0', end: '\uffff', clock: 0 },
  ]);
});

test('full-add-branch', () => {
  const g = [{ key: '', end: '\uffff', clock: 0 }];
  const change = sieve(g, graph({ foo: { bar: 42 } }));
  expect(change).toEqual(graph({ foo: { bar: 42 } }));
  expect(g).toEqual([
    { key: '', end: 'fon\uffff', clock: 0 },
    { key: 'foo', clock: 0, children: [{ key: 'bar', value: 42, clock: 0 }] },
    { key: 'foo\0', end: '\uffff', clock: 0 },
  ]);
});
