import sieve from '../sieve';
import { makeGraph } from '../../build';

test('empty', () => {
  const g = [];
  const change = sieve(g, makeGraph({ foo: 42 }, 0));
  expect(change).toEqual([]);
  expect(g).toEqual([]);
});

test('full', () => {
  const g = [{ key: '', end: '\uffff', version: 0 }];
  const change = sieve(g, makeGraph({ foo: 42 }, 0));
  expect(change).toEqual(makeGraph({ foo: 42 }, 0));
  expect(g).toEqual([
    { key: '', end: 'fon\uffff', version: 0 },
    { key: 'foo', value: 42, version: 0 },
    { key: 'foo\0', end: '\uffff', version: 0 },
  ]);
});

test('full-add-branch', () => {
  const g = [{ key: '', end: '\uffff', version: 0 }];
  const change = sieve(g, makeGraph({ foo: { bar: 42 } }, 0));
  expect(change).toEqual(makeGraph({ foo: { bar: 42 } }, 0));
  expect(g).toEqual([
    { key: '', end: 'fon\uffff', version: 0 },
    {
      key: 'foo',
      version: 0,
      children: [{ key: 'bar', value: 42, version: 0 }],
    },
    { key: 'foo\0', end: '\uffff', version: 0 },
  ]);
});

test('ignore-unchanged', () => {
  const g = makeGraph({ foo: { bar: 42 } }, 0);
  const change = sieve(g, makeGraph({ foo: { bar: 42 } }, 1));
  expect(change).toEqual([]);
  expect(g).toEqual(makeGraph({ foo: { bar: 42 } }, 1));
});
