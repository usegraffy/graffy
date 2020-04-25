import Graffy from '../Graffy';

describe('write', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
  });

  test('should call the write handler with args', async () => {
    const handler = jest.fn((change) => change);
    g.onWrite(handler);
    await g.write({ foo: 42 });
    expect(handler).toBeCalledWith({ foo: 42 }, {});
  });
});
