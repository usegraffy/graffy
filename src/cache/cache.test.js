import Graffy from '@graffy/core';
import Cache from './index.js';

describe('read', () => {
  let g;
  let provider;

  beforeEach(() => {
    g = new Graffy();
    g.use(Cache());
    provider = jest.fn(() => ({ foo: 42 }));
    g.onRead(provider);
  });

  test('simple', async () => {
    const result1 = await g.read({ foo: 1 });
    expect(result1).toEqual({ foo: 42 });
    expect(provider).toBeCalledTimes(1);
    const result2 = await g.read({ foo: 1 });
    expect(result2).toEqual({ foo: 42 });
    expect(provider).toBeCalledTimes(1);
  });
});
