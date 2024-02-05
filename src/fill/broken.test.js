import { encodeGraph } from '@graffy/common';
import Graffy from '@graffy/core';
import { mockBackend } from '@graffy/testing';
import fill from './index.js';

describe('nonlive', () => {
  let store;
  let backend;

  beforeEach(() => {
    store = new Graffy();
    store.use(fill());
    backend = mockBackend();
    store.use(backend.middleware);
    backend.write(encodeGraph({ foo: { $ref: 'bar' } }, 0));
  });

  test('read broken link', async () => {
    const promise = store.read({ foo: { x: true } });
    await expect(promise).rejects.toThrow('fill.max_recursion');
  });

  test('watch broken link', async () => {
    const stream = store.watch({ foo: { x: true } });
    expect(stream.next()).rejects.toThrow('fill.max_recursion');
  });
});

describe('live', () => {
  let store;
  let backend;

  beforeEach(() => {
    store = new Graffy();
    store.use(fill());
    backend = mockBackend({ liveQuery: true });
    store.use(backend.middleware);
    backend.write(encodeGraph({ foo: { $ref: 'bar' } }, 0));
  });

  test('watch broken link', async () => {
    const stream = store.watch({ foo: { x: true } });
    expect(stream.next()).rejects.toThrow('fill.max_recursion');
  });
});
