import Graffy from './Graffy';

describe('compose', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
  });

  test('should compose put handlers', async () => {
    const handler1 = jest.fn((change, options, next) => next(change, options));
    const handler2 = jest.fn();

    g.onPut(handler1);
    g.onPut(handler2);
    await g.put({ foo: 42 }, { source: 'a' });
    expect(handler1).toBeCalledWith(
      { foo: 42 },
      { source: 'a' },
      expect.any(Function),
    );
    expect(handler1).toBeCalledWith(
      { foo: 42 },
      { source: 'a' },
      expect.any(Function),
    );
  });
});
