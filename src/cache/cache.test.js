import Graffy from '@graffy/core';
import Cache from './index.js';
import { graph, query } from '@graffy/common';

describe('get', () => {
  let g;
  let provider;

  beforeEach(() => {
    g = new Graffy();
    g.use(Cache());
    provider = jest.fn(() => graph({ foo: 42 }));
    g.onGet(provider);
  });

  test('simple', async () => {
    const result1 = await g.get(query({ foo: 1 }));
    expect(result1).toEqual(graph({ foo: 42 }));
    expect(provider).toBeCalledTimes(1);
    const result2 = await g.get(query({ foo: 1 }));
    expect(result2).toEqual(graph({ foo: 42 }));
    expect(provider).toBeCalledTimes(1);
  });
});
