import { jest } from '@jest/globals';
import Graffy from '../Graffy.js';

describe('write', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
  });

  test('should call the write handler with args', async () => {
    const handler = jest.fn((change) => change);
    g.onWrite(handler);
    await g.write({ foo: 42 });
    expect(handler).toBeCalledWith({ foo: 42 }, {}, expect.any(Function));
  });

  // describe('middleware_coding', () => {
  //   test('no_path', () => {
  //     g.onWrite(async (change, options, next) => {
  //       const written = next(change, options);
  //       return next;
  //     });
  //     g.onWrite()
  //   })
  // })
});
