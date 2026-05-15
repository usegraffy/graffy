import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import Graffy from '../Graffy.js';

let g;
beforeEach(() => {
  g = new Graffy();
});

test('porcelain_root_module_root_provider_hit', async () => {
  const provider = mock.fn();
  g.use((graffy) => {
    graffy.onRead(provider);
  });

  await g.read({ baz: 1 });

  assert.ok(provider.mock.callCount() > 0);
});

test('plumbing_root_module_root_provider_hit', async () => {
  const provider = mock.fn();
  g.use((graffy) => {
    graffy.on('read', provider);
  });

  await g.read({ baz: 1 });

  assert.ok(provider.mock.callCount() > 0);
});

test('porcelain_root_module_provider_hit', async () => {
  const provider = mock.fn();
  g.use((graffy) => {
    graffy.onRead('bar', provider);
  });

  await g.read({ bar: { baz: 1 } });

  assert.ok(provider.mock.callCount() > 0);
});

test('plumbing_root_module_provider_hit', async () => {
  const provider = mock.fn();
  g.use((graffy) => {
    graffy.on('read', ['bar'], provider);
  });

  await g.read({ bar: { baz: 1 } });

  assert.ok(provider.mock.callCount() > 0);
});

test('porcelain_module_provider_hit', async () => {
  const provider = mock.fn();
  g.use('foo', (graffy) => {
    graffy.onRead('bar', provider);
  });

  await g.read({ foo: { bar: { baz: 1 } } });

  assert.ok(provider.mock.callCount() > 0);
});

test('plumbing_module_provider_hit', async () => {
  const provider = mock.fn();
  g.use('foo', (graffy) => {
    graffy.on('read', ['bar'], provider);
  });

  await g.read({ foo: { bar: { baz: 1 } } });

  assert.ok(provider.mock.callCount() > 0);
});

test('porcelain_root_module_provider_miss', async () => {
  const provider = mock.fn();
  g.use((graffy) => {
    graffy.onRead('bar', provider);
  });

  await assert.rejects(g.read({ foo: { baz: 1 } }));
  assert.strictEqual(provider.mock.callCount(), 0);
});

test('plumbing_root_module_provider_miss', async () => {
  const provider = mock.fn();
  g.use((graffy) => {
    graffy.on('read', ['bar'], provider);
  });

  await assert.rejects(g.read({ foo: { baz: 1 } }));

  assert.strictEqual(provider.mock.callCount(), 0);
});

test('porcelain_module_provider_miss', async () => {
  const provider = mock.fn();
  g.use('foo', (graffy) => {
    graffy.onRead('bar', provider);
  });

  await assert.rejects(g.read({ goo: { bar: { baz: 1 } } }));

  assert.strictEqual(provider.mock.callCount(), 0);
});

test('plumbing_module_provider_miss', async () => {
  const provider = mock.fn();
  g.use('foo', (graffy) => {
    graffy.on('read', ['bar'], provider);
  });

  await assert.rejects(g.read({ goo: { bar: { baz: 1 } } }));

  assert.strictEqual(provider.mock.callCount(), 0);
});

test('option_update', async () => {
  const provider1 = mock.fn((payload, options, next) => {
    return next(payload, { ...options, opt: 1 });
  });

  const provider2 = mock.fn(() => ({ foo: 3 }));

  g.on('read', provider1);
  g.onRead(provider2);

  g.read({ foo: true });
  assert.deepStrictEqual(provider2.mock.calls[0].arguments[0], { foo: true });
  assert.deepStrictEqual(provider2.mock.calls[0].arguments[1], { opt: 1 });
  assert.ok(typeof provider2.mock.calls[0].arguments[2] === 'function');
});
