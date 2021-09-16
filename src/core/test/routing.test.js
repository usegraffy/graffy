import Graffy from '../Graffy.js';

let g;
beforeEach(() => {
  g = new Graffy();
});

test('porcelain_root_module_root_provider_hit', async () => {
  const provider = jest.fn();
  g.use((graffy) => {
    graffy.onRead(provider);
  });

  await g.read({ baz: 1 });

  expect(provider).toBeCalled();
});

test('plumbing_root_module_root_provider_hit', async () => {
  const provider = jest.fn();
  g.use((graffy) => {
    graffy.on('read', provider);
  });

  await g.read({ baz: 1 });

  expect(provider).toBeCalled();
});

test('porcelain_root_module_provider_hit', async () => {
  const provider = jest.fn();
  g.use((graffy) => {
    graffy.onRead('bar', provider);
  });

  await g.read({ bar: { baz: 1 } });

  expect(provider).toBeCalled();
});

test('plumbing_root_module_provider_hit', async () => {
  const provider = jest.fn();
  g.use((graffy) => {
    graffy.on('read', ['bar'], provider);
  });

  await g.read({ bar: { baz: 1 } });

  expect(provider).toBeCalled();
});

test('porcelain_module_provider_hit', async () => {
  const provider = jest.fn();
  g.use('foo', (graffy) => {
    graffy.onRead('bar', provider);
  });

  await g.read({ foo: { bar: { baz: 1 } } });

  expect(provider).toBeCalled();
});

test('plumbing_module_provider_hit', async () => {
  const provider = jest.fn();
  g.use('foo', (graffy) => {
    graffy.on('read', ['bar'], provider);
  });

  await g.read({ foo: { bar: { baz: 1 } } });

  expect(provider).toBeCalled();
});

test('porcelain_root_module_provider_miss', async () => {
  const provider = jest.fn();
  g.use((graffy) => {
    graffy.onRead('bar', provider);
  });

  await expect(g.read({ foo: { baz: 1 } })).rejects.toThrow();
  expect(provider).not.toBeCalled();
});

test('plumbing_root_module_provider_miss', async () => {
  const provider = jest.fn();
  g.use((graffy) => {
    graffy.on('read', ['bar'], provider);
  });

  await expect(g.read({ foo: { baz: 1 } })).rejects.toThrow();

  expect(provider).not.toBeCalled();
});

test('porcelain_module_provider_miss', async () => {
  const provider = jest.fn();
  g.use('foo', (graffy) => {
    graffy.onRead('bar', provider);
  });

  await expect(g.read({ goo: { bar: { baz: 1 } } })).rejects.toThrow();

  expect(provider).not.toBeCalled();
});

test('plumbing_module_provider_miss', async () => {
  const provider = jest.fn();
  g.use('foo', (graffy) => {
    graffy.on('read', ['bar'], provider);
  });

  await expect(g.read({ goo: { bar: { baz: 1 } } })).rejects.toThrow();

  expect(provider).not.toBeCalled();
});
