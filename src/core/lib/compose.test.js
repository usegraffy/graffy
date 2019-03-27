import compose from './compose';

describe('compose', () => {
  let c;

  beforeEach(() => {
    c = compose();
  });

  test('should compose put handlers', async () => {
    const handler1 = jest.fn((change, options, next) => next(change, options));
    const handler2 = jest.fn();

    c.push(handler1);
    c.push(handler2);

    await c({ foo: 42 }, { source: 'a' });
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
