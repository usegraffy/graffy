import Graffy from './Graffy';

describe('put', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
  });

  test('should call the put handler with args', async () => {
    const handler = jest.fn(change => change);
    g.onPut(handler);
    await g.put({ foo: 42 });
    expect(handler).toBeCalledWith({ foo: 42 }, {});
  });
});
